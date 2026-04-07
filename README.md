# AI Contract Analysis Platform (Flask MVP)

This project is a local, demo-ready MVP for AI-assisted contract review.

## What was built
- Flask app with existing blueprint routing preserved under `/Capstone`.
- Upload and process flow for `.pdf`, `.docx`, `.txt` contracts.
- Document parsing + whitespace normalization.
- Hybrid chunking:
  - first pass by legal-style headings/section patterns
  - fallback sliding-window chunking with overlap
- Embeddings:
  - local `sentence-transformers` model (`all-MiniLM-L6-v2`) by default
  - deterministic local fallback vector mode if model init fails
- Vector search:
  - local FAISS index persistence per contract
  - numpy similarity fallback if FAISS unavailable
- Question answering:
  - semantic retrieval + top chunk context
  - OpenAI grounded synthesis if `OPENAI_API_KEY` is set
  - retrieval-only fallback otherwise
- Red flag engine:
  - rule-based detection for common risky clauses
  - severity and explanation per finding
- Frontend MVP (`project.html`) with upload, processing status, Q&A, supporting chunks, and red flag panel.

## Project structure
- `app.py`
- `views.py`
- `services/`
  - `contract_service.py`
  - `document_parser.py`
  - `chunking.py`
  - `embedding_service.py`
  - `vector_store.py`
  - `qa_service.py`
  - `redflag_service.py`
- `templates/project.html`
- `static/css/project.css`
- `static/js/project.js`
- `uploads/`
- `vector_store/`
- `tests/manual_validation.py`
- `requirements.txt`
- `.env.example`

## Run locally
1. Create virtual environment
   - `python -m venv .venv`
   - `.\.venv\Scripts\Activate.ps1`
2. Install dependencies:
   - `pip install -r requirements.txt`
3. Optional env setup:
   - `copy .env.example .env`
   - add `OPENAI_API_KEY` if you want LLM synthesis answers
4. Start app:
   - `python app.py`
5. Open:
   - `http://127.0.0.1:8001/Capstone/Project/`

## API quick examples
Upload contract:
```bash
curl -X POST http://127.0.0.1:8001/Capstone/api/upload -F "file=@sample_contract.pdf"
```

Ask question:
```bash
curl -X POST http://127.0.0.1:8001/Capstone/api/ask \
  -H "Content-Type: application/json" \
  -d "{\"contract_id\":\"ctr_xxx\",\"question\":\"What is the termination notice period?\"}"
```

Analyze red flags:
```bash
curl -X POST http://127.0.0.1:8001/Capstone/api/redflags \
  -H "Content-Type: application/json" \
  -d "{\"contract_id\":\"ctr_xxx\"}"
```

Get contract summary:
```bash
curl http://127.0.0.1:8001/Capstone/api/contract/ctr_xxx
```

## Assumptions
- Focus is demo MVP reliability over enterprise architecture.
- Single-process local app, local file storage/index.
- LLM usage is optional; retrieval-only answers still function without API keys.
