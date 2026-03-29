#!/usr/bin/env python3
"""
AIKYAM Image Optimizer
Optimizes all site images (people, branding, events) into WebP + compressed JPEG.
Outputs optimized files alongside originals with -opt suffix or into migrated dirs.

Usage:
    python3 tools/optimize_all_images.py [--dry-run]
"""

import os
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
QUALITY_WEBP = 82
QUALITY_JPEG = 85
MAX_PEOPLE_PX = 400       # People photos only need ~400px for 180px display @2x
MAX_BRANDING_PX = 1920    # Background images capped to 1920px
MAX_EVENT_PX = 3000
TARGET_WIDTHS = [800, 1600]
SUPPORTED_EXT = {'.jpg', '.jpeg', '.png'}

DRY_RUN = '--dry-run' in sys.argv

stats = {'skipped': 0, 'created': 0, 'saved_bytes': 0}


def optimize_image(src_path, out_path, max_width, quality, fmt='WEBP'):
    """Resize and save an image. Returns bytes saved or 0 if skipped."""
    if out_path.exists():
        stats['skipped'] += 1
        return 0

    if DRY_RUN:
        print(f"  [DRY RUN] Would create: {out_path.name}")
        return 0

    with Image.open(src_path) as im:
        im.load()
        if im.mode not in ('RGB', 'RGBA'):
            im = im.convert('RGB')
        elif im.mode == 'RGBA' and fmt == 'JPEG':
            im = im.convert('RGB')

        orig_w, orig_h = im.size
        if orig_w > max_width:
            ratio = max_width / orig_w
            new_size = (max_width, int(orig_h * ratio))
            im = im.resize(new_size, Image.Resampling.LANCZOS)
        else:
            new_size = (orig_w, orig_h)

        save_kwargs = {'quality': quality}
        if fmt == 'WEBP':
            save_kwargs['method'] = 6
        elif fmt == 'JPEG':
            save_kwargs['optimize'] = True

        im.save(out_path, fmt, **save_kwargs)

        orig_size = src_path.stat().st_size
        new_size_bytes = out_path.stat().st_size
        saved = orig_size - new_size_bytes
        stats['created'] += 1
        print(f"  Created: {out_path.name} ({new_size[0]}x{new_size[1]}, "
              f"{new_size_bytes // 1024}KB, saved {saved // 1024}KB)")
        stats['saved_bytes'] += max(saved, 0)
        return saved


def process_people():
    """Optimize people photos: create small WebP versions for display."""
    people_dir = ROOT / 'assets' / 'people'
    if not people_dir.exists():
        print("People directory not found, skipping.")
        return

    print("\n=== Optimizing People Photos ===")
    for img_path in sorted(people_dir.iterdir()):
        if img_path.suffix.lower() not in SUPPORTED_EXT:
            continue
        # Skip already-optimized files
        if '-opt' in img_path.stem:
            continue

        base = img_path.stem
        print(f"\n  Source: {img_path.name} ({img_path.stat().st_size // 1024}KB)")

        # Create optimized WebP
        webp_path = people_dir / f"{base}-opt.webp"
        optimize_image(img_path, webp_path, MAX_PEOPLE_PX, QUALITY_WEBP, 'WEBP')

        # Create compressed JPEG fallback
        jpeg_path = people_dir / f"{base}-opt.jpeg"
        optimize_image(img_path, jpeg_path, MAX_PEOPLE_PX, QUALITY_JPEG, 'JPEG')


def process_branding():
    """Optimize branding assets: BgImage, logo."""
    branding_dir = ROOT / 'assets' / 'branding'
    if not branding_dir.exists():
        print("Branding directory not found, skipping.")
        return

    print("\n=== Optimizing Branding Assets ===")

    # BgImage.png -> compressed WebP at 1920px
    bg_src = branding_dir / 'BgImage.png'
    if bg_src.exists():
        print(f"\n  Source: BgImage.png ({bg_src.stat().st_size // 1024}KB)")
        optimize_image(bg_src, branding_dir / 'BgImage.webp', MAX_BRANDING_PX, QUALITY_WEBP, 'WEBP')
        optimize_image(bg_src, branding_dir / 'BgImage-1200.webp', 1200, QUALITY_WEBP, 'WEBP')

    # logo.png -> smaller WebP
    logo_src = branding_dir / 'logo.png'
    if logo_src.exists():
        print(f"\n  Source: logo.png ({logo_src.stat().st_size // 1024}KB)")
        optimize_image(logo_src, branding_dir / 'logo.webp', 512, QUALITY_WEBP, 'WEBP')


def process_events():
    """Optimize event images into gallery/migrated directory."""
    events_dir = ROOT / 'assets' / 'events'
    migrated_dir = ROOT / 'assets' / 'gallery' / 'migrated'
    if not events_dir.exists():
        print("Events directory not found, skipping.")
        return

    migrated_dir.mkdir(parents=True, exist_ok=True)
    print("\n=== Optimizing Event Images -> gallery/migrated ===")

    for img_path in sorted(events_dir.iterdir()):
        if img_path.suffix.lower() not in SUPPORTED_EXT:
            continue

        base = img_path.stem
        print(f"\n  Source: {img_path.name} ({img_path.stat().st_size // 1024}KB)")

        # Create responsive WebP variants
        for tw in TARGET_WIDTHS:
            out_path = migrated_dir / f"{base}-{tw}.webp"
            optimize_image(img_path, out_path, tw, QUALITY_WEBP, 'WEBP')

        # Full-size WebP (capped)
        optimize_image(img_path, migrated_dir / f"{base}.webp", MAX_EVENT_PX, QUALITY_WEBP, 'WEBP')

        # JPEG fallback
        jpeg_out = migrated_dir / f"{base}.jpeg"
        if not jpeg_out.exists():
            # Check alternate extension
            alt = migrated_dir / f"{base}.jpg"
            if not alt.exists():
                optimize_image(img_path, jpeg_out, MAX_EVENT_PX, QUALITY_JPEG, 'JPEG')
            else:
                stats['skipped'] += 1


def print_summary():
    print("\n" + "=" * 50)
    print(f"Optimization complete!")
    print(f"  Files created: {stats['created']}")
    print(f"  Files skipped (already exist): {stats['skipped']}")
    print(f"  Total space saved: {stats['saved_bytes'] / (1024 * 1024):.1f} MB")
    if DRY_RUN:
        print("  (DRY RUN - no files were actually created)")


if __name__ == '__main__':
    print("AIKYAM Image Optimizer")
    print(f"Root: {ROOT}")
    if DRY_RUN:
        print("*** DRY RUN MODE ***")

    process_people()
    process_branding()
    process_events()
    print_summary()
