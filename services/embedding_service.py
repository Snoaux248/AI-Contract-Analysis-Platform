from __future__ import annotations

import hashlib
from typing import List

import numpy as np
from sentence_transformers import SentenceTransformer


class EmbeddingService:
    """Generate embeddings using local model with deterministic fallback."""

    def __init__(self, model_name: str = "all-MiniLM-L6-v2") -> None:
        self.model = None
        self.dim = 384
        try:
            self.model = SentenceTransformer(model_name)
            self.dim = int(self.model.get_sentence_embedding_dimension())
        except Exception:
            self.model = None

    def embed_texts(self, texts: List[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, self.dim), dtype=np.float32)

        if self.model is not None:
            vecs = self.model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
            return vecs.astype(np.float32)

        return np.vstack([self._hash_embedding(text) for text in texts]).astype(np.float32)

    def embed_query(self, text: str) -> np.ndarray:
        return self.embed_texts([text])[0]

    def _hash_embedding(self, text: str) -> np.ndarray:
        digest = hashlib.sha256(text.encode("utf-8", errors="ignore")).digest()
        seed = int.from_bytes(digest[:8], byteorder="little", signed=False)
        rng = np.random.default_rng(seed)
        vector = rng.standard_normal(self.dim)
        norm = np.linalg.norm(vector)
        if norm == 0:
            return vector.astype(np.float32)
        return (vector / norm).astype(np.float32)
