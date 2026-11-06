"""Request and response contracts shared by API routers."""
from typing import List, Optional
from pydantic import BaseModel, Field


class HistoryMessage(BaseModel):
    role: str        # "user" | "assistant"
    content: str
    citations: List[dict] = Field(default_factory=list)
    web_results: List[dict] = Field(default_factory=list)
    is_web: bool = False
    timestamp: Optional[str] = None


class ChatSession(BaseModel):
    session_id: str
    title: str
    workspace_name: str
    created_at: str
    updated_at: str
    messages: List[HistoryMessage] = Field(default_factory=list)


class SessionCreate(BaseModel):
    workspace_name: str
    title: Optional[str] = "Cuộc hội thoại mới"


class SaveMessagesRequest(BaseModel):
    session_id: str
    messages: List[HistoryMessage]
    title: Optional[str] = None   # cập nhật tiêu đề nếu truyền


class WorkspaceCreate(BaseModel):
    name: str


class WorkspaceInfo(BaseModel):
    name: str
    file_count: int


class ChatRequest(BaseModel):
    question: str
    workspace_name: str
    top_k: int = 5


class WebChatRequest(BaseModel):
    question: str
    workspace_name: str
    top_k: int = 5


class Citation(BaseModel):
    file_name: str
    page: int
    heading: str
    snippet: str


class ChatResponse(BaseModel):
    answer: str
    citations: List[Citation]
    model: str


class WebChatResponse(BaseModel):
    answer: str
    citations: List[Citation]
    web_results: List[dict]   # kết quả web thô để frontend hiển thị
    model: str


class SummarizeRequest(BaseModel):
    workspace_name: str
    file_name: Optional[str] = None


class SummarizeResponse(BaseModel):
    summary: str
    model: str


class ExplainRequest(BaseModel):
    term: str
    workspace_name: str


class ExplainResponse(BaseModel):
    explanation: str
    citations: List[Citation]
    model: str


class UploadResponse(BaseModel):
    file_name: str
    workspace_name: str
    chunk_count: int
    page_count: int
    status: str
