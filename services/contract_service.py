from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import uuid
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from services.chunking import ContractChunker
from services.document_parser import DocumentParser
from services.embedding_service import EmbeddingService
from services.vector_store import LocalVectorStore


@dataclass
class ProcessResult:
    contract_id: str
    filename: str
    stats: dict


class ContractService:
    """Coordinate parsing, chunking, embedding, and storage."""

    def __init__(self, upload_dir: Path, vector_dir: Path):
        self.upload_dir = upload_dir
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.parser = DocumentParser()
        self.chunker = ContractChunker()
        self.embedding = EmbeddingService()
        self.store = LocalVectorStore(vector_dir)

    def process_upload(self, file: FileStorage) -> ProcessResult:
        if file is None or not file.filename:
            raise ValueError("No file provided")

        filename = secure_filename(file.filename)
        suffix = Path(filename).suffix.lower()
        if suffix not in self.parser.SUPPORTED_EXTENSIONS:
            raise ValueError("Unsupported file type. Allowed: PDF, DOCX, TXT")

        contract_id = f"ctr_{uuid.uuid4().hex[:12]}"
        target = self.upload_dir / f"{contract_id}_{filename}"
        file.save(target)

        parsed = self.parser.parse(target)
        chunks = self.chunker.chunk(parsed.text)
        vectors = self.embedding.embed_texts([c.text for c in chunks])
        payload = self.store.save_contract(
            contract_id=contract_id,
            vectors=vectors,
            chunks=[c.to_dict() for c in chunks],
            metadata={**parsed.metadata, "source_path": str(target)},
        )

        return ProcessResult(
            contract_id=contract_id,
            filename=filename,
            stats={
                "chunk_count": len(chunks),
                "text_length": len(parsed.text),
                "embedding_dim": payload["stats"]["embedding_dim"],
            },
        )
