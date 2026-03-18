import os
import asyncio
import threading
import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any

from core.agent import YeicoAgent
from clients.discord import run_discord_bot

# --- NUEVO: Modelo para recibir los eventos del bot ---
class EventRequest(BaseModel):
    type: str
    payload: Dict[str, Any]

# 1. Configuración de FastAPI
app = FastAPI(title="Yeico Agent API")

@app.on_event("startup")
async def startup_event():
    print("--- [SISTEMA] Iniciando hilo de Discord desde Startup ---")
    thread = threading.Thread(target=start_discord, daemon=True)
    thread.start()

@app.get("/")
async def health_check():
    """Ruta para que Railway sepa que la app está viva"""
    return {
        "status": "Yeico Agent Online",
        "port": os.environ.get("PORT", "8080"),
        "environment": "Railway"
    }

# --- Endpoint para manejar eventos del bot ---
@app.post("/event")
async def handle_event(request: Request):
    """Maneja peticiones POST aceptando cualquier estructura JSON"""
    try:
        # Extraemos el JSON crudo para ver qué trae
        data = await request.json()
        print(f"--- [API] Datos recibidos del bot: {data} ---")
        
        # Aquí puedes procesar la lógica según lo que venga en 'data'
        return {"status": "success", "received_data": data}
        
    except Exception as e:
        print(f"--- [API] Error al procesar JSON: {e} ---")
        return {"status": "error", "message": str(e)}

# 2. Función envoltorio para el Bot de Discord
def start_discord():
    """Ejecuta el bot de Discord en un nuevo bucle de eventos"""
    print("--- Intentando iniciar hilo de Discord ---")
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(run_discord_bot())
    except Exception as e:
        print(f"--- ERROR CRÍTICO EN HILO DISCORD: {e} ---")

# 3. Punto de entrada principal
if __name__ == "__main__":
    if not os.getenv("DISCORD_TOKEN"):
        print("ERROR: La variable DISCORD_TOKEN no está configurada en Railway.")
    
    port = int(os.environ.get("PORT", 8080))
    print(f"--- Iniciando Uvicorn en el puerto {port} ---")
    uvicorn.run(app, host="0.0.0.0", port=port)