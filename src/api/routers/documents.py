"""Documents API routes."""
from fastapi import APIRouter
from fastapi import UploadFile, File, Form, HTTPException
import os
import tempfile
import traceback
from src.api.schemas import UploadResponse, SummarizeRequest, SummarizeResponse, ExplainRequest, ExplainResponse
from src.pipeline.retriever import add_chunks_to_workspace, get_full_text_by_file, list_files_in_workspace, search_workspace

router = APIRouter(tags=["documents"])


@router.post("/api/upload", response_model=UploadResponse)
async def upload_pdf(
    file: UploadFile = File(...),
    workspace_name: str = Form(...)
):
    tmp_path = ""
    try:
        from src.data.parser import process_pdf
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        chunks = process_pdf(tmp_path, workspace_name)
        if not chunks:
            raise ValueError("Không thể trích xuất nội dung từ PDF.")

        real_filename = file.filename
        for c in chunks:
            if "metadata" in c:
                c["metadata"]["file_name"] = real_filename

        add_chunks_to_workspace(workspace_name, chunks)
        page_count = max([c["metadata"].get("page", 1) for c in chunks])

        return UploadResponse(
            file_name=real_filename,
            workspace_name=workspace_name,
            chunk_count=len(chunks),
            page_count=page_count,
            status="success"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload lỗi: {str(e)}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


@router.post("/api/summarize", response_model=SummarizeResponse)
async def summarize(body: SummarizeRequest):
    try:
        # Trường hợp 1: Frontend truyền cụ thể tên file cần tóm tắt
        if body.file_name and body.file_name.strip():
            full_text = get_full_text_by_file(body.file_name, body.workspace_name)
            if not full_text.strip():
                raise HTTPException(status_code=404, detail=f"Không tìm thấy dữ liệu hoặc file '{body.file_name}' rỗng.")

        # Trường hợp 2: Frontend KHÔNG truyền file_name (bấm nút chung ở topbar)
        else:
            # Lấy danh sách toàn bộ file trong workspace bằng hàm có sẵn của Phi
            all_files = list_files_in_workspace(body.workspace_name)
            if not all_files:
                raise HTTPException(status_code=404, detail=f"Workspace '{body.workspace_name}' chưa có file nào để tóm tắt.")

            # Quét qua từng file để lấy text và gộp lại
            text_segments = []
            for fname in all_files:
                f_text = get_full_text_by_file(fname, body.workspace_name)
                if f_text.strip():
                    text_segments.append(f"--- NỘI DUNG FILE: {fname} ---\n{f_text}")

            full_text = "\n\n".join(text_segments)

        # Kiểm tra cuối cùng xem tổng lượng text thu được có bị rỗng không
        if not full_text.strip():
            raise HTTPException(status_code=400, detail="Không thu thập được nội dung văn bản nào để tóm tắt.")

        # Gọi hàm xử lý truyền chuỗi văn bản thuần sang cho Tiến xử lý với Gemini
        from src.models.llm_generator import summarize_doc
        result = summarize_doc(full_text)
        return SummarizeResponse(**result)

    except HTTPException as he:
        raise he
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/explain", response_model=ExplainResponse)
async def explain(body: ExplainRequest):
    try:
        from src.models.llm_generator import explain_term
        chunks = search_workspace(body.term, body.workspace_name, top_k=3)
        result = explain_term(body.term, chunks)
        return ExplainResponse(
            explanation=result.get("answer", "Không có nội dung"),
            citations=result.get("citations", []),
            model=result.get("model", "unknown")
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
