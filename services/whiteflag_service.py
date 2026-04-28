from __future__ import annotations

import re
from typing import Callable, Dict, List, Optional


WHITE_FLAG_RULES: List[Dict] = [
    {
        "id": "missing_indemnification",
        "title": "Missing indemnification clause",
        "expected_clause": "Indemnification",
        "description": "Contract should define responsibility for third-party claims, losses, or damages.",
        "search_queries": [
            "indemnification",
            "hold harmless",
            "defend against claims",
            "third party liability",
            "legal fees damages claims",
        ],
        "severity": "medium",
    },
    {
        "id": "missing_limitation_of_liability",
        "title": "Missing limitation of liability clause",
        "expected_clause": "Limitation of Liability",
        "description": "Contract should cap or clearly define liability exposure.",
        "search_queries": [
            "limitation of liability",
            "liability cap",
            "maximum liability",
            "consequential damages excluded",
        ],
        "severity": "high",
    },
    {
        "id": "missing_governing_law",
        "title": "Missing governing law clause",
        "expected_clause": "Governing Law",
        "description": "Contract should specify which jurisdiction's laws apply.",
        "search_queries": ["governing law", "jurisdiction", "laws of state", "venue", "legal jurisdiction"],
        "severity": "low",
    },
    {
        "id": "missing_dispute_resolution",
        "title": "Missing dispute resolution clause",
        "expected_clause": "Dispute Resolution",
        "description": "Contract should define how disputes are resolved (court, arbitration, mediation).",
        "search_queries": ["dispute resolution", "binding arbitration", "mediation", "forum", "dispute process"],
        "severity": "medium",
    },
    {
        "id": "missing_confidentiality",
        "title": "Missing confidentiality clause",
        "expected_clause": "Confidentiality",
        "description": "Contract should protect confidential information and set permitted disclosure terms.",
        "search_queries": ["confidential information", "non disclosure", "nda", "protect confidential", "disclosure"],
        "severity": "medium",
    },
    {
        "id": "missing_termination",
        "title": "Missing termination clause",
        "expected_clause": "Termination",
        "description": "Contract should define termination rights, notice, and post-termination obligations.",
        "search_queries": ["termination", "terminate agreement", "termination for cause", "termination notice"],
        "severity": "medium",
    },
    {
        "id": "missing_payment_terms",
        "title": "Missing payment terms clause",
        "expected_clause": "Payment Terms",
        "description": "Contract should define payment timing, method, and late-payment handling.",
        "search_queries": ["payment terms", "invoice due", "late fee", "net 30", "payment schedule"],
        "severity": "high",
    },
    {
        "id": "missing_intellectual_property",
        "title": "Missing intellectual property clause",
        "expected_clause": "Intellectual Property",
        "description": "Contract should define ownership and licensing of intellectual property.",
        "search_queries": ["intellectual property", "ip ownership", "license grant", "ownership rights", "work product"],
        "severity": "high",
    },
    {
        "id": "missing_warranty_disclaimer",
        "title": "Missing warranties/disclaimer clause",
        "expected_clause": "Warranties and Disclaimers",
        "description": "Contract should define warranties and any disclaimer of implied warranties.",
        "search_queries": ["warranty", "disclaimer", "as is", "merchantability", "fitness for purpose"],
        "severity": "medium",
    },
    {
        "id": "missing_force_majeure",
        "title": "Missing force majeure clause",
        "expected_clause": "Force Majeure",
        "description": "Contract should address performance delays caused by events beyond control.",
        "search_queries": ["force majeure", "acts of god", "beyond reasonable control", "unforeseeable event"],
        "severity": "low",
    },
    {
        "id": "missing_notice_clause",
        "title": "Missing notice clause",
        "expected_clause": "Notice",
        "description": "Contract should define how formal notices must be delivered.",
        "search_queries": ["notice", "written notice", "delivery of notice", "notice address", "notice period"],
        "severity": "low",
    },
    {
        "id": "missing_entire_agreement",
        "title": "Missing entire agreement clause",
        "expected_clause": "Entire Agreement",
        "description": "Contract should state that it supersedes prior discussions and agreements.",
        "search_queries": ["entire agreement", "supersedes prior", "complete agreement", "integration clause"],
        "severity": "low",
    },
    {
        "id": "missing_amendment_clause",
        "title": "Missing amendment clause",
        "expected_clause": "Amendments",
        "description": "Contract should define how changes or modifications become effective.",
        "search_queries": ["amendment", "modified only in writing", "change order", "written modification"],
        "severity": "low",
    },
    {
        "id": "missing_severability",
        "title": "Missing severability clause",
        "expected_clause": "Severability",
        "description": "Contract should preserve enforceability if one provision is invalid.",
        "search_queries": ["severability", "invalid provision", "unenforceable provision", "remaining provisions"],
        "severity": "low",
    },
    {
        "id": "missing_data_privacy",
        "title": "Missing data/privacy clause",
        "expected_clause": "Data Protection and Privacy",
        "description": "Contract should address personal data handling, security, and compliance obligations.",
        "search_queries": ["data protection", "privacy", "personal data", "data security", "gdpr", "ccpa"],
        "severity": "medium",
    },
]


