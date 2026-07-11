# 04 — Validate Image Uploads Before Sending to OpenAI

**Priority:** 🔴 Critical
**Effort:** S (half day)
**Status:** NOT STARTED

## Problem

Replaces the original list's "donation router crashes on import," which is
false — `donation.py` exists, is registered in `main.py`, and is confirmed
live per CLAUDE.md. This is a real issue found while verifying the backlog.

`backend/app/routers/vision.py` has two endpoints accepting
`UploadFile = File(...)` (`analyze_ingredients`, `analyze_receipt`) with no
`content_type` or size check before the bytes are read and sent to OpenAI's
vision API. `barcode.py` likely has the same pattern for its image input —
check it during implementation. Risk: arbitrary file bytes (not just
images), unbounded size driving up OpenAI cost per request, and no useful
error message to the user when they upload something invalid.

## Implementation

1. Add a shared validator (new `backend/app/services/upload_validation.py`
   or similar — check if a `services/` helper pattern fits better once
   you're in the file) :
   ```python
   ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic"}
   MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # confirm against what the frontend camera capture actually produces

   async def validate_image_upload(file: UploadFile) -> bytes:
       if file.content_type not in ALLOWED_CONTENT_TYPES:
           raise HTTPException(400, "Unsupported file type")
       body = await file.read()
       if len(body) > MAX_UPLOAD_BYTES:
           raise HTTPException(400, "File too large")
       return body
   ```
   Note `content_type` is client-supplied and spoofable — if this needs to
   be hardened against malicious clients (not just accidental bad uploads),
   consider a magic-byte check (e.g. `python-magic` or manual header sniff)
   instead of trusting the header alone. Decide based on how this endpoint
   is exposed (already behind `auth_required`, so the threat model is a
   logged-in-but-malicious user, not anonymous).

2. Apply in `vision.py` (`analyze_ingredients`, `analyze_receipt`) and
   `barcode.py`'s image endpoint — read each file first to confirm exact
   current signature before editing.

3. i18n the new error messages per CLAUDE.md's mandatory 6-language rule if
   they're surfaced directly to the frontend user (check how `authFetch`
   error responses currently get displayed).

## Verification

- [ ] Upload a `.txt` file renamed to `.jpg` → rejected with a clear error,
      no OpenAI call made (verify via log/mock, not just HTTP status)
- [ ] Upload an oversized image → rejected before the OpenAI call
- [ ] Existing valid camera-capture flow (per the receipt scanner work in
      the last two PRs) still works end to end
- [ ] `pytest` covers both the rejection and success paths
