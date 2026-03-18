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

# --- NUEVO: Endpoint para solucionar el error 404 /event ---
@app.post("/event")
async def handle_event(event: EventRequest):
    """Maneja las peticiones POST que el bot envía a la API"""
    print(f"--- [API] Evento recibido: {event.type} ---")
    
    # Aquí puedes añadir lógica según el tipo de evento
    if event.type == "register":
        # Lógica para registrar usuario (puedes conectar con YeicoAgent aquí)
        print(f"Datos de registro: {event.payload}")
        return {"status": "success", "message": "Registro procesado"}
        
    return {"status": "received", "type": event.type}

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