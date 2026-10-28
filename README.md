# Travel photography portfolio

A static site with no build step. Open `index.html` in a browser, or upload the whole
`website` folder to any static host (GitHub Pages, Netlify, Cloudflare Pages).

## Files

- `site.js` holds your name, email, hero slides, destinations and journal posts.
- `photos.js` lists every photo with its title, caption and collection. Edit titles and captions here.
- `images/full`, `images/thumb` hold the web-sized copies (camera metadata stripped).
- `tools/add_photos.py` adds new photos.

## Adding photos

Run from this folder (needs `pip install pillow`):

```
python tools/add_photos.py ../Edited/DSCF6000.JPG --collection hangzhou --title "The Moon Gate"
python tools/add_photos.py "D:/Trips/Tokyo" --collection tokyo
```

For a new trip, first add a collection to `collections` in `site.js`
(`id`, `title`, `native`, `dates`, `cover`, `blurb`). Then add photos with that `id`.

## Preview locally

```
python -m http.server 8765
```

Then open http://localhost:8765.
