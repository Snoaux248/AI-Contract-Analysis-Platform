from __future__ import annotations

import re
from typing import Dict, List


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
            for rule in self.RULES:
                for pattern in rule["patterns"]:
                    if re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL):
                        excerpt = self._extract_excerpt(text, pattern)
                        findings.append(
                            {
                                "title": rule["title"],
                                "chunk_id": chunk.get("chunk_id"),
                                "section_ref": chunk.get("section_ref"),
                                "category": rule["category"],
                                "severity": rule["severity"],
                                "excerpt": excerpt,
                                "explanation": rule["explanation"],
                            }
                        )
                        break

        unique = {(f["category"], f["chunk_id"]): f for f in findings}
        return list(unique.values())

    def _extract_excerpt(self, text: str, pattern: str) -> str:
        match = re.search(pattern, text, flags=re.IGNORECASE | re.DOTALL)
        if not match:
            return text[:260]
        start = max(0, match.start() - 80)
        end = min(len(text), match.end() + 140)
        return text[start:end].strip()
