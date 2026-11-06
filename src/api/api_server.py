"""Application composition. Run: uvicorn src.api.api_server:app --reload."""
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware

from src.api.config import FRONTEND_DIR, SECRET_KEY
from src.api.routers import auth, chat, documents, history, workspaces

app = FastAPI(title="PDF RAG Chatbot API", version="3.0.0")
app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)

for router in (auth.router, history.router, workspaces.router, documents.router, chat.router):
    app.include_router(router)

app.mount("/assets", StaticFiles(directory=FRONTEND_DIR / "assets"), name="assets")


@app.get("/health")
async def health_check():
    return {"status": "ok", "version": "3.0.0"}


@app.get("/", include_in_schema=False)
async def serve_frontend():
    return FileResponse(FRONTEND_DIR / "index.html")
