"""Manual validation checks for MVP pipeline.
Run: python tests/manual_validation.py
"""

from services.chunking import ContractChunker
from services.embedding_service import EmbeddingService
from services.redflag_service import RedFlagService


def run_validation() -> None:
    sample = """
    SECTION 1 Term
    This agreement starts today and automatically renews each year.

    SECTION 2 Termination
    Company may terminate this agreement at any time in its sole discretion.

    SECTION 3 Liability
    The vendor has unlimited liability for all losses.
    """

    chunker = ContractChunker()
    chunks = chunker.chunk(sample)
    print(f"Chunks created: {len(chunks)}")

    embedding = EmbeddingService()
    vectors = embedding.embed_texts([c.text for c in chunks])
    print(f"Embeddings shape: {vectors.shape}")

    redflags = RedFlagService().analyze([c.to_dict() for c in chunks])
    print(f"Red flags detected: {len(redflags)}")
    for flag in redflags:
        print(f"- {flag['severity'].upper()}: {flag['title']} ({flag['chunk_id']})")


if __name__ == "__main__":
    run_validation()
