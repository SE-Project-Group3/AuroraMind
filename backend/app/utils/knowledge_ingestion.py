from __future__ import annotations

from pathlib import Path
import re


def split_text(text: str, chunk_size: int = 600, overlap: int = 120) -> list[str]:
    """
    Chunk text for RAG.
    """
    if not text:
        return []

    chunk_size = max(int(chunk_size), 200)
    overlap = max(int(overlap), 0)
    overlap = min(overlap, max(chunk_size - 50, 0))

    t = text.replace("\r\n", "\n").replace("\r", "\n").strip()
    if not t:
        return []

    heading_re = re.compile(r"^(#{1,6})\s+.+$", re.MULTILINE)
    matches = list(heading_re.finditer(t))

    blocks: list[str] = []
    if matches:
        for i, m in enumerate(matches):
            start = m.start()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(t)
            seg = t[start:end].strip()
            if seg:
                blocks.append(seg)
    else:
        blocks = [b.strip() for b in re.split(r"\n\s*\n+", t) if b.strip()]

    chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    def flush() -> None:
        nonlocal current, current_len
        if not current:
            return
        combined = "\n\n".join(current).strip()
        if combined:
            chunks.append(combined)
        current = []
        current_len = 0

    for b in blocks:
        if len(b) > chunk_size:
            flush()
            start = 0
            while start < len(b):
                end = min(start + chunk_size, len(b))
                seg = b[start:end].strip()
                if seg:
                    chunks.append(seg)
                start = end - overlap if end - overlap > start else end
            continue

        add_len = len(b) + (2 if current else 0)
        if current and current_len + add_len > chunk_size:
            flush()
        current.append(b)
        current_len += add_len

    flush()

    if overlap <= 0 or len(chunks) <= 1:
        return chunks

    out: list[str] = []
    prev_tail = ""
    for c in chunks:
        if prev_tail:
            out.append((prev_tail + "\n\n" + c).strip())
        else:
            out.append(c)
        prev_tail = c[-overlap:] if len(c) > overlap else c
    return out


def extract_text_from_path(path: Path, mime_type: str | None) -> str:
    """
    Best-effort text extraction.
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


