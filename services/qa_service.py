from __future__ import annotations

import os
from typing import Dict, List

from openai import OpenAI


class QAService:
    """Answer questions grounded strictly in retrieved chunks."""

    SYSTEM_PROMPT = (
        "You are a contract analysis assistant. Use only the provided contract excerpts. "
        "If answer is unavailable, say you cannot find it in the provided text. "
        "Cite section references or chunk IDs when possible."
    )

    def __init__(self) -> None:
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
        self.client = OpenAI(api_key=self.api_key) if self.api_key else None

    def answer(self, question: str, retrieved_chunks: List[Dict]) -> Dict:
        if not retrieved_chunks:
            return {
                "answer": "No relevant contract excerpts were found for this question.",
                "mode": "retrieval-only",
            }

        if self.client is None:
            snippets = []
            for chunk in retrieved_chunks:
                ref = chunk.get("section_ref") or chunk.get("chunk_id")
                snippets.append(f"[{ref}] {chunk.get('text', '')[:300]}")
            return {
                "answer": "LLM API key not configured. Showing best retrieved excerpts instead.\n\n" + "\n\n".join(snippets),
                "mode": "retrieval-only",
            }

        context = "\n\n".join(
            [
                f"Chunk ID: {c.get('chunk_id')}\nTitle: {c.get('title')}\nSection: {c.get('section_ref')}\nText: {c.get('text')}"
                for c in retrieved_chunks
            ]
        )

        user_prompt = (
            f"Question: {question}\n\n"
            "Contract excerpts:\n"
            f"{context}\n\n"
            "Return a concise answer grounded only in these excerpts."
        )

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.1,
        )
        return {
            "answer": response.choices[0].message.content.strip(),
            "mode": "llm",
        }
