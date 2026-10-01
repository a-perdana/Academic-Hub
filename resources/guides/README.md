# Academic Hub module guides

Each `<module>.json` here is a **visual summary of the live Academic Services Google Docs** for that module, rendered by `/guide-renderer.js` + `/guide.css` on the page `/<module>-guide` (source file `<Module>Guide.html`, body `data-module="<module>"`).

## Rules

1. **The live document is right.** A guide sits at Quick Reference level of the Policy Source-of-Truth Register: it never creates or removes a rule. If a guide and a document differ, fix the guide.
2. **Every block names its source**: `"source": [{ "doc": "<key in docs>", "at": "<section>" }]`.
3. **Every number is re-read from a fresh export** of the live folder (`node scripts/gdocs/export-folder-text.js <outDir> <folderId>`), and a Quick Reference number is cross-checked against its Handbook.
4. **Every block lists the facts it relies on** in `"check": ["exact phrase", …]` — copied from the live text (dashes and quotes are normalised by the checker).
5. **Diagrams are data**, never pasted images. Colours come from the module family; never put a colour in the JSON.
6. **Plain English (B1–B2), warm and direct**: "your school", "you". Short sentences.

## Keeping a guide true

```
npm run check:guides                                   # all guides: fingerprints + check phrases
node scripts/guides/check-guide-sources.js --guide=<module> --selftest
node scripts/guides/check-guide-sources.js --guide=<module> --accept   # after re-reading the changes
```

## Block types

`oneminute` (lead + ticked points) · `stats` (number tiles) · `compare` (side-by-side cards) · `cycle` (phase timeline; `mode: online|onsite`, `key: true` for the main stops) · `weights` (donut, one or more `sets` shown as tabs) · `flow` (numbered steps with a `who` chip) · `bands` (a rating scale, lightest → darkest; an item may set `tone: green|amber|red|darkred` when it is a status such as RAG — status colours never take the module family) · `roles` (table) · `callout` (`tone: "soft"` for the light version) · `dodont` (`tone: "warn"` when both columns are warnings) · `faq` · `links` (`href` for AH pages, `doc` for live documents) · `row` (2–3 blocks side by side).

Inline markup in any text: `**bold**`, `[text](url)`.
