import os
from pathlib import Path
from PIL import Image

TARGET_WIDTHS = [800, 1600]
QUALITY = 82
EVENTS_DIR = Path(__file__).resolve().parent.parent / 'assets' / 'events'
SUPPORTED_EXT = {'.jpg', '.jpeg', '.png'}

print(f"Optimizing images in: {EVENTS_DIR}")

for img_path in sorted(EVENTS_DIR.iterdir()):
    if img_path.suffix.lower() not in SUPPORTED_EXT:
        continue

    base = img_path.stem  # without extension
    try:
        with Image.open(img_path) as im:
            im.load()
            if im.mode not in ('RGB', 'RGBA'):
                im = im.convert('RGB')
            orig_w, orig_h = im.size

            for tw in TARGET_WIDTHS:
                if orig_w < tw:  # Skip upscaling
                    continue
                ratio = tw / orig_w
                new_size = (tw, int(orig_h * ratio))
                out_name = f"{base}-{tw}.webp"
                out_path = EVENTS_DIR / out_name
                if out_path.exists():
                    print(f"Skip existing {out_name}")
                    continue
                resized = im.resize(new_size, Image.Resampling.LANCZOS)
                resized.save(out_path, 'WEBP', quality=QUALITY, method=6)
                print(f"Saved {out_name} ({new_size[0]}x{new_size[1]})")

            # Also save a full-size webp if not present (capped to 3000px width to avoid huge files)
            max_display = 3000
            if orig_w > max_display:
                ratio = max_display / orig_w
                display_size = (max_display, int(orig_h * ratio))
                display_im = im.resize(display_size, Image.Resampling.LANCZOS)
            else:
                display_size = (orig_w, orig_h)
                display_im = im
            full_name = f"{base}.webp"
            full_path = EVENTS_DIR / full_name
            if not full_path.exists():
                display_im.save(full_path, 'WEBP', quality=QUALITY, method=6)
                print(f"Saved {full_name} ({display_size[0]}x{display_size[1]})")
            else:
                print(f"Full-size webp exists {full_name}")

    except Exception as e:
        print(f"Error processing {img_path.name}: {e}")

print("Done.")
