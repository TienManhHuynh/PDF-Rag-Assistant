"""History file locations, restricted to a user's storage directory."""
from pathlib import Path
from fastapi import HTTPException
from src.api.config import HISTORY_ROOT


def _safe_segment(value: str) -> str:
    if not value or value in {".", ".."} or any(c in value for c in '/\\:'):
        raise HTTPException(status_code=400, detail="ID không hợp lệ")
    return value


def user_dir(user_sub: str) -> Path:
    directory = HISTORY_ROOT / _safe_segment(user_sub)
    directory.mkdir(parents=True, exist_ok=True)
    return directory


def session_path(user_sub: str, session_id: str) -> Path:
    return user_dir(user_sub) / f"{_safe_segment(session_id)}.json"
