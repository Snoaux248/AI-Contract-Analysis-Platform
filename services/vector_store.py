from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
from typing import List, Dict

import numpy as np

try:
    import faiss
except Exception:
    faiss = None


@dataclass
class RetrievedChunk:
    score: float
    chunk: Dict


class LocalVectorStore:
    """Persist FAISS (or numpy fallback) indexes per contract."""

    def __init__(self, base_dir: Path) -> None:
        self.base_dir = base_dir
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def save_contract(self, contract_id: str, vectors: np.ndarray, chunks: List[Dict], metadata: Dict) -> Dict:
        contract_dir = self.base_dir / contract_id
        contract_dir.mkdir(parents=True, exist_ok=True)

        metadata_payload = {
            "contract_id": contract_id,
            "stats": {"chunk_count": len(chunks), "embedding_dim": int(vectors.shape[1]) if vectors.size else 0},
            "document": metadata,
            "chunks": chunks,
        }
        (contract_dir / "metadata.json").write_text(json.dumps(metadata_payload, indent=2), encoding="utf-8")

        if vectors.size == 0:
            np.save(contract_dir / "vectors.npy", vectors)
            return metadata_payload

        if faiss is not None:
            index = faiss.IndexFlatIP(vectors.shape[1])
            index.add(vectors)
            faiss.write_index(index, str(contract_dir / "index.faiss"))
        else:
            np.save(contract_dir / "vectors.npy", vectors)

        return metadata_payload

    def load_contract(self, contract_id: str) -> Dict:
        contract_dir = self.base_dir / contract_id
        metadata_file = contract_dir / "metadata.json"
        if not metadata_file.exists():
            raise FileNotFoundError("Contract not found. Please process/upload contract first.")
        return json.loads(metadata_file.read_text(encoding="utf-8"))

    def query(self, contract_id: str, query_vector: np.ndarray, top_k: int = 5) -> List[RetrievedChunk]:
        contract_dir = self.base_dir / contract_id
        payload = self.load_contract(contract_id)
        chunks = payload["chunks"]
        if not chunks:
            return []

        if (contract_dir / "index.faiss").exists() and faiss is not None:
            index = faiss.read_index(str(contract_dir / "index.faiss"))
            q = np.array([query_vector], dtype=np.float32)
            scores, indices = index.search(q, min(top_k, len(chunks)))
            results: List[RetrievedChunk] = []
            for score, idx in zip(scores[0], indices[0]):
                if idx < 0:
                    continue
                results.append(RetrievedChunk(score=float(score), chunk=chunks[idx]))
            return results

        vectors = np.load(contract_dir / "vectors.npy")
        sims = vectors @ query_vector
        top_indices = np.argsort(-sims)[: min(top_k, len(chunks))]
        return [RetrievedChunk(score=float(sims[i]), chunk=chunks[int(i)]) for i in top_indices]
