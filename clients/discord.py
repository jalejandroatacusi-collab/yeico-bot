import os
import discord
import httpx

# ── BUG FIX 1: AGENT_API_URL must never fall back to localhost in production.
# If the env var is missing the bot logs a clear warning so it's obvious.
AGENT_API_URL = os.getenv("AGENT_API_URL", "").rstrip("/")
DISCORD_TOKEN = os.getenv("DISCORD_TOKEN")
CHANNEL_NAME  = os.getenv("CHANNEL_NAME", "rescuepaw")

intents = discord.Intents.default()
intents.message_content = True

client = discord.Client(intents=intents)


@client.event
async def on_ready():
    print(f"[DISCORD] Bot ready as {client.user}")
    print(f"[DISCORD] Listening on channel: #{CHANNEL_NAME}")
    print(f"[DISCORD] Agent URL: {AGENT_API_URL or '⚠️  NOT SET — set AGENT_API_URL in Railway'}")


@client.event
async def on_message(message: discord.Message):
    if message.author == client.user:
        return

    # ── BUG FIX 2: Channel name check.
    # Discord DMs don't have .name, and some channel types are not TextChannel.
    # Guard with hasattr so the bot doesn't crash on DMs or threads.
    channel_name = getattr(message.channel, "name", None)
    if channel_name != CHANNEL_NAME:
        return

    content = message.content.strip()

    # ── BUG FIX 3: Discord's "smart quotes" / mobile keyboards sometimes replace
    # the plain ASCII "!" with a lookalike character. Normalise before checking.
    content = content.replace("\u01c3", "!").replace("\uff01", "!")

    if not content.startswith("!"):
        return

    # Debug log — visible in Railway logs, helps diagnose future issues
    print(f"[DISCORD] CMD from {message.author}: {content[:120]}")

    # ── BUG FIX 4: AGENT_API_URL not configured — fail loudly instead of
    # silently calling localhost (which will always time out on Railway).
    if not AGENT_API_URL:
        await message.reply(
            "⚠️ Agent not configured. Set AGENT_API_URL in Railway environment variables."
        )
        return

    event = parse_command(content, str(message.author))
    if not event:
        await message.reply(
            "❓ Unknown command.\n"
            "Available commands:\n"
            "\n"
            "!register color=brown size=medium weight=8 zone=miraflores wallet=0xABC image=QmHash\n"
            "!feeding dog_id=ABC12345 wallet=0xABC image=QmHash\n"
            "!donate dog_id=ABC12345 amount=1.0\n"
            "!status\n"
            "!status dog_id=ABC12345\n"
            ""
        )
        return

    response = await forward_to_agent(event)
    reply = format_response(response)
    await message.reply(reply)


def parse_command(content: str, user: str) -> dict | None:
    """
    Minimal parsing. Bot extracts raw data, agent decides.

    Supported formats:
      !register color=brown size=medium weight=8 zone=miraflores [wallet=0x...] [image=QmHash]
      !feeding dog_id=ABC123 [wallet=0x...] [image=QmHash]
      !donate dog_id=ABC123 amount=1.0
      !status [dog_id=ABC123]
    """
    # ── BUG FIX 5: split() handles multiple spaces and tab characters cleanly,
    # but we also strip invisible Unicode spaces that mobile clients sometimes insert.
    content = " ".join(content.split())
    parts = content.split()

    if not parts:
        return None

    cmd = parts[0].lower()

    # Parse key=value pairs — keys are lowercased, values preserved as-is
    params: dict[str, str] = {}
    for part in parts[1:]:
        if "=" in part:
            k, _, v = part.partition("=")
            params[k.lower().strip()] = v.strip()

    # Derive a stable wallet from the Discord username when not provided
    default_wallet = f"discord:{user}"

    if cmd == "!register":
        # ── BUG FIX 6: weight was passed as a string to the agent.
        # decisions.py does float() conversion but better to be explicit here.
        raw_weight = params.get("weight")
        try:
            weight_val = float(raw_weight) if raw_weight is not None else None
        except ValueError:
            weight_val = None

        return {
            "type": "REGISTER",
            "wallet": params.get("wallet", default_wallet),
            "metadata": {
                "color":  params.get("color"),
                "size":   params.get("size"),
                "weight": weight_val,
                "zone":   params.get("zone"),
            },
            "image":  params.get("image"),
            "source": "discord",
        }

    if cmd == "!feeding":
        return {
            "type":   "FEEDING",
            "dog_id": params.get("dog_id"),
            "wallet": params.get("wallet", default_wallet),
            "image":  params.get("image"),
            "source": "discord",
        }

    if cmd == "!donate":
        try:
            amount = float(params.get("amount", 0))
        except ValueError:
            amount = 0.0
        return {
            "type":     "DONATE",
            "dog_id":   params.get("dog_id"),
            "metadata": {"amount": amount},
            "source":   "discord",
        }

    if cmd == "!status":
        return {
            "type":   "STATUS",
            "dog_id": params.get("dog_id"),
            "source": "discord",
        }

    return None


async def forward_to_agent(event: dict) -> dict:
    """POST event to agent API. Bot never interprets logic — only forwards."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as http:
            r = await http.post(f"{AGENT_API_URL}/event", json=event)
            r.raise_for_status()
            return r.json()
    except httpx.HTTPStatusError as e:
        return {
            "decision": "error",
            "reason": f"Agent returned HTTP {e.response.status_code}",
        }
    except httpx.ConnectError:
        return {
            "decision": "error",
            "reason": f"Cannot reach agent at {AGENT_API_URL}. Check AGENT_API_URL variable.",
        }
    except Exception as e:
        return {"decision": "error", "reason": str(e)}


def format_response(response: dict) -> str:
    decision = response.get("decision", "error").lower()

    if decision == "accepted":
        emoji = "✅"
    elif decision == "rejected":
        emoji = "❌"
    else:
        emoji = "⚠️"

    lines = [f"{emoji} *{decision.upper()}*"]

    action = response.get("action", "")
    dog_id = response.get("dog_id", "")
    reason = response.get("reason") or response.get("message", "")
    code   = response.get("code", "")

    if action:
        lines.append(f"Action: {action}")
    if dog_id:
        lines.append(f"Dog ID: {dog_id}")
    if code:
        lines.append(f"Code: {code}")
    if reason:
        lines.append(f"Reason: {reason}")

    payment = response.get("payment") or {}
    if payment.get("executed") or payment.get("caregiver_received"):
        lines.append(
            f"Payment: {float(payment.get('caregiver_received', 0)):.4f} SYS released"
        )

    # Economics info on DONATE
    if response.get("agent_fee") is not None:
        lines.append(f"Agent fee: {float(response['agent_fee']):.4f} SYS")

    return "\n".join(lines)


async def run_discord_bot():
    await client.start(DISCORD_TOKEN)