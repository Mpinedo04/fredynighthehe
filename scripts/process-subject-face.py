from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Prepare the SUBJECT M-22 facial render as a feathered game decal."
    )
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    source = Image.open(args.input).convert("RGBA")
    source = source.resize((1024, 1024), Image.Resampling.LANCZOS)

    # The source has a truly black studio background. Preserve the black eye
    # sockets inside the facial oval, while deriving the outer hair silhouette
    # from non-black pixels so the fedora and endoskeleton remain visible behind
    # the decal instead of being hidden by a rectangular black card.
    face_core = Image.new("L", source.size, 0)
    draw = ImageDraw.Draw(face_core)
    draw.ellipse((142, -6, 882, 1040), fill=255)
    face_core = face_core.filter(ImageFilter.GaussianBlur(8))

    red, green, blue, _ = source.split()
    brightest = ImageChops.lighter(red, ImageChops.lighter(green, blue))
    detail_matte = brightest.point(
        lambda value: 0 if value <= 3 else min(255, (value - 3) * 13)
    )
    detail_matte = detail_matte.filter(ImageFilter.GaussianBlur(1.2))
    matte = ImageChops.lighter(face_core, detail_matte)
    matte = ImageChops.multiply(source.getchannel("A"), matte)
    source.putalpha(matte)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    source.save(args.output, optimize=True)


if __name__ == "__main__":
    main()
