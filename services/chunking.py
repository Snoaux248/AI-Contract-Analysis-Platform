from __future__ import annotations

from dataclasses import dataclass, asdict
import re
from typing import List


@dataclass
class Chunk:
    chunk_id: str
    text: str
    title: str
    section_ref: str
    order_index: int

    def to_dict(self) -> dict:
        return asdict(self)


class ContractChunker:
    """Chunk legal text by headings, fallback to sliding windows."""

    HEADER_PATTERN = re.compile(
        r"(?im)^(?:section\s+\d+(?:\.\d+)*|article\s+[ivxlcdm]+|\d+(?:\.\d+)+\s+.+|\d+\.\s+.+|termination|governing law|indemnification|liability)\b.*$"
    )

    def chunk(self, text: str, max_chars: int = 1200, overlap: int = 220) -> List[Chunk]:
        sections = self._split_by_headings(text)
        if len(sections) >= 2:
            return [
                Chunk(
                    chunk_id=f"chunk_{idx:03d}",
                    text=content.strip(),
                    title=title,
                    section_ref=self._section_ref(title),
                    order_index=idx,
                )
                for idx, (title, content) in enumerate(sections)
                if content.strip()
            ]
        return self._fallback_chunks(text, max_chars=max_chars, overlap=overlap)

    def _split_by_headings(self, text: str) -> List[tuple[str, str]]:
        lines = text.split("\n")
        sections: List[tuple[str, str]] = []
        current_title = "Preamble"
        buffer: List[str] = []

        for line in lines:
            clean = line.strip()
            if not clean:
                if buffer:
                    buffer.append("")
                continue

            if self.HEADER_PATTERN.match(clean):
                if buffer:
                    sections.append((current_title, "\n".join(buffer).strip()))
                current_title = clean[:120]
                buffer = []
            else:
                buffer.append(clean)

        if buffer:
            sections.append((current_title, "\n".join(buffer).strip()))

        return sections

    def _fallback_chunks(self, text: str, max_chars: int, overlap: int) -> List[Chunk]:
        chunks: List[Chunk] = []
        start = 0
        idx = 0
        text = text.strip()

        while start < len(text):
            end = min(start + max_chars, len(text))
            body = text[start:end]
            chunks.append(
                Chunk(
                    chunk_id=f"chunk_{idx:03d}",
                    text=body,
                    title=f"Chunk {idx + 1}",
                    section_ref="",
                    order_index=idx,
                )
            )
            if end >= len(text):
                break
            start = max(0, end - overlap)
            idx += 1

        return chunks

    def _section_ref(self, header: str) -> str:
        match = re.search(r"(section\s+\d+(?:\.\d+)*)", header, re.IGNORECASE)
        if match:
            return match.group(1)
        match = re.search(r"(article\s+[ivxlcdm]+)", header, re.IGNORECASE)
        return match.group(1) if match else ""
