"""Sanitize before encrypting; private hosted blobs, never original filenames."""

import io, hashlib, warnings
from PIL import Image, ImageOps
from fastapi import HTTPException
from .security import seal_bytes, open_bytes
from .config import settings

Image.MAX_IMAGE_PIXELS = 16_000_000


def sanitize(data: bytes, mime: str):
    if not data or len(data) > settings.max_file_bytes:
        raise HTTPException(413, "File must be 3 MB or less")
    try:
        if mime in ("image/jpeg", "image/png"):
            with warnings.catch_warnings():
                warnings.simplefilter("error", Image.DecompressionBombWarning)
                image = Image.open(io.BytesIO(data))
                if image.format not in ("JPEG", "PNG"):
                    raise ValueError()
                image.load()
                image = ImageOps.exif_transpose(image).convert("RGB")
                image.thumbnail((2400, 2400))
                clean = Image.new("RGB", image.size)
                clean.paste(image)
                output = io.BytesIO()
                clean.save(output, "JPEG", quality=85, optimize=True)
                return output.getvalue(), "image/jpeg"
        if mime == "application/pdf":
            import pymupdf

            document = pymupdf.open(stream=data, filetype="pdf")
            if document.is_encrypted or not 1 <= len(document) <= 12:
                raise ValueError()
            cleaned = pymupdf.open()
            for page in document:
                if page.rect.width > 2000 or page.rect.height > 2000:
                    raise ValueError()
                pix = page.get_pixmap(
                    matrix=pymupdf.Matrix(1.3, 1.3),
                    alpha=False,
                    colorspace=pymupdf.csRGB,
                )
                jpg = pix.tobytes("jpeg", jpg_quality=80)
                new = cleaned.new_page(width=page.rect.width, height=page.rect.height)
                new.insert_image(new.rect, stream=jpg)
            cleaned.set_metadata({})
            output = cleaned.tobytes(garbage=4, deflate=True)
            cleaned.close()
            document.close()
            if len(output) > settings.max_file_bytes:
                raise ValueError()
            return output, "application/pdf"
    except Exception:
        raise HTTPException(422, "Use a valid JPG, PNG or PDF (up to 12 pages)")
    raise HTTPException(422, "Use JPG, PNG or PDF only")


def put_attachment(data, mime, message_id):
    clean, kind = sanitize(data, mime)
    from vercel.blob.sync import put_blob

    uploaded = put_blob(
        "school/" + message_id + ".enc",
        seal_bytes(clean, "attachment:" + message_id),
        access="private",
        content_type="application/octet-stream",
        add_random_suffix=False,
    )
    return uploaded.url, kind, len(clean), hashlib.sha256(clean).hexdigest()


def read_attachment(message):
    from vercel.blob.sync import get_blob

    try:
        result = get_blob(message.attachment, access="private")
    except Exception:
        raise HTTPException(503, "File unavailable")
    try:
        data = open_bytes(result.body, "attachment:" + message.id)
        if hashlib.sha256(data).hexdigest() != message.attachment_hash:
            raise ValueError()
        return data
    except Exception:
        raise HTTPException(409, "File verification failed")


def delete_attachment(path):
    from vercel.blob.sync import delete_blob

    delete_blob(path)
