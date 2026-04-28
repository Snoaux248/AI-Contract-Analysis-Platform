from __future__ import annotations

from dataclasses import dataclass, asdict
import re
from typing import List, Tuple


@dataclass
class Chunk:
    chunk_id: str
    text: str
    title: str
    section_ref: str
    order_index: int

    def to_dict(self) -> dict:
        return asdict(self)


def split_into_sentences(text: str) -> List[str]:
    """
    Split plain text into sentences on . ? ! followed by whitespace.
    Newlines are folded to spaces first so heading-derived blocks still split cleanly.
    """
    text = text.strip()
    if not text:
        return []
    text = re.sub(r"\s+", " ", text).strip()
    parts = re.split(r"(?<=[.!?])\s+", text)
    sentences = [p.strip() for p in parts if p.strip()]
    return sentences if sentences else ([text] if text else [])


class ContractChunker:
    """Chunk legal text by headings; every chunk is built from whole sentences only."""

    HEADER_PATTERN = re.compile(
        r"(?im)^(?:section\s+\d+(?:\.\d+)*|article\s+[ivxlcdm]+|\d+(?:\.\d+)+\s+.+|\d+\.\s+.+|termination|governing law|indemnification|liability)\b.*$"
    )

    def chunk(self, text: str, max_chars: int = 900, overlap: int = 200) -> List[Chunk]:
        text = self._normalize_body_text(text)
        sections = self._split_by_headings(text)
        if len(sections) >= 2:
            return self._chunks_from_sections(sections, max_chars, overlap)
        if sections:
            body = sections[0][1].strip()
        else:
            body = text.strip()
        if not body:
            return []
        subs = self._sentence_chunks_flat(body, max_chars=max_chars, overlap=overlap)
        n = len(subs)
        return [
            Chunk(
                chunk_id=f"chunk_{i:03d}",
                text=sub,
                title=f"Document — Part {i + 1}" if n > 1 else "Document",
                section_ref="",
                order_index=i,
            )
            for i, sub in enumerate(subs)
            if sub.strip()
        ]

    def _normalize_body_text(self, text: str) -> str:
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        text = re.sub(r"[ \t]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    def _split_by_headings(self, text: str) -> List[Tuple[str, str]]:
        lines = text.split("\n")
        sections: List[Tuple[str, str]] = []
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

    def _chunks_from_sections(
        self, sections: List[Tuple[str, str]], max_chars: int, overlap: int
    ) -> List[Chunk]:
        out: List[Chunk] = []
        order = 0
        for title, content in sections:
            content = self._normalize_body_text(content)
            if not content:
                continue
            ref = self._section_ref(title)
            subs = self._sentence_chunks_flat(content, max_chars=max_chars, overlap=overlap)
            n = len(subs)
            for i, sub in enumerate(subs):
                display_title = f"{title} — Part {i + 1}" if n > 1 else title
                out.append(
                    Chunk(
                        chunk_id=f"chunk_{order:03d}",
                        text=sub,
                        title=display_title,
                        section_ref=ref,
                        order_index=order,
                    )
                )
                order += 1
        return out

    def _sentence_chunks_flat(self, text: str, max_chars: int, overlap: int) -> List[str]:
        """Return list of chunk bodies (sentence-safe, with overlap)."""
        sentences = split_into_sentences(text)
        if not sentences:
            return []
        bodies: List[str] = []
        chunk_start = 0
        n = len(sentences)

        while chunk_start < n:
            chunk_sents: List[str] = []
            pos = chunk_start
            length = 0

            while pos < n:
                s = sentences[pos]
                sep = 1 if chunk_sents else 0
                new_len = length + sep + len(s)
                if new_len <= max_chars:
                    chunk_sents.append(s)
                    length = new_len
                    pos += 1
                    continue
                if not chunk_sents:
                    # Single sentence longer than max_chars: allow as its own chunk
                    chunk_sents.append(s)
                    pos += 1
                break

            if not chunk_sents:
                break
            body = self._join_sentences(chunk_sents)
            if body:
                bodies.append(body)
            if pos >= n:
                break
            nxt = self._overlap_next_start(sentences, chunk_start, pos, overlap)
            if nxt >= pos:
                chunk_start = pos
            else:
                chunk_start = nxt

        return bodies

    def _join_sentences(self, sents: List[str]) -> str:
        parts = [re.sub(r"[ \t]+", " ", s).strip() for s in sents if s.strip()]
        return " ".join(parts).strip()

    def _overlap_next_start(
        self,
        sentences: List[str],
        chunk_start: int,
        chunk_end: int,
        overlap: int,
    ) -> int:
        """
        Index of the first sentence of the next chunk. Reuses a tail of
        sentences[chunk_start:chunk_end] of roughly `overlap` characters
        (complete sentences only). Always advances past one-sentence chunks.
        """
        if chunk_end <= chunk_start:
            return chunk_end
        if chunk_end >= len(sentences):
            return chunk_end
        # Single-sentence chunk: no overlap, move on
        if chunk_end == chunk_start + 1:
            return chunk_end

        acc = 0
        ns_tail = chunk_end
        t = chunk_end - 1
        while t >= chunk_start and acc < overlap:
            acc += len(sentences[t])
            if t < chunk_end - 1:
                acc += 1
            ns_tail = t
            t -= 1

        if ns_tail == chunk_start:
            return min(chunk_start + 1, chunk_end)
        return ns_tail

    def _section_ref(self, header: str) -> str:
        match = re.search(r"(section\s+\d+(?:\.\d+)*)", header, re.IGNORECASE)
        if match:
            return match.group(1)
        match = re.search(r"(article\s+[ivxlcdm]+)", header, re.IGNORECASE)
        return match.group(1) if match else ""
