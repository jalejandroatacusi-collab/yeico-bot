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