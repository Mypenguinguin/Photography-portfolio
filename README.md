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

## How the site is organised

- **Home**: the hero, one ticket per trip, a map of every stop, the latest stories and About.
- **Trip pages** (`#/trip/...`): the route on a map, then one chapter per destination.
- **Archive** (`#/archive`): every photo, filterable by trip and destination.
- **Photo details**: the ⓘ button (or the `i` key) in the photo viewer shows where, when and
  the camera settings.

In `site.js`: `trips[].color` is each trip's accent colour, and `places` holds the map
position of each destination (leave one out and it simply gets no pin).
Camera settings come from the original files. New photos get them automatically through
`add_photos.py`; to fill in older ones, run `python tools/add_exif.py`.

## Chat assistant

`chat.js` adds the "Ask" button. It answers from the site's content (trips, destinations,
photos, gear, contact) with no setup. To get AI answers from Claude, follow
`chat-worker/README.md`, then put the Worker address in `site.js` → `chat.endpoint`.
The suggested questions, greeting, gear and photo-usage text are in `site.js` too.

## Preview locally

```
python -m http.server 8765
```

Then open http://localhost:8765.
