"""Fill in camera settings (camera, lens, focal length, aperture, shutter, ISO) and exact
capture times for photos in photos.js that don't have them yet, read from the originals.

    python tools/add_exif.py

Edit SOURCES if your originals live somewhere else. Photos whose originals can't be
found are skipped and reported, so it is safe to run again later.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import add_photos as ap

SOURCES = {  # photo id prefix -> folder with the original camera files
    '': 'C:/Users/chanc/Documents/SHANGHAI 2026',
    'jp25-': 'C:/Users/chanc/Pictures/JAPAN 2025 (edited)/JAPAN 2025',
    'cn26-': 'E:/CHINA JAN 2026',
    'jp26-': 'E:/JAPAN 2026',
}


def main():
    photos = ap.load()
    done = missing = 0
    for p in photos:
        if p.get('exif'):
            continue
        prefix = next((k for k in SOURCES if k and p['id'].startswith(k)), '')
        path = os.path.join(SOURCES[prefix], p['id'][len(prefix):].upper() + '.JPG')
        if not os.path.exists(path):
            missing += 1
            continue
        exif, when = ap.camera_data(path)
        if exif:
            p['exif'] = exif
        # keep cleared dates cleared (e.g. a camera clock that was reset)
        if when and p.get('date'):
            p['date'] = when
        done += 1
    ap.save(photos)
    print(f'camera data added to {done} photos; {missing} originals not found')


if __name__ == '__main__':
    main()
