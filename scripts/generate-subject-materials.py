from __future__ import annotations

import argparse
import hashlib
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "design" / "subject-m22-face-source.png"
DEFAULT_OUT_DIR = ROOT / "public" / "models" / "subject-m22-materials"
MASTER_SEED = 0x4D323250  # "M22P"

QUALITY_SIZES = {
    "high": {"face": 1024, "tile": 256},
    "low": {"face": 512, "tile": 128},
}


def _rng(label: str) -> np.random.Generator:
    """Return an order-independent generator for one named output."""
    digest = hashlib.sha256(f"{MASTER_SEED}:{label}".encode("ascii")).digest()
    return np.random.default_rng(int.from_bytes(digest[:8], "little"))


def _srgb_to_linear(value: np.ndarray) -> np.ndarray:
    value = np.asarray(value, dtype=np.float32)
    return np.where(
        value <= 0.04045,
        value / 12.92,
        ((value + 0.055) / 1.055) ** 2.4,
    )


def _linear_to_srgb(value: np.ndarray) -> np.ndarray:
    value = np.clip(np.asarray(value, dtype=np.float32), 0.0, 1.0)
    return np.where(
        value <= 0.0031308,
        value * 12.92,
        1.055 * np.power(value, 1.0 / 2.4) - 0.055,
    )


def _as_u8(value: np.ndarray) -> np.ndarray:
    return np.rint(np.clip(value, 0.0, 1.0) * 255.0).astype(np.uint8)


def _blur(field: np.ndarray, radius: float) -> np.ndarray:
    field = np.asarray(field, dtype=np.float32)
    minimum = float(np.min(field))
    extent = float(np.max(field) - minimum)
    if extent <= 1e-8:
        return field.copy()
    encoded = _as_u8((field - minimum) / extent)
    image = Image.fromarray(encoded, mode="L")
    blurred = np.asarray(
        image.filter(ImageFilter.GaussianBlur(radius)), dtype=np.float32
    )
    return blurred / 255.0 * extent + minimum


def _resize_source(source: Image.Image, size: int) -> np.ndarray:
    # A square, full-frame source provides stable atlas coordinates for the
    # procedural face UVs. ImageOps.fit also handles a replacement source that
    # is not square without stretching facial proportions.
    image = ImageOps.fit(
        source.convert("RGB"),
        (size, size),
        method=Image.Resampling.LANCZOS,
        centering=(0.5, 0.5),
    )
    return np.asarray(image, dtype=np.float32) / 255.0


def _face_basecolor(source: Image.Image, size: int) -> np.ndarray:
    srgb = _resize_source(source, size)
    linear = _srgb_to_linear(srgb)
    luma = np.sum(linear * np.array([0.2126, 0.7152, 0.0722]), axis=2)

    yy, xx = np.mgrid[0:size, 0:size]
    nx = (xx + 0.5) / size * 2.0 - 1.0
    ny = (yy + 0.5) / size * 2.0 - 1.0
    face_region = ((nx / 0.67) ** 2 + ((ny + 0.01) / 0.94) ** 2) <= 1.0
    reliable = face_region & (luma > 0.075)
    reference_luma = float(np.median(luma[reliable])) if np.any(reliable) else 0.43

    # Retinex-style low-frequency division removes studio illumination while
    # leaving local identity features and material colour intact. Clamped gain
    # deliberately preserves genuinely black sockets/hair rather than turning
    # them grey.
    illumination = _blur(luma, max(18.0, size * 0.075))
    gain = np.clip(reference_luma / np.maximum(illumination, 0.025), 0.58, 1.72)
    corrected = np.clip(linear * gain[..., None], 0.0, 1.0)

    # Suppress residual large-area chroma casts without flattening the warm
    # ivory material. This is colour correction, not baked lighting.
    chroma_sample = corrected[reliable]
    if chroma_sample.size:
        channel_median = np.median(chroma_sample, axis=0)
        neutral = float(np.mean(channel_median))
        balance = np.clip(neutral / np.maximum(channel_median, 1e-4), 0.90, 1.10)
        corrected *= balance[None, None, :]

    return _as_u8(_linear_to_srgb(corrected))


def _normal_from_height(height: np.ndarray, strength: float, tileable: bool) -> np.ndarray:
    height = np.asarray(height, dtype=np.float32)
    if tileable:
        # The last row/column duplicate the first. Compute derivatives on the
        # unique periodic domain, then restore the duplicated seam samples.
        core = height[:-1, :-1]
        dx = (np.roll(core, -1, axis=1) - np.roll(core, 1, axis=1)) * 0.5
        dy = (np.roll(core, -1, axis=0) - np.roll(core, 1, axis=0)) * 0.5
        nx = -dx * strength
        ny = dy * strength
        nz = np.ones_like(nx)
        length = np.sqrt(nx * nx + ny * ny + nz * nz)
        core_normal = np.stack((nx / length, ny / length, nz / length), axis=2)
        normal = _close_tile(core_normal)
    else:
        dy, dx = np.gradient(height)
        nx = -dx * strength
        ny = dy * strength
        nz = np.ones_like(nx)
        length = np.sqrt(nx * nx + ny * ny + nz * nz)
        normal = np.stack((nx / length, ny / length, nz / length), axis=2)
    return _as_u8(normal * 0.5 + 0.5)


