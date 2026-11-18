#!/usr/bin/env python3
"""chem.py: the chemistry half of the build. Needs RDKit (pip install rdkit).

It does three jobs, all driven by tools/build.js (which calls it with JSON on stdin):

  1. DRAW      turn SMILES into compact drawing data (bond paths, labels, atom positions) that assets/mol.js
               paints as SVG in the browser. Bond lengths are the same in every drawing.
  2. MECHANISM check a curved-arrow mechanism by actually moving the electrons: the arrows of each step are applied
               to that step's structures, and the result must be the next step's structures. Valences are checked.
  3. FACTS     molecular formula, stereocentres, canonical SMILES: used by the content checks.

Run by hand:
    python3 tools/chem.py smiles 'C[C@H](Cl)CC'          facts about one structure
    python3 tools/chem.py mech content/mechanisms/x.json  check the mechanisms in a file, print problems
    echo '{"mols": ["CCO"], "steps": []}' | python3 tools/chem.py compile     what build.js does

ARROWS. An arrow moves one electron pair.
    from: {"lp": n}          a lone pair (or the negative charge) on the atom with map number n
          {"bond": [a, b]}   the bond between atoms a and b (one pair of it, if it is a double or triple bond)
    to:   {"bond": [a, b]}   the pair becomes (part of) the bond between a and b: a new bond, or one more bond
          {"atom": n}        the pair becomes a lone pair on atom n (n must be one end of the bond it came from)
Formal charges follow from who shares the pair before and after. Hydrogens that move must be written as atoms
with their own map number, e.g. [H:7].
"""
import json
import re
import sys

from rdkit import Chem, RDLogger
from rdkit.Chem import AllChem, rdAbbreviations, rdMolDescriptors
from rdkit.Chem.Draw import rdMolDraw2D
from rdkit.Geometry import Point3D

RDLogger.DisableLog("rdApp.*")

BOND_PX = 30          # every bond is drawn this long, in drawing units
VALENCE_E = {"H": 1, "Li": 1, "Na": 1, "K": 1, "Mg": 2, "B": 3, "C": 4, "N": 5, "P": 5, "O": 6, "S": 6,
             "F": 7, "Cl": 7, "Br": 7, "I": 7, "Si": 4, "Al": 3, "Zn": 2, "Cu": 1}
# allowed total bond counts (sum of bond orders, hydrogens included) for (element, formal charge)
ALLOWED = {
    ("H", 0): {1}, ("H", 1): {0}, ("H", -1): {0},
    ("C", 0): {4}, ("C", 1): {3}, ("C", -1): {3},
    ("N", 0): {3}, ("N", 1): {4}, ("N", -1): {2},
    ("O", 0): {2}, ("O", 1): {3}, ("O", -1): {1},
    ("S", 0): {2, 4, 6}, ("S", 1): {3, 5}, ("S", -1): {1},
    ("P", 0): {3, 5}, ("P", 1): {4},
    ("F", 0): {1}, ("F", -1): {0},
    ("Cl", 0): {1}, ("Cl", -1): {0}, ("Cl", 1): {2},
    ("Br", 0): {1}, ("Br", -1): {0}, ("Br", 1): {2},
    ("I", 0): {1}, ("I", -1): {0}, ("I", 1): {2},
    ("B", 0): {3}, ("B", -1): {4},
    ("Li", 0): {1}, ("Li", 1): {0}, ("Na", 0): {1}, ("Na", 1): {0}, ("K", 0): {1}, ("K", 1): {0},
    ("Mg", 0): {2}, ("Mg", 1): {1}, ("Mg", 2): {0},
}
ABBREVS = rdAbbreviations.ParseAbbreviations(
    "OTs *OS(=O)(=O)c1ccc(C)cc1\nOMs *OS(C)(=O)=O\nTs *S(=O)(=O)c1ccc(C)cc1")


class ChemError(Exception):
    pass


