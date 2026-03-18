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

# 2. Función envoltorio para el Bot de Discord
def start_discord():
    """Ejecuta el bot de Discord en un nuevo bucle de eventos"""
    print("--- Intentando iniciar hilo de Discord ---")
    try:
        # Creamos un nuevo loop de asyncio para este hilo específico
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(run_discord_bot())
    except Exception as e:
        print(f"--- ERROR CRÍTICO EN HILO DISCORD: {e} ---")

# 3. Punto de entrada principal
if __name__ == "__main__":
    # Verificación de variables críticas antes de arrancar
    if not os.getenv("DISCORD_TOKEN"):
        print("ERROR: La variable DISCORD_TOKEN no está configurada en Railway.")
    
    # Lanzar el hilo de Discord (Daemon=True para que cierre si el proceso principal muere)
    discord_thread = threading.Thread(target=start_discord, daemon=True)
    discord_thread.start()
    
    # Configuración del puerto de Railway
    port = int(os.environ.get("PORT", 8080))
    
    print(f"--- Iniciando Uvicorn en el puerto {port} ---")
    # Ejecutar el servidor web (Bloquea el hilo principal, manteniendo la app viva)
    uvicorn.run(app, host="0.0.0.0", port=port)