def _face_normal(source: Image.Image, size: int) -> np.ndarray:
    srgb = _resize_source(source, size)
    linear = _srgb_to_linear(srgb)
    luma = np.sum(linear * np.array([0.2126, 0.7152, 0.0722]), axis=2)
    log_luma = np.log(np.maximum(luma, 0.018))

    # Only band-pass detail contributes. Consequently head shape and studio
    # lights cannot leak into the tangent-space normal map.
    fine = _blur(log_luma, max(0.55, size / 1700.0))
    broad = _blur(log_luma, max(4.0, size / 105.0))
    height = np.tanh((fine - broad) * 1.35)
    height = _blur(height, max(0.4, size / 2400.0))
    return _normal_from_height(height, strength=5.25, tileable=False)


def _close_tile(core: np.ndarray) -> np.ndarray:
    """Append exact seam samples around a periodic (size-1) domain."""
    if core.ndim == 2:
        result = np.empty((core.shape[0] + 1, core.shape[1] + 1), dtype=core.dtype)
        result[:-1, :-1] = core
        result[-1, :-1] = core[0, :]
        result[:-1, -1] = core[:, 0]
        result[-1, -1] = core[0, 0]
    else:
        result = np.empty(
            (core.shape[0] + 1, core.shape[1] + 1, core.shape[2]), dtype=core.dtype
        )
        result[:-1, :-1, :] = core
        result[-1, :-1, :] = core[0, :, :]
        result[:-1, -1, :] = core[:, 0, :]
        result[-1, -1, :] = core[0, 0, :]
    return result


def _periodic_noise(size: int, rng: np.random.Generator, scale: float) -> np.ndarray:
    """Generate Gaussian-filtered noise over a toroidal sample domain."""
    domain = size - 1
    samples = rng.standard_normal((domain, domain))
    fy = np.fft.fftfreq(domain)[:, None]
    fx = np.fft.fftfreq(domain)[None, :]
    radius_sq = fx * fx + fy * fy
    sigma = max(scale / domain, 1.0 / domain)
    low_pass = np.exp(-radius_sq / (2.0 * sigma * sigma))
    field = np.fft.ifft2(np.fft.fft2(samples) * low_pass).real
    field -= float(field.mean())
    field /= max(float(field.std()), 1e-6)
    return _close_tile(field.astype(np.float32))


def _source_detail_strength(source: Image.Image) -> float:
    sample = ImageOps.fit(
        source.convert("L"), (256, 256), method=Image.Resampling.LANCZOS
    )
    luma = np.asarray(sample, dtype=np.float32) / 255.0
    high_pass = luma - _blur(luma, 3.0)
    useful = luma > 0.18
    if not np.any(useful):
        return 0.02
    return float(np.clip(np.std(high_pass[useful]), 0.008, 0.045))


def _woven_height(size: int, rng: np.random.Generator, density: int) -> np.ndarray:
    domain = size - 1
    x = np.arange(domain, dtype=np.float32)[None, :] / domain
    y = np.arange(domain, dtype=np.float32)[:, None] / domain
    warp = np.sin(2.0 * np.pi * density * x)
    weft = np.sin(2.0 * np.pi * (density + 3) * y)
    weave = warp * 0.62 + weft * 0.38 + warp * weft * 0.18
    noise = _periodic_noise(size, rng, scale=max(8.0, size / 13.0))
    return _close_tile(weave.astype(np.float32)) * 0.7 + noise * 0.3


def _rgba_rm(roughness: np.ndarray, metalness: np.ndarray) -> np.ndarray:
    shape = roughness.shape
    result = np.ones((shape[0], shape[1], 4), dtype=np.uint8) * 255
    result[..., 1] = _as_u8(roughness)
    result[..., 2] = _as_u8(metalness)
    return result


