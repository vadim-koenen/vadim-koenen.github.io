# Image assets

Two professional headshots are referenced by `index.html`:

| Filename | Where it appears | Purpose |
|---|---|---|
| `vadim-koenen-marketo-consultant-headshot.jpg` | Hero of `index.html`, OpenGraph/Twitter meta, JSON-LD `image` | Navy blazer, white shirt, indoor lobby — "consultant authority" |
| `vadim-koenen-revops-portrait.jpg` | "What this site covers" card, JSON-LD `image` | Blue polo, gray studio backdrop — "approachable / human" |

## Recommended specs

- Format: JPG
- Primary dimensions: 1200×1500 (4:5 portrait). Keep aspect ratio consistent.
- File size: under 200 KB compressed (use https://squoosh.app)
- Strip EXIF GPS / location. Keep title, author, copyright set to "Vadim Koenen".

## Filename hygiene

Filenames matter for SEO. Always lead with `vadim-koenen-`, then role/context, then `headshot`/`portrait`. Never `IMG_*` or auto-generated names.

## Drop new images here

Both files should sit directly in this directory, not in subfolders. After adding or replacing images, push the repo and request re-indexing of the home page via Google Search Console (URL Inspection → Request Indexing).
