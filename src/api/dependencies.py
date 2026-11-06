"""Session access shared by authenticated routes."""
from fastapi import Request


def current_user(request: Request) -> dict | None:
    return request.session.get("user")
