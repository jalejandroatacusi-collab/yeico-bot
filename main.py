import os
import asyncio
import threading
import uvicorn
from fastapi import FastAPI, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any

from core.agent import YeicoAgent
from clients.discord import run_discord_bot

app = FastAPI(title="Yeico Agent API")

# Modelo actualizado según tus logs reales
class DiscordEvent(BaseModel):
    type: str
    source: str
    dog_id: Optional[str] = None
    wallet: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    image: Optional[str] = None

@app.on_event("startup")
async def startup_event():
    print("--- [SISTEMA] Iniciando hilo de Discord desde Startup ---")
    threading.Thread(target=start_discord, daemon=True).start()

@app.get("/")
async def health_check():
    return {"status": "Yeico Agent Online", "environment": "Railway"}

@app.post("/event")
async def handle_event(event: DiscordEvent):
    """Maneja los eventos validados de Discord con el formato esperado"""
    print(f"--- [API] Procesando evento: {event.type} de {event.source} ---")
    
    # Preparamos una respuesta base que el bot entienda
    response_data = {
        "decision": "accepted", # Esto quita el UNKNOWN
        "action": event.type,
        "dog_id": event.dog_id or "General",
        "message": ""
    }

    if event.type == "FEEDING":
        print(f"Alimentando... Wallet: {event.wallet}")
        response_data["message"] = f"¡Alimentación registrada! Wallet: {event.wallet}"
        
    elif event.type == "REGISTER":
        response_data["message"] = "¡Perro registrado exitosamente en el sistema!"
        response_data["dog_id"] = "NUEVO_ID" # Aquí podrías generar un ID real

    elif event.type == "DONATE":
        amount = event.metadata.get('amount', 0) if event.metadata else 0
        response_data["message"] = f"Gracias por tu donación de {amount} SYS."
        
    elif event.type == "STATUS":
        response_data["message"] = "El sistema Yeico Rescue Paw está operando normalmente."

    return response_data

def start_discord():
    print("--- Intentando iniciar hilo de Discord ---")
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(run_discord_bot())
    except Exception as e:
        print(f"--- ERROR CRÍTICO EN HILO DISCORD: {e} ---")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)