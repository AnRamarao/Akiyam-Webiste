import os, json
from pathlib import Path
try:
    from PIL import Image
except ImportError:
    print(json.dumps({"error": "Pillow not installed"}))
    raise SystemExit(1)

root = Path(__file__).resolve().parent.parent / 'assets' / 'events'
results = {}
for entry in sorted(root.iterdir()):
    if entry.suffix.lower() not in {'.jpg', '.jpeg', '.png'}:
        continue
    try:
        with Image.open(entry) as im:
            w, h = im.size
        results[entry.name] = {"width": w, "height": h}
    except Exception as e:
        results[entry.name] = {"error": str(e)}

print(json.dumps(results, indent=2))
