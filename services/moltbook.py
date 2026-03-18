import os
import httpx
import json
import time

MOLTBOOK_URL = os.getenv("MOLTBOOK_URL", "https://superdapp.ai/moltbook")

class MoltbookService:
    def __init__(self):
        self._local_log: list[dict] = []  # Fallback local log

    def is_available(self) -> bool:
        """Dependency check: can we reach Moltbook?"""
        try:
            r = httpx.get(MOLTBOOK_URL, timeout=5.0)
            return r.status_code < 500
        except Exception:
            # If Moltbook is unreachable, we still operate (log locally)
            return True  # Non-critical dependency

    async def log(self, event: dict) -> dict:
        """
        Log event to Moltbook. Falls back to local log if unavailable.
        """
        event["logged_at"] = int(time.time())

        # Always save locally first
        self._local_log.append(event)
        print(f"[MOLTBOOK] {event.get('event')} | dog={event.get('dog_id')} | ts={event.get('timestamp')}")

        # Try to push to Moltbook
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.post(
                    f"{MOLTBOOK_URL}/log",
                    json=event,
                    headers={"Content-Type": "application/json"},
                )
                if r.status_code == 200:
                    return {"ok": True, "remote": True}
        except Exception as e:
            print(f"[MOLTBOOK] Remote log failed (using local): {e}")

        return {"ok": True, "remote": False, "local": True}

    def get_local_log(self) -> list[dict]:
        return self._local_log.copy()
