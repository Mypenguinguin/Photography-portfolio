"""Add photos to the portfolio.

Usage (from the website folder):
    python tools/add_photos.py <photo or folder> [...] --collection suzhou
    python tools/add_photos.py ../Edited/DSCF5939.JPG --collection suzhou --title "Shantang after dark"

For every photo this writes a large copy (images/full) and a grid copy
(images/thumb), strips camera metadata (including any GPS), and adds an
entry to photos.js. Titles, captions and the order of photos can then be
edited by hand in photos.js. Collections live in site.js.
"""
import argparse, base64, io, json, os, sys
from datetime import datetime
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, 'photos.js')
PREFIX = 'window.PHOTOS = '
FULL, THUMB = 2400, 900


def load():
    if not os.path.exists(MANIFEST):
        return []
    text = open(MANIFEST, encoding='utf-8').read().strip()
    return json.loads(text[len(PREFIX):].rstrip(';'))


def save(photos):
    body = ',\n'.join('  ' + json.dumps(p, ensure_ascii=False) for p in photos)
    with open(MANIFEST, 'w', encoding='utf-8') as f:
        f.write(PREFIX + '[\n' + body + '\n];\n')


def taken(im):
    exif = im.getexif()
    raw = exif.get_ifd(0x8769).get(36867) or exif.get(306)
    try:
        return datetime.strptime(raw, '%Y:%m:%d %H:%M:%S').isoformat()
    except (TypeError, ValueError):
        return None


def add(path, collection, title=None, caption='', prefix=''):
    pid = prefix + os.path.splitext(os.path.basename(path))[0].lower()
    im = Image.open(path)
    date = taken(im)
    im = ImageOps.exif_transpose(im).convert('RGB')
    w, h = im.size
    for folder, size, q in (('full', FULL, 84), ('thumb', THUMB, 80)):
        os.makedirs(os.path.join(ROOT, 'images', folder), exist_ok=True)
        copy = im.copy()
        copy.thumbnail((size, size), Image.LANCZOS)
        copy.save(os.path.join(ROOT, 'images', folder, pid + '.jpg'),
                  quality=q, optimize=True, progressive=True)
    tiny = im.copy()
    tiny.thumbnail((24, 24))
    buf = io.BytesIO()
    tiny.save(buf, 'JPEG', quality=60)
    r, g, b = im.resize((1, 1), Image.BOX).getpixel((0, 0))
    return {
        'id': pid,
        'collection': collection,
        'title': title or pid.upper(),
        'caption': caption,
        'date': date,
        'w': w, 'h': h,
        'color': '#%02x%02x%02x' % (r, g, b),
        'blur': 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode(),
    }


def expand(paths):
    for p in paths:
        if os.path.isdir(p):
            for n in sorted(os.listdir(p)):
                if n.lower().endswith(('.jpg', '.jpeg', '.png')):
                    yield os.path.join(p, n)
        else:
            yield p


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('paths', nargs='+')
    ap.add_argument('--collection', required=True, help='collection id from site.js, e.g. suzhou')
    ap.add_argument('--title', help='title (only when adding a single photo)')
    ap.add_argument('--caption', default='')
    ap.add_argument('--prefix', default='', help='prefix for photo ids, e.g. jp25- (cameras reuse file names)')
    a = ap.parse_args()
    photos = load()
    known = {p['id']: p['collection'] for p in photos}
    for path in expand(a.paths):
        pid = a.prefix + os.path.splitext(os.path.basename(path))[0].lower()
        if known.get(pid, a.collection) != a.collection:
            sys.exit(f'{pid} already belongs to "{known[pid]}"; use --prefix to keep both')
        entry = add(path, a.collection, a.title, a.caption, a.prefix)
        if entry['id'] in known:
            photos = [entry if p['id'] == entry['id'] else p for p in photos]
            print('updated', entry['id'])
        else:
            photos.append(entry)
            print('added', entry['id'])
    save(photos)


if __name__ == '__main__':
    sys.exit(main())
