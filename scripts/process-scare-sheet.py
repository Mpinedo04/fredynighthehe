from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "design" / "mascot-jumpscare-sheet-v1.png"
OUTPUT = ROOT / "public" / "animatronics"

MASCOTS = (
    ("ursus-9", (8, 8, 622, 622)),
    ("velvet-r", (626, 8, 1240, 622)),
    ("avis-3", (8, 626, 622, 1240)),
    ("vulpes-x", (626, 626, 1240, 1240)),
)


def prepare_face(image: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    face = image.crop(box).convert("RGB")
    face = face.resize((768, 768), Image.Resampling.LANCZOS)
    face = ImageEnhance.Contrast(face).enhance(1.08)
    face = ImageEnhance.Color(face).enhance(0.86)
    face = ImageEnhance.Sharpness(face).enhance(1.18)

    # A slight vignette makes the generated portrait merge with the CCTV feed
    # instead of looking like a bright rectangular card.
    mask = Image.new("L", face.size, 255)
    edge = Image.new("L", face.size, 0)
    edge.paste(255, (42, 42, 726, 726))
    edge = edge.filter(ImageFilter.GaussianBlur(58))
    mask = Image.eval(edge, lambda value: int(value * 0.94))
    black = Image.new("RGB", face.size, (0, 0, 0))
    return Image.composite(face, black, mask)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    sheet = Image.open(SOURCE)

    for name, box in MASCOTS:
        output = OUTPUT / f"{name}.webp"
        prepare_face(sheet, box).save(
            output,
            "WEBP",
            quality=88,
            method=6,
        )
        print(f"{name}: {output.stat().st_size} bytes")


if __name__ == "__main__":
    main()
