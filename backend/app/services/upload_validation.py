# backend/app/services/upload_validation.py
"""
Shared image-upload validation for OpenAI vision endpoints
(vision.py's analyze-ingredients/analyze-receipt, barcode.py's vision-lookup).

Threat model: these routes already sit behind auth
(dependencies=[Depends(get_current_user)] at the router level in main.py),
so the concern here is a logged-in-but-malicious/careless user, not an
anonymous attacker. Given that, a full image decode (e.g. Pillow
`Image.verify()`, or a `python-magic` dependency) would be overkill.

However, `content_type` alone is not enough: browsers/canvas uploads set
Content-Type from the file's *extension*, so a .txt renamed to "photo.jpg"
is submitted as `image/jpeg` and would sail through an allow-list check.
To catch that (and to protect the barcode JSON endpoint, which has no
content_type at all -- just a base64 string), we additionally sniff the
first few bytes for a real image file signature ("magic bytes") before
trusting the payload. This is a few `startswith` checks, not a new pinned
dependency, and is enough to reject non-image bytes wearing an image
disguise while staying cheap for every request.
"""
from fastapi import HTTPException, UploadFile

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}

# Matches vision.py's existing OpenAI request-size guard: phone-camera
# captures encoded as JPEG at quality 0.9-0.95 (see App.tsx canvas.toBlob
# calls) comfortably fit under 8 MB.
MAX_UPLOAD_BYTES = 8 * 1024 * 1024


def _looks_like_image(data: bytes) -> bool:
    """Sniff magic bytes for the allowed formats. Not a full decode -- just
    enough to reject non-image bytes wearing an image content-type/extension."""
    if data.startswith(b"\xff\xd8\xff"):
        return True  # JPEG
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return True  # PNG
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return True  # WEBP (RIFF....WEBP)
    if data[4:8] == b"ftyp" and data[8:12] in (
        b"heic", b"heix", b"hevc", b"heim", b"heis", b"hevm", b"hevs", b"mif1", b"msf1",
    ):
        return True  # HEIC/HEIF
    return False


def validate_image_bytes(body: bytes) -> None:
    """Validate raw (already-decoded) image bytes by size + magic bytes.
    Use this when there's no multipart UploadFile/content_type to check
    (e.g. a base64 JSON payload). Raises HTTPException on failure."""
    if len(body) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image too large (max 8 MB)")
    if not _looks_like_image(body):
        raise HTTPException(status_code=400, detail="Unsupported file type")


async def validate_image_upload(file: UploadFile) -> bytes:
    """Validate an UploadFile's declared content_type, size, and magic bytes,
    then return its raw bytes. Raises HTTPException on any failure so
    callers can just `contents = await validate_image_upload(file)` before
    touching OpenAI."""
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    body = await file.read()
    validate_image_bytes(body)
    return body
