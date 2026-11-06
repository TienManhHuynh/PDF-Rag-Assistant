"""Auth API routes."""
from fastapi import APIRouter
from fastapi import Request, HTTPException
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth, OAuthError
from src.api.config import FRONTEND_URL
from src.api.dependencies import current_user as _current_user
import os

oauth = OAuth()
oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID", ""),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET", ""),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

router = APIRouter(tags=["auth"])


@router.get("/auth/login")
async def login(request: Request):
    """Redirect tới trang đăng nhập Google."""
    redirect_uri = request.url_for("auth_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/auth/callback", name="auth_callback")
async def auth_callback(request: Request):
    """Google redirect về đây sau khi user đăng nhập thành công."""
    try:
        token = await oauth.google.authorize_access_token(request)
    except OAuthError as e:
        raise HTTPException(status_code=400, detail=f"OAuth error: {str(e)}")

    user_info = token.get("userinfo")
    if not user_info:
        raise HTTPException(status_code=400, detail="Không lấy được thông tin user")

    request.session["user"] = {
        "sub":     user_info["sub"],           # Google unique ID
        "email":   user_info["email"],
        "name":    user_info.get("name", ""),
        "picture": user_info.get("picture", ""),
    }
    return RedirectResponse(url=FRONTEND_URL)


@router.get("/auth/logout")
async def logout(request: Request):
    request.session.clear()
    return RedirectResponse(url=FRONTEND_URL)


@router.get("/auth/me")
async def me(request: Request):
    """Trả về thông tin user hiện tại (hoặc null nếu chưa đăng nhập)."""
    user = _current_user(request)
    return {"user": user}
