from __future__ import annotations

from pathlib import Path

from flask import Blueprint, jsonify, render_template, request

from services.contract_service import ContractService
from services.qa_service import QAService
from services.redflag_service import RedFlagService
from services.whiteflag_service import WhiteFlagService

views = Blueprint(__name__, "views")
BASE_DIR = Path(__file__).resolve().parent
contract_service = ContractService(BASE_DIR / "uploads", BASE_DIR / "vector_store")
qa_service = QAService()
redflag_service = RedFlagService()
whiteflag_service = WhiteFlagService()


@views.route("/Project/")
def homeS():
    return render_template("project.html", key="")

@views.route("/Project/UI/")
def home2():
    return render_template("projectUI.html", key="")


@views.route("/Project/project")
def SearchPage_URL():
    args = request.args
    search = args.get("key")
    return render_template("project.html", key=search)


@views.route("/api/upload", methods=["POST"])
def upload_contract():
    try:
        file = request.files.get("file")
        result = contract_service.process_upload(file)
        return jsonify(
            {
                "success": True,
                "contract_id": result.contract_id,
                "filename": result.filename,
                "stats": result.stats,
            }
        )
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 400


@views.route("/api/ask", methods=["POST"])
def ask_question():
    try:
        payload = request.get_json(force=True)
        contract_id = payload.get("contract_id")
        question = (payload.get("question") or "").strip()
        if not contract_id:
            raise ValueError("contract_id is required")
        if not question:
            raise ValueError("question is required")

        query_vector = contract_service.embedding.embed_query(question)
        retrieved = contract_service.store.query(contract_id, query_vector, top_k=5)
        chunk_data = [{**item.chunk, "score": item.score} for item in retrieved]
        answer_payload = qa_service.answer(question=question, retrieved_chunks=chunk_data)

        return jsonify(
            {
                "success": True,
                "contract_id": contract_id,
                "question": question,
                "answer": answer_payload["answer"],
                "mode": answer_payload["mode"],
                "retrieved_chunks": chunk_data,
            }
        )
    except FileNotFoundError as exc:
        return jsonify({"success": False, "error": str(exc)}), 404
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 400


@views.route("/api/redflags", methods=["POST"])
def analyze_redflags():
    try:
        payload = request.get_json(force=True)
        contract_id = payload.get("contract_id")
        if not contract_id:
            raise ValueError("contract_id is required")

        contract_payload = contract_service.store.load_contract(contract_id)
        chunks = contract_payload.get("chunks", [])
        flags = redflag_service.analyze(chunks)

        def semantic_search(query: str, top_k: int = 4):
            query_vector = contract_service.embedding.embed_query(query)
            results = contract_service.store.query(contract_id, query_vector, top_k=top_k)
            return [{"score": r.score, "chunk": r.chunk} for r in results]

        white_flags = whiteflag_service.detect_white_flags(chunks, embedding_index=semantic_search)

        return jsonify(
            {
                "success": True,
                "contract_id": contract_id,
                "red_flags": flags,
                "white_flags": white_flags,
            }
        )
    except FileNotFoundError as exc:
        return jsonify({"success": False, "error": str(exc)}), 404
    except Exception as exc:
        return jsonify({"success": False, "error": str(exc)}), 400


@views.route("/api/contract/<contract_id>", methods=["GET"])
def get_contract(contract_id: str):
    try:
        payload = contract_service.store.load_contract(contract_id)
        return jsonify(
            {
                "success": True,
                "contract_id": contract_id,
                "document": payload.get("document", {}),
                "stats": payload.get("stats", {}),
                "chunk_summary": [
                    {
                        "chunk_id": c.get("chunk_id"),
                        "title": c.get("title"),
                        "section_ref": c.get("section_ref"),
                    }
                    for c in payload.get("chunks", [])
                ],
            }
        )
    except FileNotFoundError as exc:
        return jsonify({"success": False, "error": str(exc)}), 404
