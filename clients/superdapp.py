import os
import httpx
from fastapi import APIRouter, Request, HTTPException

AGENT_API_URL = os.getenv("AGENT_API_URL", "http://localhost:8000")
MOLTBOOK_URL = os.getenv("MOLTBOOK_URL", "https://superdapp.ai/moltbook")

router = APIRouter(prefix="/superdapp", tags=["superdapp"])

@router.post("/webhook")
async def superdapp_webhook(request: Request):
    """Receive events from SuperDapp, forward to agent."""
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # Normalize SuperDapp payload to YEICO event format
    event = normalize_superdapp_event(body)
    if not event:
        raise HTTPException(status_code=422, detail="Unrecognized SuperDapp event format")

    # Forward to agent
    result = await forward_to_agent(event)
    return result


def normalize_superdapp_event(body: dict) -> dict | None:
    """
    Map SuperDapp payload to YEICO event format.
    Adjust field names as needed when SuperDapp schema is finalized.
    """
    event_type = body.get("event_type") or body.get("type")
    if not event_type:
        return None

    return {
        "type": str(event_type).upper(),
        "dog_id": body.get("dog_id"),
        "wallet": body.get("wallet") or body.get("sender"),
        "image": body.get("image") or body.get("ipfs_hash"),
        "metadata": body.get("metadata") or body.get("data") or {},
        "source": "superdapp",
    }


async def forward_to_agent(event: dict) -> dict:
    try:
        async with httpx.AsyncClient(timeout=15.0) as http:
            r = await http.post(f"{AGENT_API_URL}/event", json=event)
            return r.json()
    except Exception as e:
        return {"decision": "error", "reason": f"Agent unreachable: {str(e)}"}
