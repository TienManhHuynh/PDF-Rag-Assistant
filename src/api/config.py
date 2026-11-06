"""Load environment before configuring authentication or storage."""
import os
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")
FRONTEND_DIR = PROJECT_ROOT / "frontend"
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:8000")
SECRET_KEY = os.getenv("SESSION_SECRET", "change-me-to-a-random-secret-32chars")
HISTORY_ROOT = Path(os.getenv("CHAT_HISTORY_DIR", str(PROJECT_ROOT / "chat_history")))
