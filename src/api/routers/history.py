"""History API routes."""
from fastapi import APIRouter
from fastapi import Request, HTTPException
from typing import List
from datetime import datetime
import json
import uuid
from src.api.dependencies import current_user as _current_user
from src.api.history_store import user_dir as _user_dir, session_path as _session_path
from src.api.schemas import HistoryMessage, ChatSession, SessionCreate, SaveMessagesRequest

router = APIRouter(tags=["history"])


@router.get("/api/history/sessions", response_model=List[dict])
async def list_sessions(request: Request):
    """Liệt kê tất cả chat session của user hiện tại."""
    user = _current_user(request)
    if not user:
        return []   # chưa đăng nhập → trả list rỗng (không lỗi)

    d = _user_dir(user["sub"])
    sessions = []
    for f in sorted(d.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            sessions.append({
                "session_id":     data["session_id"],
                "title":          data.get("title", "Cuộc hội thoại"),
                "workspace_name": data.get("workspace_name", ""),
                "created_at":     data.get("created_at", ""),
                "updated_at":     data.get("updated_at", ""),
                "message_count":  len(data.get("messages", [])),
            })
        except Exception:
            pass
    return sessions


@router.post("/api/history/sessions", response_model=ChatSession, status_code=201)
async def create_session(body: SessionCreate, request: Request):
    """Tạo một chat session mới."""
    user = _current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Chưa đăng nhập")

    now = datetime.utcnow().isoformat()
    session = ChatSession(
        session_id=uuid.uuid4().hex,
        title=body.title or "Cuộc hội thoại mới",
        workspace_name=body.workspace_name,
        created_at=now,
        updated_at=now,
        messages=[],
    )
    _session_path(user["sub"], session.session_id).write_text(
        session.model_dump_json(indent=2), encoding="utf-8"
    )
    return session


@router.get("/api/history/sessions/{session_id}", response_model=ChatSession)
async def get_session(session_id: str, request: Request):
    """Lấy toàn bộ messages của một session."""
    user = _current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Chưa đăng nhập")

    p = _session_path(user["sub"], session_id)
    if not p.exists():
        raise HTTPException(status_code=404, detail="Session không tồn tại")
    return json.loads(p.read_text(encoding="utf-8"))


@router.put("/api/history/sessions/{session_id}")
async def save_session(session_id: str, body: SaveMessagesRequest, request: Request):
    """Cập nhật messages (và tuỳ chọn title) cho một session."""
    user = _current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Chưa đăng nhập")

    p = _session_path(user["sub"], session_id)
    if not p.exists():
        raise HTTPException(status_code=404, detail="Session không tồn tại")

    data = json.loads(p.read_text(encoding="utf-8"))
    data["messages"] = [m.model_dump() for m in body.messages]
    data["updated_at"] = datetime.utcnow().isoformat()
    if body.title:
        data["title"] = body.title
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"status": "ok"}


@router.delete("/api/history/sessions/{session_id}", status_code=204)
async def delete_session(session_id: str, request: Request):
    """Xóa một chat session."""
    user = _current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Chưa đăng nhập")

    p = _session_path(user["sub"], session_id)
    if p.exists():
        p.unlink()
