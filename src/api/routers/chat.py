"""Chat API routes."""
from fastapi import APIRouter
from fastapi import HTTPException
import traceback
from src.api.schemas import ChatRequest, ChatResponse, WebChatRequest, WebChatResponse
from src.pipeline.retriever import search_workspace

router = APIRouter(tags=["chat"])


@router.post("/api/chat", response_model=ChatResponse)
async def chat(body: ChatRequest):
    try:
        from src.models.llm_generator import generate_cited_answer
        chunks = search_workspace(body.question, body.workspace_name, body.top_k)
        result = generate_cited_answer(body.question, chunks)
        return ChatResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/chat/web", response_model=WebChatResponse)
async def chat_web(body: WebChatRequest):
    """
    Agentic RAG: tìm trong tài liệu + search web, tổng hợp thành câu trả lời duy nhất.
    Cần set trong .env:
        GOOGLE_SEARCH_API_KEY=...
        GOOGLE_SEARCH_CX=...         (Custom Search Engine ID)
    """
    try:
        from src.models.llm_generator import generate_web_search_answer
        # 1. Lấy chunks từ tài liệu (vẫn dùng RAG)
        doc_chunks = []
        try:
            doc_chunks = search_workspace(body.question, body.workspace_name, body.top_k)
        except Exception:
            pass  # workspace có thể rỗng, không sao

        # 2. Gọi hàm tổng hợp web + tài liệu
        result = await generate_web_search_answer(body.question, doc_chunks)
        return WebChatResponse(**result)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
