from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


root = Path(__file__).resolve().parent
pages = sorted((root / "rendered").glob("page-*.png"))
out_dir = root / "contact-sheets"
out_dir.mkdir(parents=True, exist_ok=True)

thumb_w, thumb_h = 260, 368
label_h = 24
cols, rows = 4, 4
font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 14)

for sheet_index in range(0, len(pages), cols * rows):
    group = pages[sheet_index:sheet_index + cols * rows]
    canvas = Image.new("RGB", (cols * thumb_w, rows * (thumb_h + label_h)), "#dfe5ec")
    draw = ImageDraw.Draw(canvas)
    for position, page in enumerate(group):
        image = Image.open(page).convert("RGB")
        image.thumbnail((thumb_w - 10, thumb_h - 10), Image.Resampling.LANCZOS)
        x = (position % cols) * thumb_w + (thumb_w - image.width) // 2
        y = (position // cols) * (thumb_h + label_h) + 5
        canvas.paste(image, (x, y))
        draw.text((x, y + thumb_h - 2), page.stem, fill="#182132", font=font)
    output = out_dir / f"sheet-{sheet_index // (cols * rows) + 1:02d}.jpg"
    canvas.save(output, quality=88, optimize=True)

print(f"pages={len(pages)} sheets={len(list(out_dir.glob('sheet-*.jpg')))}")
