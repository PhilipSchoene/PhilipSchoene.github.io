# philipschoene.github.io

A minimal personal site: Home, Writing, Apps.

```
index.html              Home
writing/index.html      List of entries
writing/posts/*.html    One file per entry
apps/index.html         List of apps
apps/view.html          Shows one app, with ‹ › to move between them
apps/*.html             The apps themselves (self-contained HTML files)
assets/content.js       The list of apps and entries. Edit this when adding something.
assets/style.css        All styling
```

**Add an app:** copy the `.html` file into `apps/`, then add one line to `apps` in
`assets/content.js`.

**Add an entry:** copy `writing/posts/first-entry.html`, edit it, then add one line to
`posts` in `assets/content.js` (newest first).
