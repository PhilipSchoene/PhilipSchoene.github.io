// The one list to edit when adding an app or an entry.
//
// Apps:    put the .html file in /apps/ and add a line below.
//          "file" is the file name inside /apps/.
// Writing: put the .html file in /writing/posts/ and add a line below.
//          Newest first.

window.SITE = {
  apps: [
    { slug: "microscopy",   title: "Microscopy",   note: "Calculations for the bench", file: "microscopy.html" },
    { slug: "tree-of-life", title: "Tree of Life", note: "Multicellular life through time", file: "tree-of-life.html" }
  ],

  posts: [
    { title: "Second entry", date: "2026-11-15", file: "second-entry.html" },
    { title: "First entry",  date: "2026-11-14", file: "first-entry.html" }
  ]
};
