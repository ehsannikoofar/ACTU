"""Generate SYNTHETIC sternotomy incision images for the demo (no real patient images).

Procedural drawings: skin-tone texture + midline incision + one feature per variant.
Every image is watermarked "SYNTHETIC". Deterministic (fixed seeds).

Usage:  python3 scripts/make_wound_images.py   (writes public/synthetic/*.jpg)
"""
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 900, 1200
CX = W // 2
TOP, BOTTOM = 170, 1030
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "synthetic")
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"


def font(size):
    try:
        return ImageFont.truetype(FONT, size)
    except OSError:
        return ImageFont.load_default()


def skin(seed):
    rng = np.random.default_rng(seed)
    base = np.array([222, 178, 150], dtype=np.float32)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    # chest contour shading: darker towards the sides and bottom
    shade = 1.0 - 0.18 * ((xx - CX) / (W / 2)) ** 2 - 0.06 * (yy / H)
    # pectoral curves
    shade -= 0.05 * np.exp(-(((yy - 300) / 120) ** 2)) * (np.abs(xx - CX) > 120)
    noise = rng.normal(0, 1, (H // 4, W // 4)).astype(np.float32)
    noise = np.array(Image.fromarray(noise).resize((W, H), Image.BICUBIC))
    fine = rng.normal(0, 1, (H, W)).astype(np.float32)
    img = base[None, None, :] * shade[..., None] + 6 * noise[..., None] + 3 * fine[..., None]
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "RGB")


def incision_path(seed, wobble=4):
    rng = np.random.default_rng(seed)
    pts = []
    for y in range(TOP, BOTTOM + 1, 10):
        x = CX + wobble * math.sin(y / 70.0) + rng.normal(0, 0.8)
        pts.append((x, y))
    return pts


def overlay(img, layer, blur=0):
    if blur:
        layer = layer.filter(ImageFilter.GaussianBlur(blur))
    return Image.alpha_composite(img.convert("RGBA"), layer)


def draw_incision(img, pts, margin=(210, 120, 120, 110), line=(150, 70, 75, 255), width=5):
    halo = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(halo).line(pts, fill=margin, width=26, joint="curve")
    img = overlay(img, halo, blur=9)
    scar = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(scar)
    d.line(pts, fill=line, width=width, joint="curve")
    d.line([(x + 2, y) for x, y in pts], fill=(240, 200, 190, 120), width=2)  # healing highlight
    return overlay(img, scar, blur=1)


def retention_sutures(img, pts):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for i, y in enumerate(range(TOP + 60, BOTTOM - 40, 95)):
        x = CX + 4 * math.sin(y / 70.0)
        # entry/exit puncture marks
        for sx in (-48, 48):
            d.ellipse([x + sx - 5, y - 5, x + sx + 5, y + 5], fill=(120, 50, 55, 230))
        # suture loop across the incision (dark blue nylon)
        d.line([(x - 48, y), (x - 10, y - 7), (x + 10, y - 7), (x + 48, y)], fill=(25, 35, 80, 255), width=5, joint="curve")
        # knot + tails
        kx = x + (14 if i % 2 else -14)
        d.ellipse([kx - 7, y - 13, kx + 7, y + 1], fill=(20, 28, 70, 255))
        d.line([(kx, y - 6), (kx + 22, y - 26)], fill=(25, 35, 80, 255), width=3)
        d.line([(kx, y - 6), (kx + 28, y - 14)], fill=(25, 35, 80, 255), width=3)
    return overlay(img, layer, blur=0.6)


def redness_drainage(img, seed):
    rng = np.random.default_rng(seed)
    red = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(red)
    cy = 760
    for _ in range(26):  # irregular spreading erythema around the lower third
        rx, ry = rng.uniform(70, 190), rng.uniform(90, 230)
        ox, oy = rng.normal(0, 35), rng.normal(0, 70)
        d.ellipse([CX + ox - rx, cy + oy - ry, CX + ox + rx, cy + oy + ry], fill=(205, 40, 45, 40))
    img = overlay(img, red, blur=28)
    ex = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ex)
    for _ in range(14):  # yellow crusted exudate along the lower incision
        y = rng.uniform(700, 900)
        x = CX + 4 * math.sin(y / 70.0) + rng.normal(0, 6)
        r = rng.uniform(6, 15)
        d.ellipse([x - r, y - r * 1.4, x + r, y + r * 1.4], fill=(205, 175, 70, 210))
    # glossy serous drainage trickle
    d.line([(CX + 2, 880), (CX + 8, 950), (CX + 4, 1010), (CX + 10, 1080)], fill=(225, 205, 150, 170), width=12, joint="curve")
    d.line([(CX + 5, 890), (CX + 10, 960)], fill=(255, 250, 235, 200), width=3)
    return overlay(img, ex, blur=1.5)