def _ivory_set(
    source: Image.Image, size: int, quality: str
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    rng = _rng(f"{quality}:ivory")
    broad = _periodic_noise(size, rng, scale=max(3.0, size / 32.0))
    fine = _periodic_noise(size, rng, scale=max(12.0, size / 9.0))
    photo_amount = _source_detail_strength(source)
    variation = broad * 0.032 + fine * photo_amount * 0.42
    base = np.array([0.72, 0.685, 0.62], dtype=np.float32)
    color = np.clip(base[None, None, :] + variation[..., None], 0.0, 1.0)
    height = broad * 0.35 + fine * 0.65
    roughness = np.clip(0.74 + broad * 0.045 + fine * 0.025, 0.57, 0.90)
    metalness = np.zeros_like(roughness)
    return (
        _as_u8(color),
        _normal_from_height(height, strength=2.1, tileable=True),
        _rgba_rm(roughness, metalness),
    )


def _black_fabric_set(
    size: int, quality: str
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    rng = _rng(f"{quality}:black-fabric")
    height = _woven_height(size, rng, density=24)
    grain = _periodic_noise(size, rng, scale=max(14.0, size / 8.0))
    domain = size - 1
    x = np.arange(domain, dtype=np.float32)[None, :] / domain
    rib = _close_tile(np.sin(2.0 * np.pi * 12.0 * x).repeat(domain, axis=0))
    value = np.clip(0.055 + rib * 0.009 + grain * 0.006, 0.018, 0.10)
    color = np.stack((value * 0.84, value * 0.91, value), axis=2)
    roughness = np.clip(0.89 + grain * 0.028 - np.abs(rib) * 0.018, 0.78, 0.97)
    metalness = np.zeros_like(roughness)
    return (
        _as_u8(color),
        _normal_from_height(height + rib * 0.4, strength=2.9, tileable=True),
        _rgba_rm(roughness, metalness),
    )


def _metal_set(size: int, quality: str) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    rng = _rng(f"{quality}:metal")
    broad = _periodic_noise(size, rng, scale=max(3.0, size / 30.0))
    fine = _periodic_noise(size, rng, scale=max(18.0, size / 7.0))
    domain = size - 1
    x = np.arange(domain, dtype=np.float32)[None, :] / domain
    y = np.arange(domain, dtype=np.float32)[:, None] / domain
    brushed = np.sin(2.0 * np.pi * (37.0 * x + y * 2.0))
    brushed += 0.45 * np.sin(2.0 * np.pi * (61.0 * x - y))
    brushed = _close_tile(brushed.astype(np.float32))
    variation = broad * 0.026 + fine * 0.012 + brushed * 0.009
    base = np.array([0.43, 0.455, 0.47], dtype=np.float32)
    color = np.clip(base[None, None, :] + variation[..., None], 0.0, 1.0)
    height = brushed * 0.48 + fine * 0.18 + broad * 0.08
    roughness = np.clip(0.27 + broad * 0.055 + np.abs(brushed) * 0.025, 0.16, 0.43)
    metalness = np.clip(0.96 - np.maximum(broad, 0.0) * 0.025, 0.89, 1.0)
    return (
        _as_u8(color),
        _normal_from_height(height, strength=1.75, tileable=True),
        _rgba_rm(roughness, metalness),
    )


def _save_rgb(path: Path, pixels: np.ndarray) -> None:
    Image.fromarray(pixels, mode="RGB").save(path, format="PNG", compress_level=9)


def _save_rgba(path: Path, pixels: np.ndarray) -> None:
    Image.fromarray(pixels, mode="RGBA").save(path, format="PNG", compress_level=9)


def _validate_tile(pixels: np.ndarray, label: str) -> None:
    if not np.array_equal(pixels[0], pixels[-1]):
        raise ValueError(f"{label}: top/bottom seam is not closed")
    if not np.array_equal(pixels[:, 0], pixels[:, -1]):
        raise ValueError(f"{label}: left/right seam is not closed")


def generate(source_path: Path, out_dir: Path) -> list[Path]:
    if not source_path.is_file():
        raise FileNotFoundError(f"Face source does not exist: {source_path}")
    source = ImageOps.exif_transpose(Image.open(source_path)).convert("RGB")
    written: list[Path] = []

    for quality, sizes in QUALITY_SIZES.items():
        quality_dir = out_dir / quality
        quality_dir.mkdir(parents=True, exist_ok=True)

        face_basecolor = _face_basecolor(source, sizes["face"])
        face_normal = _face_normal(source, sizes["face"])
        face_outputs = {
            "face-basecolor.png": face_basecolor,
            "face-normal.png": face_normal,
        }
        for filename, pixels in face_outputs.items():
            path = quality_dir / filename
            _save_rgb(path, pixels)
            written.append(path)

        material_sets = {
            "ivory": _ivory_set(source, sizes["tile"], quality),
            "black-fabric": _black_fabric_set(sizes["tile"], quality),
            "metal": _metal_set(sizes["tile"], quality),
        }
        for material, (basecolor, normal, rm) in material_sets.items():
            for map_name, pixels in (
                ("basecolor", basecolor),
                ("normal", normal),
                ("rm", rm),
            ):
                _validate_tile(pixels, f"{quality}/{material}-{map_name}")
                path = quality_dir / f"{material}-{map_name}.png"
                if map_name == "rm":
                    _save_rgba(path, pixels)
                else:
                    _save_rgb(path, pixels)
                written.append(path)

    return written


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build deterministic PBR textures for the SUBJECT M-22 model."
    )
    parser.add_argument(
        "--source",
        type=Path,
        default=DEFAULT_SOURCE,
        help=f"facial source image (default: {DEFAULT_SOURCE})",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=DEFAULT_OUT_DIR,
        help=f"output directory (default: {DEFAULT_OUT_DIR})",
    )
    args = parser.parse_args()

    written = generate(args.source.resolve(), args.out_dir.resolve())
    total_bytes = sum(path.stat().st_size for path in written)
    print(f"Generated {len(written)} deterministic textures ({total_bytes} bytes)")
    for path in written:
        print(path)


if __name__ == "__main__":
    main()