class WhiteFlagService:
    """Detect expected clauses that appear missing or weak."""

    LOW_THRESHOLD = 0.17
    MEDIUM_THRESHOLD = 0.30

    @staticmethod
    def _normalize(text: str) -> str:
        return re.sub(r"\s+", " ", (text or "").lower()).strip()

    @staticmethod
    def _snippet(text: str, max_chars: int = 260) -> str:
        t = re.sub(r"\s+", " ", (text or "")).strip()
        if len(t) <= max_chars:
            return t
        cut = t[:max_chars].rsplit(" ", 1)[0].strip()
        return cut if cut else t[:max_chars]

    def _keyword_score(self, chunk_text: str, query: str) -> float:
        cn = self._normalize(chunk_text)
        qn = self._normalize(query)
        if not cn or not qn:
            return 0.0
        if qn in cn:
            return 0.65
        qwords = [w for w in qn.split(" ") if len(w) > 2]
        if not qwords:
            return 0.0
        hits = sum(1 for w in qwords if w in cn)
        return min(0.6, hits / max(1, len(qwords)))

    def _search_best(
        self,
        rule: Dict,
        chunks: List[Dict],
        embedding_index: Optional[Callable[[str, int], List[Dict]]],
    ) -> Dict:
        best_score = -1.0
        best_chunk = None
        best_snippet = None

        for query in rule["search_queries"]:
            if embedding_index is not None:
                try:
                    results = embedding_index(query, 4) or []
                except Exception:
                    results = []
                for item in results:
                    score = float(item.get("score", 0.0))
                    chunk = item.get("chunk") or {}
                    text = chunk.get("text", "")
                    if score > best_score:
                        best_score = score
                        best_chunk = chunk
                        best_snippet = self._snippet(text, 280)

            for chunk in chunks:
                text = chunk.get("text", "")
                score = self._keyword_score(text, query)
                if score > best_score:
                    best_score = score
                    best_chunk = chunk
                    best_snippet = self._snippet(text, 280)

        return {"best_score": best_score, "best_chunk": best_chunk, "best_text_snippet": best_snippet}

    def detect_white_flags(
        self, chunks: List[Dict], embedding_index: Optional[Callable[[str, int], List[Dict]]] = None
    ) -> List[Dict]:
        if not chunks:
            return []

        findings: Dict[str, Dict] = {}
        for rule in WHITE_FLAG_RULES:
            match = self._search_best(rule, chunks, embedding_index)
            best_score = match["best_score"]
            best_chunk = match["best_chunk"]
            best_snippet = match["best_text_snippet"]

            if best_score < self.LOW_THRESHOLD:
                status = "missing"
                confidence = "high"
            elif best_score < self.MEDIUM_THRESHOLD:
                status = "weak"
                confidence = "medium"
            else:
                continue

            findings[rule["id"]] = {
                "id": rule["id"],
                "title": rule["title"],
                "severity": rule["severity"],
                "status": status,
                "confidence": confidence,
                "expected_clause": rule["expected_clause"],
                "explanation": rule["description"],
                "searched_for": list(rule["search_queries"]),
                "best_match": best_snippet if status == "weak" else (best_snippet if best_score > 0 else None),
                "chunk_id": (best_chunk or {}).get("chunk_id"),
                "recommendation": "Add or strengthen this clause to clarify obligations and reduce risk.",
            }

        return list(findings.values())
