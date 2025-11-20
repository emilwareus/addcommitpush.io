"""File-based state storage."""
import json
from datetime import datetime
from pathlib import Path
from typing import Any


class FileStore:
    """Simple JSON file store."""

    def __init__(self, base_path: str = "outputs/sessions") -> None:
        self.base_path = Path(base_path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def save_session(self, session_id: str, data: dict[str, Any]) -> None:
        """Save session data."""
        path = self.base_path / f"{session_id}.json"

        data["saved_at"] = datetime.now().isoformat()

        with open(path, "w") as f:
            json.dump(data, f, indent=2)

    def load_session(self, session_id: str) -> dict[str, Any]:
        """Load session data."""
        path = self.base_path / f"{session_id}.json"

        with open(path) as f:
            result: dict[str, Any] = json.load(f)
            return result

    def list_sessions(self) -> list[str]:
        """List all session IDs."""
        return [p.stem for p in self.base_path.glob("*.json")]