def gap(img, seed):
    rng = np.random.default_rng(seed)
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cy, half_h, half_w = 640, 95, 26
    d.ellipse([CX - half_w - 14, cy - half_h - 12, CX + half_w + 14, cy + half_h + 12], fill=(200, 95, 95, 200))
    d.ellipse([CX - half_w, cy - half_h, CX + half_w, cy + half_h], fill=(160, 35, 45, 255))
    for _ in range(90):  # granulation texture
        x = CX + rng.normal(0, half_w * 0.45)
        y = cy + rng.normal(0, half_h * 0.45)
        r = rng.uniform(2, 5)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(200, 60, 70, 200))
    d.arc([CX - half_w, cy - half_h, CX + half_w, cy + half_h], 200, 340, fill=(240, 210, 200, 160), width=3)
    return overlay(img, layer, blur=1.2)


def protruding_wire(img):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x0, y0 = CX + 30, 420
    d.ellipse([x0 - 40, y0 - 30, x0 + 40, y0 + 30], fill=(210, 80, 80, 90))
    img = overlay(img, layer, blur=12)
    w = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(w)
    d.ellipse([x0 - 7, y0 - 5, x0 + 7, y0 + 5], fill=(110, 40, 45, 255))  # skin breach
    d.line([(x0, y0), (x0 + 34, y0 - 26), (x0 + 58, y0 - 30)], fill=(150, 155, 165, 255), width=7, joint="curve")
    d.line([(x0 + 2, y0 - 3), (x0 + 34, y0 - 29), (x0 + 56, y0 - 33)], fill=(235, 238, 245, 255), width=2)
    d.ellipse([x0 + 53, y0 - 35, x0 + 63, y0 - 25], fill=(170, 175, 185, 255))
    return overlay(img, w, blur=0.5)


def watermark(img):
    img = img.convert("RGBA")
    wm = Image.new("RGBA", img.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(wm)
    f = font(64)
    text = "SYNTHETIC"
    tw = d.textlength(text, font=f)
    tile = Image.new("RGBA", (int(tw) + 40, 90), (0, 0, 0, 0))
    ImageDraw.Draw(tile).text((20, 8), text, font=f, fill=(255, 255, 255, 70))
    tile = tile.rotate(35, expand=True)
    for (x, y) in [(40, 120), (430, 520), (60, 820)]:
        wm.alpha_composite(tile, (x, y))
    d.rectangle([0, H - 64, W, H], fill=(20, 20, 20, 200))
    d.text((20, H - 52), "SYNTHETIC DEMO IMAGE - NOT A REAL PATIENT", font=font(30), fill=(255, 255, 255, 255))
    return Image.alpha_composite(img, wm).convert("RGB")


def make(name, seed, feature):
    img = skin(seed)
    pts = incision_path(seed)
    margin = (205, 95, 95, 150) if name == "wound-redness-drainage" else (210, 120, 120, 110)
    img = draw_incision(img, pts, margin=margin)
    if feature:
        img = feature(img, pts, seed)
    img = watermark(img)
    path = os.path.join(OUT, f"{name}.jpg")
    img.save(path, quality=88, optimize=True)
    print("wrote", os.path.relpath(path))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    make("wound-healing", 11, None)
    make("wound-retention-sutures", 12, lambda i, p, s: retention_sutures(i, p))
    make("wound-redness-drainage", 13, lambda i, p, s: redness_drainage(i, s))
    make("wound-gap", 14, lambda i, p, s: gap(i, s))
    make("wound-protruding-wire", 15, lambda i, p, s: protruding_wire(i))
    sys.exit(0)
