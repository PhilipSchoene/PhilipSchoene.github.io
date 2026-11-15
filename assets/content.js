// The one list to edit when adding an app or an entry.
//
// Apps:    put the .html file in its folder inside /apps/ and add a line below.
//          "file"    path inside /apps/
//          "section" "Use cases" or "Study"
//          "module"  only for Study: the learning module it belongs to
//          Apps show up grouped, in the order listed here.
// Writing: put the .html file in /writing/posts/ and add a line below.
//          Newest first.

window.SITE = {
  apps: [
    { slug: "tree-of-life", title: "Tree of Life", note: "Multicellular life through time", file: "use-cases/tree-of-life.html", section: "Use cases" },
    { slug: "microscopy",   title: "Microscopy",   note: "Calculations for the bench",     file: "use-cases/microscopy.html",   section: "Use cases" },

    { slug: "variational",  title: "Variational?", note: "Active matter, case by case",    file: "study/active-matter/variational.html", section: "Study", module: "Active Matter" },
    { slug: "romeo-juliet", title: "Romeo & Juliet", note: "Wherefore art thou, potential?", file: "study/active-matter/romeo-juliet.html", section: "Study", module: "Active Matter" }
  ],

  posts: [
    { title: "Second entry", date: "2026-11-15", file: "second-entry.html" },
    { title: "First entry",  date: "2026-11-14", file: "first-entry.html" }
  ]
};
