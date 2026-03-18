import os
import asyncio
import threading
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional

from core.agent import YeicoAgent
from clients.discord import run_discord_bot

app = FastAPI() 

@app.get("/")
async def health_check():
    return {"status": "Yeico Agent Online", "port": os.environ.get("PORT", 8080)}

def start_discord():
    asyncio.run(run_discord_bot())

if __name__ == "__main__":
    threading.Thread(target=start_discord, daemon=True).start()
    
    port = int(os.environ.get("PORT", 8080)) 
    uvicorn.run(app, host="0.0.0.0", port=port)