from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Extract the front SUBJECT M-22 concept view as a game impostor."
    )
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()

    source = Image.open(args.input).convert("RGB")
    # The leftmost figure is the orthographic front design from the approved
    # turnaround. Keep extra room for the fedora, fingers and shoe tips.
    crop = source.crop((35, 24, 385, 990))
    pixels = np.asarray(crop, dtype=np.float32)

    edge_samples = np.concatenate((pixels[:, :14], pixels[:, -14:]), axis=1)
    row_background = np.median(edge_samples, axis=1, keepdims=True)
    distance = np.linalg.norm(pixels - row_background, axis=2)
    inferred_alpha = np.clip((distance - 9.0) * 20.0, 0, 255).astype(np.uint8)
    inferred = Image.fromarray(inferred_alpha, "L").filter(
        ImageFilter.GaussianBlur(0.8)
    )

    # Protect dark fabric and polished shoes that legitimately approach the
    # studio background color. These compact cores never cross the silhouette;
    # the inferred matte still owns every outer edge and finger gap.
    core = Image.new("L", crop.size, 0)
    draw = ImageDraw.Draw(core)
    draw.ellipse((143, 65, 228, 194), fill=255)  # black eye sockets stay solid
    draw.rounded_rectangle((150, 214, 205, 462), radius=8, fill=255)
    draw.polygon([(123, 480), (160, 480), (156, 866), (127, 866)], fill=255)
    draw.polygon([(198, 480), (235, 480), (239, 866), (207, 866)], fill=255)
    core = core.filter(ImageFilter.GaussianBlur(1.4))

    envelope = Image.new("L", crop.size, 0)
    envelope_draw = ImageDraw.Draw(envelope)
    envelope_draw.ellipse((111, 23, 273, 215), fill=255)
    envelope_draw.polygon(
        [(78, 188), (275, 188), (267, 503), (94, 503)],
        fill=255,
    )
    envelope_draw.polygon(
        [(54, 203), (118, 203), (101, 565), (37, 587), (27, 548)],
        fill=255,
    )
    envelope_draw.polygon(
        [(246, 201), (303, 207), (337, 549), (322, 587), (274, 564)],
        fill=255,
    )
    envelope_draw.polygon(
        [(105, 467), (169, 467), (176, 887), (82, 948), (67, 914)],
        fill=255,
    )
    envelope_draw.polygon(
        [(193, 467), (255, 467), (301, 914), (286, 948), (188, 887)],
        fill=255,
    )
    envelope = envelope.filter(ImageFilter.GaussianBlur(2.5))

    inferred = ImageChops.multiply(inferred, envelope)
    alpha = ImageChops.lighter(inferred, core)
    rgba = crop.convert("RGBA")
    rgba.putalpha(alpha)
    rgba = rgba.resize((512, 1413), Image.Resampling.LANCZOS)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    rgba.save(args.output, optimize=True)


if __name__ == "__main__":
    main()
