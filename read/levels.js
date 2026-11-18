// CHEM225 · which chapters have their passages written at other levels and densities. Made by tools/check-levels.js --write.
// The versions themselves are in read/levels/<chapter>.js and are loaded when that chapter is opened (shared/readlevels.js).
//   level    1 First look · 2 Big picture · 3 Plain terms · 4 Building up · 5 Exam level · 6 Deep dive
//   density  1 Brief · 2 Standard · 3 Detailed          key "level.density"
// star is the setting the passage in chapters.js is written at (the one that matches the exam); it is not repeated.
// questions and plays list the chapters whose questions (<chapter>.q.js) and activities (<chapter>.p.js) are also written at each level.
window.READ_LEVELS = { star: [5, 2], chapters: ["rings-1","nmr","rings-2","acids","organometallics","sn2-1","sn2-2","sn1-e1","e2","choose","beyond"], questions: ["rings-1","nmr","rings-2","acids","organometallics","sn2-1","sn2-2","sn1-e1","e2","choose","beyond"], plays: ["rings-1","nmr","rings-2","acids","organometallics","sn2-1","sn2-2","sn1-e1","e2","choose","beyond"], text: {}, qs: {}, play: {} };
