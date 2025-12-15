from __future__ import annotations

from pathlib import Path


def split_text(text: str, chunk_size: int = 800, overlap: int = 200) -> list[str]:
    if not text:
        return []

    chunks: list[str] = []
    start = 0
    length = len(text)
    while start < length:
        end = min(start + chunk_size, length)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start = end - overlap if end - overlap > start else end
    return chunks


def extract_text_from_path(path: Path, mime_type: str | None) -> str:
    """
    Best-effort text extraction.
    - text/*: decode as utf-8 (ignore errors)
    - application/pdf: extract text via pypdf
    - .docx: extract text via python-docx
    Fallback: decode raw bytes as utf-8 (ignore errors)
    """
    mt = (mime_type or "").lower()
    suffix = path.suffix.lower()

    if mt.startswith("text/") or suffix in {".txt", ".md", ".csv", ".log"}:
        return path.read_text(encoding="utf-8", errors="ignore")

    if mt == "application/pdf" or suffix == ".pdf":
        try:
            from pypdf import PdfReader  # type: ignore

            reader = PdfReader(str(path))
            parts: list[str] = []
            for page in reader.pages:
                t = page.extract_text() or ""
                if t.strip():
                    parts.append(t)
            return "\n\n".join(parts)
        except Exception:
            pass

    if suffix == ".docx" or mt in {
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    }:
        try:
            import docx  # type: ignore

            doc = docx.Document(str(path))
            return "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
        except Exception:
            pass

    return path.read_bytes().decode("utf-8", errors="ignore")


