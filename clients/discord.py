import os
import discord
import httpx

AGENT_API_URL = os.getenv("AGENT_API_URL", "http://localhost:8000")
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
CHANNEL_NAME = os.getenv("CHANNEL_NAME", "rescuepaw")

intents = discord.Intents.default()
intents.message_content = True

client = discord.Client(intents=intents)

@client.event
async def on_ready():
    print(f"[DISCORD] Bot ready as {client.user}")


@client.event
async def on_message(message: discord.Message):
    if message.author == client.user:
        return
    if message.channel.name != CHANNEL_NAME:
        return

    content = message.content.strip()
    if not content.startswith("!"):
        return

    # Parse command and forward to agent
    event = parse_command(content, str(message.author))
    if not event:
        await message.reply(
            "Unknown command. Try: `!register`, `!feeding`, `!donate`, `!status`"
        )
        return

    # Forward to agent — bot does NOT decide anything
    response = await forward_to_agent(event)
    reply = format_response(response)
    await message.reply(reply)


def parse_command(content: str, user: str) -> dict | None:
    """
    Minimal parsing. Bot extracts raw data, agent decides.
    Format:
      !register color=brown size=medium weight=8 zone=miraflores
      !feeding dog_id=ABC123
      !donate dog_id=ABC123 amount=1.0
      !status [dog_id=ABC123]
    """
    parts = content.split()
    cmd = parts[0].lower()

    params = {}
    for part in parts[1:]:
        if "=" in part:
            k, v = part.split("=", 1)
            params[k] = v

    if cmd == "!register":
        return {
            "type": "REGISTER",
            "wallet": params.get("wallet", f"discord:{user}"),
            "metadata": {
                "color": params.get("color"),
                "size":  params.get("size"),
                "weight": params.get("weight"),
                "zone":  params.get("zone"),
            },
            "image": params.get("image"),
            "source": "discord",
        }

    if cmd == "!feeding":
        return {
            "type": "FEEDING",
            "dog_id": params.get("dog_id"),
            "wallet": params.get("wallet", f"discord:{user}"),
            "image":  params.get("image"),
            "source": "discord",
        }

    if cmd == "!donate":
        return {
            "type": "DONATE",
            "dog_id": params.get("dog_id"),
            "metadata": {"amount": float(params.get("amount", 0))},
            "source": "discord",
        }

    if cmd == "!status":
        return {
            "type": "STATUS",
            "dog_id": params.get("dog_id"),
            "source": "discord",
        }

    return None


async def forward_to_agent(event: dict) -> dict:
    """Send event to the agent API. Bot never interprets the response logic."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as http:
            r = await http.post(f"{AGENT_API_URL}/event", json=event)
            return r.json()
    except Exception as e:
        return {"decision": "error", "reason": str(e)}


def format_response(response: dict) -> str:
    decision = response.get("decision", "unknown")
    emoji = "✅" if decision == "accepted" else "❌"
    reason = response.get("reason", response.get("message", ""))
    dog_id = response.get("dog_id", "")
    action = response.get("action", "")
    payment = response.get("payment", {})

    lines = [f"{emoji} **{decision.upper()}**"]
    if action:
        lines.append(f"Action: `{action}`")
    if dog_id:
        lines.append(f"Dog ID: `{dog_id}`")
    if reason:
        lines.append(f"Reason: {reason}")
    if payment and payment.get("executed"):
        lines.append(
            f"Payment: `{payment.get('caregiver_received', 0):.4f} SYS` released"
        )
    return "\n".join(lines)


async def run_discord_bot():
    await client.start(DISCORD_TOKEN)
