# philipschoene.github.io

A minimal personal site: Home, Writing, Apps.

```
index.html              Home
writing/index.html      List of entries
writing/posts/*.html    One file per entry
apps/index.html         List of apps
apps/view.html          Shows one app, with ‹ › to move between them
apps/use-cases/*.html   Ready-to-use apps (self-contained HTML files)
apps/study/<module>/    Study apps, one folder per learning module
assets/content.js       The list of apps and entries. Edit this when adding something.
assets/style.css        All styling
assets/katex/           Math rendering for the study apps (KaTeX, MIT licence)
```

**Add an app:** copy the `.html` file into `apps/use-cases/` or
`apps/study/<module>/`, then add one line to `apps` in `assets/content.js`
(with `section`, and `module` for study apps).

**Add an entry:** copy `writing/posts/first-entry.html`, edit it, then add one line to
`posts` in `assets/content.js` (newest first).