# ---------------------------------------------------------------- parsing
def parse(smiles, keep_h=True):
    """SMILES -> molecule. Hydrogens written as atoms ([H], [2H], [H:3]) stay atoms."""
    p = Chem.SmilesParserParams()
    p.removeHs = not keep_h
    m = Chem.MolFromSmiles(smiles, p)
    if m is None:
        raise ChemError(f"cannot read SMILES: {smiles}")
    return m


def lone_pairs(atom):
    e = VALENCE_E.get(atom.GetSymbol())
    if e is None:
        return 0
    nb = e - atom.GetTotalValence() - atom.GetFormalCharge()
    return max(0, nb // 2)


def strip(m):
    """A copy with map numbers removed and plain hydrogens folded back in (deuterium stays)."""
    c = Chem.Mol(m)
    for a in c.GetAtoms():
        a.SetAtomMapNum(0)
    ps = Chem.RemoveHsParameters()
    ps.removeMapped = True
    ps.removeIsotopes = False
    try:
        c = Chem.RemoveHs(c, ps)
    except Exception:
        pass
    return c


def canon(m):
    return Chem.MolToSmiles(strip(m))


def canon_frags(m):
    return sorted(Chem.MolToSmiles(f) for f in Chem.GetMolFrags(strip(m), asMols=True))


def flat_frags(m):
    """Fragments by connectivity and charge only. Curved arrows say which bonds form and break, not which face is
    attacked, so a mechanism is compared without wedges and dashes (inversion in SN2 is the author's to draw)."""
    c = strip(m)
    Chem.RemoveStereochemistry(c)
    return sorted(Chem.MolToSmiles(f) for f in Chem.GetMolFrags(c, asMols=True))


def facts(smiles):
    m = parse(smiles)
    s = strip(m)
    return {
        "canonical": Chem.MolToSmiles(s),
        "formula": rdMolDescriptors.CalcMolFormula(s),
        "charge": sum(a.GetFormalCharge() for a in s.GetAtoms()),
        "stereocentres": [[i, lab] for i, lab in Chem.FindMolChiralCenters(
            s, includeUnassigned=True, useLegacyImplementation=False)],
        "fragments": canon_frags(m),
        "rings": [len(r) for r in s.GetRingInfo().AtomRings()],
    }


# ---------------------------------------------------------------- drawing
def _layout(m):
    """2D coordinates. Several molecules in one SMILES are set out left to right in the order written."""
    AllChem.Compute2DCoords(m)
    frags = sorted(Chem.GetMolFrags(m), key=min)
    if len(frags) < 2:
        return
    conf = m.GetConformer()
    x = 0.0
    for f in frags:
        xs = [conf.GetAtomPosition(i).x for i in f]
        ys = [conf.GetAtomPosition(i).y for i in f]
        cy = (min(ys) + max(ys)) / 2
        for i in f:
            p = conf.GetAtomPosition(i)
            conf.SetAtomPosition(i, Point3D(p.x - min(xs) + x, p.y - cy, 0))
        x += (max(xs) - min(xs)) + 2.1      # the gap leaves room for labels and charges


def _face(m, maps, arrows):
    """Turn (and if need be mirror) each molecule of a mechanism step so that atoms joined by an arrow face each
    other and the arrows stay short. Wedges are worked out from the coordinates afterwards, so this is safe."""
    import math
    frags = sorted(Chem.GetMolFrags(m), key=min)
    if len(frags) < 2 or not arrows:
        return
    by = {n: i for i, n in maps.items() if n}
    frag_of = {i: k for k, f in enumerate(frags) for i in f}
    pairs = set()
    for ar in arrows:
        ends = []
        for side in ("from", "to"):
            e = ar.get(side) or {}
            ids = [e["lp"]] if "lp" in e else list(e.get("bond", [])) if "bond" in e else [e["atom"]] if "atom" in e else []
            ends += [by[n] for n in ids if n in by]
        for a in ends:
            for b in ends:
                if a < b and frag_of.get(a) != frag_of.get(b):
                    pairs.add((a, b))
    if not pairs:
        return
    conf = m.GetConformer()

    def get():
        return {i: (conf.GetAtomPosition(i).x, conf.GetAtomPosition(i).y) for f in frags for i in f}

    def put(pos):
        for i, (x, y) in pos.items():
            conf.SetAtomPosition(i, Point3D(x, y, 0))

    def placed(pos):
        out, x = {}, 0.0
        for f in frags:
            xs = [pos[i][0] for i in f]
            ys = [pos[i][1] for i in f]
            cy = (min(ys) + max(ys)) / 2
            for i in f:
                out[i] = (pos[i][0] - min(xs) + x, pos[i][1] - cy)
            x += (max(xs) - min(xs)) + 2.1
        return out

    def turned(pos, f, deg, mirror):
        c, s_ = math.cos(math.radians(deg)), math.sin(math.radians(deg))
        cx = sum(pos[i][0] for i in f) / len(f)
        cy = sum(pos[i][1] for i in f) / len(f)
        out = dict(pos)
        for i in f:
            dx, dy = pos[i][0] - cx, pos[i][1] - cy
            if mirror:
                dx = -dx
            out[i] = (cx + dx * c - dy * s_, cy + dx * s_ + dy * c)
        return out

    def cost(pos):
        return sum(math.dist(pos[a], pos[b]) for a, b in pairs)

    pos = placed(get())
    for _ in range(2):
        for f in frags:
            if len(f) < 2:
                continue
            best, keep = cost(pos), pos
            for mirror in (False, True):
                for deg in range(0, 360, 30):
                    if not mirror and deg == 0:
                        continue
                    trial = placed(turned(pos, f, deg, mirror))
                    c = cost(trial) * (1.0 if deg in (0, 180) else 1.06)      # prefer the usual horizontal zigzag
                    if c < best - 0.05:
                        best, keep = c, trial
            pos = keep
    put(pos)


_PATH = re.compile(r"<path(?: class='bond-(\d+)[^']*')? d='([^']+)' style='([^']*)'")
_TEXT = re.compile(r"<text x='([-\d.]+)' y='([-\d.]+)' class='atom-(\d+)' style='font-size:(\d+)px[^>]*>([^<]*)</text>")
_BOX = re.compile(r"viewBox='0 0 ([\d.]+) ([\d.]+)'")


def draw(smiles, abbr=False, methyl=False, arrows=None):
    """SMILES -> {w, h, p: paths, t: labels, a: atoms, b: bonds} for assets/mol.js.
    p: [bond index or -1, path data, kind]   kind 0 line, 1 hash line of a dashed wedge, 2 solid wedge
    t: [atom index, x, y, font size, text]   one entry per printed character group
    a: [x, y, element, formal charge, lone pairs, hydrogens, map number]
    b: [atom index, atom index, order]
    """
    m = parse(smiles)
    maps = {a.GetIdx(): a.GetAtomMapNum() for a in m.GetAtoms()}
    info = {a.GetIdx(): (a.GetSymbol() if not (a.GetSymbol() == "H" and a.GetIsotope() == 2) else "D",
                         a.GetFormalCharge(), lone_pairs(a), a.GetTotalNumHs()) for a in m.GetAtoms()}
    for a in m.GetAtoms():
        a.SetIntProp("o", a.GetIdx())
        a.SetAtomMapNum(0)
    if abbr:
        m = rdAbbreviations.CondenseMolAbbreviations(m, ABBREVS, maxCoverage=1.0)
    try:
        Chem.Kekulize(m, clearAromaticFlags=False)
    except Exception:
        pass
    _layout(m)
    if arrows and not abbr:
        _face(m, maps, arrows)
    d = rdMolDraw2D.MolDraw2DSVG(-1, -1, -1, -1, True)      # True: labels as text, not outlines
    o = d.drawOptions()
    o.fixedBondLength = BOND_PX
    o.useBWAtomPalette()
    o.clearBackground = False
    o.bondLineWidth = 1.6
    o.padding = 0.12
    o.addStereoAnnotation = False
    o.atomLabelDeuteriumTritium = True
    o.explicitMethyl = bool(methyl)
    m2 = rdMolDraw2D.PrepareMolForDrawing(m, kekulize=True, addChiralHs=False)
    d.DrawMolecule(m2)
    d.FinishDrawing()
    svg = d.GetDrawingText()
    box = _BOX.search(svg)
    w, h = float(box.group(1)), float(box.group(2))
    paths = []
    for bi, dd, style in _PATH.findall(svg):
        kind = 2 if "fill:#" in style else (1 if "stroke-width:0.8px" in style else 0)
        paths.append([int(bi) if bi != "" else -1, re.sub(r"\s+", " ", dd.strip()), kind])
    texts = [[int(ai), float(x), float(y), int(fs), tx] for x, y, ai, fs, tx in _TEXT.findall(svg)]
    atoms = []
    for a in m2.GetAtoms():
        p = d.GetDrawCoords(a.GetIdx())
        oi = a.GetIntProp("o") if a.HasProp("o") else -1
        el, q, lp, nh = info.get(oi, (a.GetSymbol(), a.GetFormalCharge(), 0, 0))
        if a.GetSymbol() == "*" and a.HasProp("atomLabel"):
            el = a.GetProp("atomLabel")
        atoms.append([round(p.x, 1), round(p.y, 1), el, q, lp, nh, maps.get(oi, 0)])
    bonds = [[b.GetBeginAtomIdx(), b.GetEndAtomIdx(), int(round(b.GetBondTypeAsDouble())) or 1] for b in m2.GetBonds()]
    return {"w": round(w, 1), "h": round(h, 1), "p": paths, "t": texts, "a": atoms, "b": bonds}


# ---------------------------------------------------------------- 3D
def conf3d(smiles, seed=7):
    """SMILES -> {a: [[element, x, y, z]], b: [[i, j, order]]} with hydrogens, MMFF-relaxed."""
    m = Chem.AddHs(parse(smiles, keep_h=False))
    if AllChem.EmbedMolecule(m, randomSeed=seed) != 0:
        raise ChemError(f"cannot build a 3D model of {smiles}")
    try:
        AllChem.MMFFOptimizeMolecule(m, maxIters=2000)
    except Exception:
        pass
    c = m.GetConformer()
    cx = sum(c.GetAtomPosition(i).x for i in range(m.GetNumAtoms())) / m.GetNumAtoms()
    cy = sum(c.GetAtomPosition(i).y for i in range(m.GetNumAtoms())) / m.GetNumAtoms()
    cz = sum(c.GetAtomPosition(i).z for i in range(m.GetNumAtoms())) / m.GetNumAtoms()
    atoms = [[a.GetSymbol(), round(c.GetAtomPosition(a.GetIdx()).x - cx, 3), round(c.GetAtomPosition(a.GetIdx()).y - cy, 3),
              round(c.GetAtomPosition(a.GetIdx()).z - cz, 3)] for a in m.GetAtoms()]
    bonds = [[b.GetBeginAtomIdx(), b.GetEndAtomIdx(), int(round(b.GetBondTypeAsDouble())) or 1] for b in m.GetBonds()]
    return {"a": atoms, "b": bonds}


# ---------------------------------------------------------------- mechanisms
def _by_map(m):
    out = {}
    for a in m.GetAtoms():
        n = a.GetAtomMapNum()
        if n:
            if n in out:
                raise ChemError(f"map number {n} is used on two atoms")
            out[n] = a.GetIdx()
    return out


def _end(spec, key, by):
    """Resolve one end of an arrow to atom indices. Returns ("lp", i) / ("bond", i, j) / ("atom", i)."""
    if key == "from" and "lp" in spec:
        n = spec["lp"]
        if n not in by:
            raise ChemError(f"no atom carries map number {n}")
        return ("lp", by[n])
    if "bond" in spec:
        a, b = spec["bond"]
        for n in (a, b):
            if n not in by:
                raise ChemError(f"no atom carries map number {n}")
        if a == b:
            raise ChemError("a bond needs two different atoms")
        return ("bond", by[a], by[b])
    if key == "to" and "atom" in spec:
        n = spec["atom"]
        if n not in by:
            raise ChemError(f"no atom carries map number {n}")
        return ("atom", by[n])
    raise ChemError(f"cannot read the '{key}' of arrow {json.dumps(spec)}")


def apply_arrows(smiles, arrows):
    """Move the electrons. Returns (molecule after the arrows, list of problems)."""
    m = Chem.RWMol(parse(smiles))
    problems = []
    try:
        Chem.Kekulize(m, clearAromaticFlags=True)
    except Exception:
        pass
    by = _by_map(m)
    name = {i: f"{m.GetAtomWithIdx(i).GetSymbol()}:{n}" for n, i in by.items()}
    lp = {a.GetIdx(): lone_pairs(a) for a in m.GetAtoms()}
    for a in m.GetAtoms():                      # hydrogens are fixed: they may only move if drawn as atoms
        a.SetNumExplicitHs(a.GetTotalNumHs())
        a.SetNoImplicit(True)
    dq = {}

    def share(i, d):
        dq[i] = dq.get(i, 0) + d

    for k, ar in enumerate(arrows, 1):
        try:
            src = _end(ar.get("from", {}), "from", by)
            dst = _end(ar.get("to", {}), "to", by)
        except ChemError as e:
            problems.append(f"arrow {k}: {e}")
            continue
        # ---- take the pair from its source
        if src[0] == "lp":
            i = src[1]
            if lp.get(i, 0) < 1:
                problems.append(f"arrow {k}: {name[i]} has no lone pair to give")
                continue
            lp[i] -= 1
            holders = {i: 2}
        else:
            i, j = src[1], src[2]
            b = m.GetBondBetweenAtoms(i, j)
            if b is None:
                problems.append(f"arrow {k}: there is no bond between {name[i]} and {name[j]}")
                continue
            order = int(round(b.GetBondTypeAsDouble()))
            if order <= 1:
                m.RemoveBond(i, j)
            else:
                b.SetBondType({2: Chem.BondType.SINGLE, 3: Chem.BondType.DOUBLE}[order])
            holders = {i: 1, j: 1}
        # ---- put it where the arrow points
        if dst[0] == "atom":
            t = dst[1]
            if t not in holders:
                problems.append(f"arrow {k}: the pair cannot land on {name[t]}, which is not where it started")
                continue
            lp[t] = lp.get(t, 0) + 1
            after = {t: 2}
        else:
            p, q = dst[1], dst[2]
            if p not in holders and q not in holders:
                problems.append(f"arrow {k}: the new bond {name[p]}-{name[q]} must include an atom the pair started on")
                continue
            b = m.GetBondBetweenAtoms(p, q)
            if b is None:
                m.AddBond(p, q, Chem.BondType.SINGLE)
            else:
                order = int(round(b.GetBondTypeAsDouble()))
                if order >= 3:
                    problems.append(f"arrow {k}: {name[p]}-{name[q]} is already a triple bond")
                    continue
                b.SetBondType({1: Chem.BondType.DOUBLE, 2: Chem.BondType.TRIPLE}[order])
            after = {p: 1, q: 1}
        for a_, n in holders.items():
            share(a_, n)
        for a_, n in after.items():
            share(a_, -n)
    for i, d in dq.items():
        a = m.GetAtomWithIdx(i)
        a.SetFormalCharge(a.GetFormalCharge() + d)
    # ---- every atom must end with a sensible number of bonds for its charge
    for a in m.GetAtoms():
        tot = int(round(sum(b.GetBondTypeAsDouble() for b in a.GetBonds()))) + a.GetNumExplicitHs()
        ok = ALLOWED.get((a.GetSymbol(), a.GetFormalCharge()))
        if ok is not None and tot not in ok:
            label = name.get(a.GetIdx(), a.GetSymbol())
            problems.append(f"after the arrows {label} has {tot} bond(s) and charge {a.GetFormalCharge():+d}, which is not allowed")
    try:
        out = m.GetMol()
        Chem.SanitizeMol(out, Chem.SanitizeFlags.SANITIZE_ALL ^ Chem.SanitizeFlags.SANITIZE_PROPERTIES)
    except Exception as e:
        problems.append(f"the structure after the arrows is not valid: {e}")
        out = m.GetMol()
    return out, problems


def _frags_after(m):
    c = Chem.Mol(m)
    for a in c.GetAtoms():
        a.SetNoImplicit(False)
    return flat_frags(c)


def check_mechanism(mech):
    """Check one mechanism. Returns a list of problems (empty when it is sound)."""
    problems = []
    steps = mech.get("steps") or []
    if not steps:
        return ["it has no steps"]
    nxt = [s.get("species") for s in steps[1:]] + [mech.get("product")]
    for k, (s, after) in enumerate(zip(steps, nxt), 1):
        tag = f"step {k}"
        if not s.get("species"):
            problems.append(f"{tag}: no species")
            continue
        if not s.get("arrows"):
            problems.append(f"{tag}: no arrows (every step moves at least one electron pair)")
            continue
        try:
            got, probs = apply_arrows(s["species"], s["arrows"])
        except ChemError as e:
            problems.append(f"{tag}: {e}")
            continue
        problems += [f"{tag}: {p}" for p in probs]
        if probs:
            continue                    # the arrows themselves are wrong: no point comparing structures
        if after is None:
            problems.append(f"{tag}: nothing to compare with (the mechanism needs a 'product')")
            continue
        try:
            want = flat_frags(parse(after))
        except ChemError as e:
            problems.append(f"{tag}: next structures: {e}")
            continue
        try:
            have = _frags_after(got)
        except Exception as e:
            problems.append(f"{tag}: the structure after the arrows is not valid ({e})")
            continue
        added =[flat_frags(parse(x))[0] for x in (steps[k].get("adds") if k < len(steps) else mech.get("adds")) or []]
        pool = have + added
        missing = []
        for f in want:
            if f in pool:
                pool.remove(f)
            else:
                missing.append(f)
        if missing:
            problems.append(f"{tag}: the arrows give {' + '.join(have)} but the next structures are {' + '.join(want)} "
                            f"(not produced: {', '.join(missing)})")
    return problems


# ---------------------------------------------------------------- command line
def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "smiles":
        for s in sys.argv[2:]:
            try:
                print(json.dumps({"smiles": s, **facts(s)}))
            except ChemError as e:
                print(json.dumps({"smiles": s, "error": str(e)}))
    elif cmd == "mech":
        bad = 0
        for f in sys.argv[2:]:
            data = json.load(open(f))
            for mech in (data if isinstance(data, list) else data.get("mechanisms", [data])):
                probs = check_mechanism(mech)
                print(("OK   " if not probs else "FAIL ") + mech.get("id", "?"))
                for p in probs:
                    print("     " + p)
                bad += bool(probs)
        sys.exit(1 if bad else 0)
    elif cmd == "compile":
        job = json.load(sys.stdin)
        out = {"mols": {}, "facts": {}, "mech": {}, "conf": {}, "errors": []}
        for key in job.get("mols", []):
            smi, _, opt = key.partition("|")
            try:
                out["mols"][key] = draw(smi, abbr="abbr" in opt.split(","), methyl="me" in opt.split(","))
            except Exception as e:
                out["errors"].append(f"structure {key}: {e}")
        for st in job.get("steps", []):          # mechanism steps: drawn with the molecules turned to face each other
            try:
                out["mols"][st["key"]] = draw(st["key"], arrows=st.get("arrows"))
            except Exception as e:
                out["errors"].append(f"structure {st.get('key')}: {e}")
        for s in job.get("facts", []):
            try:
                out["facts"][s] = facts(s)
            except Exception as e:
                out["errors"].append(f"structure {s}: {e}")
        for mech in job.get("mechanisms", []):
            try:
                out["mech"][mech.get("id", "?")] = check_mechanism(mech)
            except Exception as e:
                out["mech"][mech.get("id", "?")] = [f"could not be checked: {e}"]
        for s in job.get("conf", []):
            try:
                out["conf"][s] = conf3d(s)
            except Exception as e:
                out["errors"].append(f"3D model {s}: {e}")
        json.dump(out, sys.stdout, separators=(",", ":"))
    else:
        print(__doc__)
        sys.exit(2)


if __name__ == "__main__":
    main()
