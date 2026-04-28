from __future__ import annotations

import re
from typing import Dict, List, Optional, Tuple

from services.chunking import split_into_sentences


class RedFlagService:
    """Detect high-risk clauses using practical MVP heuristics."""

    RULES = [
        {
            "category": "unilateral_termination",
            "severity": "high",
            "title": "Unilateral termination",
            "patterns": [r"terminate\s+.*\s+at\s+any\s+time", r"sole\s+discretion.*terminate"],
            "explanation": "One party appears to have broad unilateral termination rights.",
        },
        {
            "category": "automatic_renewal",
            "severity": "medium",
            "title": "Automatic renewal",
            "patterns": [r"automatically\s+renew", r"auto[- ]?renew"],
            "explanation": "Contract appears to renew automatically unless notice is provided.",
        },
        {
            "category": "broad_indemnification",
            "severity": "high",
            "title": "Broad indemnification",
            "patterns": [r"indemnify.*hold\s+harmless", r"any\s+and\s+all\s+claims"],
            "explanation": "Indemnification language may be broad and one-sided.",
        },
        {
            "category": "uncapped_liability",
            "severity": "high",
            "title": "Uncapped liability",
            "patterns": [r"unlimited\s+liability", r"liability\s+shall\s+not\s+be\s+limited"],
            "explanation": "Liability cap may be missing or explicitly removed.",
        },
        {
            "category": "governing_law",
            "severity": "medium",
            "title": "Potentially unfavorable jurisdiction",
            "patterns": [r"governed\s+by\s+the\s+laws\s+of", r"exclusive\s+jurisdiction"],
            "explanation": "Governing law/jurisdiction should be reviewed for business impact.",
        },
        {
            "category": "mandatory_arbitration",
            "severity": "medium",
            "title": "Mandatory arbitration",
            "patterns": [r"binding\s+arbitration", r"disputes?\s+.*\s+arbitration"],
            "explanation": "Dispute resolution appears to require arbitration.",
        },
        {
            "category": "assignment_without_consent",
            "severity": "medium",
            "title": "Assignment without consent",
            "patterns": [r"assign\s+.*without\s+consent", r"may\s+assign\s+this\s+agreement"],
            "explanation": "Assignment rights may allow transfer without the other party's approval.",
        },
        {
            "category": "broad_confidentiality",
            "severity": "low",
            "title": "Broad confidentiality scope",
            "patterns": [r"confidential\s+information\s+includes\s+all", r"in\s+perpetuity"],
            "explanation": "Confidentiality obligations may be unusually broad in scope/duration.",
        },
        {
            "category": "payment_penalties",
            "severity": "medium",
            "title": "One-sided payment penalties",
            "patterns": [r"late\s+fee\s+of", r"interest\s+at\s+the\s+rate\s+of", r"non[- ]refundable"],
            "explanation": "Payment terms may impose strict penalties or one-sided fee treatment.",
        },
    ]

    def analyze(self, chunks: List[Dict]) -> List[Dict]:
        findings: List[Dict] = []

        for chunk in chunks:
            text = chunk.get("text", "")
            chunk_id = chunk.get("chunk_id")
            for rule in self.RULES:
                for pattern in rule["patterns"]:
                    rx = re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL)
                    if rx:
                        excerpt = self._extract_excerpt(text, pattern)
                        match_text = rx.group(0)
                        highlight_text = self._build_highlight_text(text, pattern, rx)
                        cite = self._build_citation_fields(
                            chunk=chunk,
                            text=text,
                            match=rx,
                            highlight_text=highlight_text,
                            excerpt=excerpt,
                        )
                        findings.append(
                            {
                                "title": rule["title"],
                                "chunk_id": chunk_id,
                                "chunk_text": text,
                                "section_ref": chunk.get("section_ref"),
                                "category": rule["category"],
                                "severity": rule["severity"],
                                "excerpt": excerpt,
                                "match_text": match_text,
                                "highlight_text": highlight_text,
                                "explanation": rule["explanation"],
                                **cite,
                            }
                        )
                        break

        return self._dedupe_findings(findings)

    @staticmethod
    def _norm_key_part(s: str) -> str:
        return re.sub(r"\s+", " ", (s or "").lower().strip())

    def _dedupe_key(self, f: Dict) -> tuple:
        """Semantic duplicate key (citation_quote excluded so we can pick shortest quote)."""
        return (
            self._norm_key_part(f.get("title", "")),
            self._norm_key_part(f.get("category", "")),
            self._norm_key_part(f.get("excerpt", "")),
            self._norm_key_part(f.get("match_text", "")),
            self._norm_key_part(f.get("highlight_text", "")),
        )

    @staticmethod
    def _shorten_highlight(s: str, limit: int = 250) -> str:
        s = re.sub(r"\s+", " ", (s or "").strip())
        if len(s) <= limit:
            return s
        cut = s[: limit].rsplit(" ", 1)[0].strip()
        return cut if cut else s[:limit]

    def _build_highlight_text(self, text: str, pattern: str, match) -> str:
        """
        Short, PDF-searchable string: sentence around the regex match (not the full chunk).
        """
        lo, hi = match.start(), match.end()
        start, end = self._sentence_bounds(text, lo, hi)
        snippet = text[start:end].strip()
        snippet = re.sub(r"\s+", " ", snippet)
        if len(snippet) > 250:
            rel = max(0, lo - start)
            window = snippet[max(0, rel - 100) : rel + len(match.group(0)) + 100].strip()
            snippet = re.sub(r"\s+", " ", window)
        if not snippet.strip():
            snippet = match.group(0).strip()
        return self._shorten_highlight(snippet, 250)

    def _dedupe_findings(self, findings: List[Dict]) -> List[Dict]:
        """One flag per key; prefer shorter/clearer citation_quote, then earlier chunk_id."""
        best: Dict[tuple, Dict] = {}
        for f in findings:
            key = self._dedupe_key(f)
            if key not in best:
                best[key] = f
                continue
            cur = best[key]
            if self._prefer_flag_for_dedupe(f, cur):
                best[key] = f
        return list(best.values())

    @staticmethod
    def _citation_len(f: Dict) -> int:
        return len((f.get("citation_quote") or "").strip())

    def _prefer_flag_for_dedupe(self, new: Dict, cur: Dict) -> bool:
        ln, lc = self._citation_len(new), self._citation_len(cur)
        if ln and lc and ln != lc:
            return ln < lc
        if ln and not lc:
            return True
        if lc and not ln:
            return False
        a = new.get("chunk_id") or ""
        b = cur.get("chunk_id") or ""
        if a and b and a < b:
            return True
        if a and not b:
            return True
        return False

    @staticmethod
    def _verbatim_regex_from_phrase(phrase: str) -> Optional[str]:
        parts = [p for p in re.split(r"\s+", (phrase or "").strip()) if p]
        if not parts:
            return None
        return r"\s*".join(re.escape(p) for p in parts)

    def _find_verbatim_in_chunk(self, chunk_text: str, phrase: str) -> str | None:
        """Return a substring of chunk_text matching phrase (exact or whitespace-flexible)."""
        if not chunk_text or not (phrase or "").strip():
            return None
        p = phrase.strip()
        if p in chunk_text:
            i = chunk_text.index(p)
            return chunk_text[i : i + len(p)]
        pat = self._verbatim_regex_from_phrase(p)
        if not pat:
            return None
        m = re.search(pat, chunk_text, flags=re.IGNORECASE | re.DOTALL)
        return m.group(0) if m else None

    def _sentence_quote_containing_match(self, text: str, match) -> str:
        lo, hi = match.start(), match.end()
        start, end = self._sentence_bounds(text, lo, hi)
        return text[start:end].strip()

    def _build_citation_fields(
        self,
        chunk: Dict,
        text: str,
        match,
        highlight_text: str,
        excerpt: str,
    ) -> Dict:
        citation_chunk_id = chunk.get("chunk_id")
        section_ref = (chunk.get("section_ref") or "").strip()
        title = (chunk.get("title") or "").strip()
        citation_section = section_ref or title or ""
        citation_page = chunk.get("page")
        if citation_page is not None:
            try:
                citation_page = int(citation_page)
            except (TypeError, ValueError):
                citation_page = None

        citation_quote = ""
        ht = (highlight_text or "").strip()
        if ht:
            v = self._find_verbatim_in_chunk(text, ht)
            if v:
                citation_quote = v

        if not citation_quote:
            citation_quote = self._sentence_quote_containing_match(text, match)

        if not citation_quote:
            ex = (excerpt or "").strip()
            if ex:
                ve = self._find_verbatim_in_chunk(text, ex)
                if ve:
                    citation_quote = ve

        if not citation_quote:
            citation_quote = match.group(0).strip()

        if len(citation_quote) > 350:
            citation_quote = self._shorten_highlight(citation_quote, 350)

        return {
            "citation_quote": citation_quote,
            "citation_section": citation_section,
            "citation_chunk_id": citation_chunk_id,
            "citation_page": citation_page,
        }

    def _sentence_bounds(self, text: str, pos_lo: int, pos_hi: int) -> Tuple[int, int]:
        """Character span [start:end) covering full sentences that contain the match [pos_lo, pos_hi)."""
        anchor_end = max(pos_hi - 1, pos_lo)
        before = text[:pos_lo]
        start = 0
        for m in re.finditer(r"(?<=[.!?])\s+", before):
            start = m.end()
        sub = text[anchor_end:]
        m_end = re.search(r"[.!?](?:\s+|$)", sub)
        end = anchor_end + m_end.end() if m_end else len(text)
        return start, end

    def _extract_excerpt(self, text: str, pattern: str) -> str:
        match = re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL)
        if not match:
            sents = split_into_sentences(text)
            joined = " ".join(sents[:3]).strip()
            return joined[:500] if joined else ""

        lo, hi = match.start(), match.end()
        start, end = self._sentence_bounds(text, lo, hi)
        excerpt = text[start:end].strip()
        excerpt = re.sub(r"\s+", " ", excerpt)

        # Optional: include one adjacent sentence for context if still short
        if len(excerpt) < 40 and start > 0:
            prev = text[:start].strip()
            if prev:
                pstart, _ = self._sentence_bounds(prev, len(prev) - 1, len(prev))
                excerpt = (prev[pstart:] + " " + excerpt).strip()
                excerpt = re.sub(r"\s+", " ", excerpt)

        if len(excerpt) > 600:
            sents = split_into_sentences(excerpt)
            if not sents:
                return excerpt[:600]
            mloc = max(0, lo - start)
            acc = 0
            mid = 0
            for i, s in enumerate(sents):
                if acc + len(s) >= mloc:
                    mid = i
                    break
                acc += len(s) + 1
            lo_i = max(0, mid - 1)
            hi_i = min(len(sents), mid + 4)
            return re.sub(r"\s+", " ", " ".join(sents[lo_i:hi_i])).strip()[:600]
        return excerpt
