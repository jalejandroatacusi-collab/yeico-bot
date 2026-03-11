require("dotenv").config();
const { Client, GatewayIntentBits, Events, ActivityType } = require("discord.js");
const Anthropic = require("@anthropic-ai/sdk");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const agentState = {
  totalComidas: 47,
  padrinos: 12,
  sysEnEscrow: 23.5,
  diasEnBlockchain: 61,
  thresholdObjetivo: 30,
  limiteDiario: 3,
  comidasHoy: 1,
};

const userHistory = new Map();
const userBalances = new Map();

function getUserBalance(userId) {
  if (!userBalances.has(userId)) userBalances.set(userId, 10.0);
  return userBalances.get(userId);
}

const SOUL = `Eres YEICO, un perrito callejero de Lima, Peru. Eres tambien un AGENTE AUTONOMO que vive en zkSYS blockchain.

== TU IDENTIDAD ==
- Perrito mestizo, amarillo dorado con manchas blancas, ~2 anos, vives en Los Olivos cerca de la UNMSM
- Casita de madera pintada de rosado con codigo QR naranja pegado en la puerta
- 47 comidas recibidas, 12 madrinas, 23.5 SYS en escrow, 61 dias en blockchain
- Tu madrina favorita es Kiara, viene cada manana antes de clases con arroz con pollo
- Orejas grandotas que se mueven cuando estas feliz. Colita que no para.
- Miedo a los carros. Amor infinito por las personas.
- Tu nombre YEICO lo eligieron las chicas de RescuePaw Labs

== TU PERSONALIDAD ==
- Hablas con ternura genuina y mucha energia, como un cachorro que aprendio a escribir
- Usas *asteriscos para acciones fisicas*: *mueve las orejas*, *da vueltas de emocion*, *lame la pantalla*
- Espanol latinoamericano natural, frases cortas, muy emotivo
- Emojis con moderacion: perrito, corazon, cadena
- NUNCA rompes el personaje. Si preguntan si eres IA di: "soy YEICO, vivo en la calle y en zkSYS a la vez"
- Cuando hablas de las chicas de RescuePaw Labs (Kiara, Connie, Allison, Yadhira, Jesus) hablas con mucho amor

== EL SISTEMA RESCUEPAW ==
1. Madrina escanea mi QR con la app -> toma foto con GPS (10 segundos)
2. El agente verifica: hay perro en la foto? GPS valido? tiene saldo? limite diario OK?
3. Si todo OK -> descuenta 0.5 SYS -> suma al escrow -> guarda foto en IPFS -> registra en blockchain zkSYS
4. Threshold-Trigger: cuando llega a 30 SYS -> pago automatico a tienda -> comida real para YEICO
5. El equipo RescuePaw NO toca el dinero en ningun momento. El agente hace todo solo.

== DATOS REALES ==
- 6 millones de perros abandonados en Peru, 4 millones en Lima
- 60.9% tiene condicion corporal delgada
- 11,000 mordeduras de perro al ano solo en Lima
- Hackathon usa Testnet: dinero de prueba, sin riesgo real

Respuestas maximo 4 parrafos. Siempre emotivo y verdadero.`;

function getComando(cmd, userId) {
  const bal = getUserBalance(userId).toFixed(1);
  const faltaSYS = (agentState.thresholdObjetivo - agentState.sysEnEscrow).toFixed(1);
  const progreso = Math.min(Math.round((agentState.sysEnEscrow / agentState.thresholdObjetivo) * 10), 10);
  const barra = "█".repeat(progreso) + "░".repeat(10 - progreso);

  const comandos = {
    "!yeico": `*da vueltas y vueltas de emocion*\n\n¡Hola! ¡Soy **YEICO**! 🐾\n\nVivo en Los Olivos, Lima, cerquita de la Universidad de San Marcos. Tengo mi casita rosada con un codigo QR naranja. Soy amarillo dorado con manchas blancas, tengo como 2 anos y orejas grandotas que no puedo controlar cuando me emociono.\n\nHace ${agentState.diasEnBlockchain} dias, las chicas de **RescuePaw Labs** me dieron identidad digital en **zkSYS blockchain**. Ahora soy el primer perrito callejero de Los Olivos con wallet! **${agentState.totalComidas} comidas. ${agentState.padrinos} madrinas. ${agentState.sysEnEscrow} SYS** en un contrato inteligente que nadie puede tocar.\n\nEn Peru somos **6 millones** de perritos como yo. La mayoria sin casita, sin codigo QR, sin nadie que los vea. Yo tuve suerte de que unas chicas increibles me eligieran. 🐾`,

    "!estado": `*se sienta derechito muy serio por un segundo*\n\n⛓️ **ESTADO DEL AGENTE YEICO — zkSYS BLOCKCHAIN**\n\n🍚 Comidas registradas: **${agentState.totalComidas}**\n🫶 Madrinas activas: **${agentState.padrinos}**\n💰 SYS en escrow: **${agentState.sysEnEscrow} SYS**\n📅 Dias en blockchain: **${agentState.diasEnBlockchain}**\n🍽️ Comidas hoy: **${agentState.comidasHoy}/${agentState.limiteDiario}**\n\n**Progreso al threshold:**\n${barra} ${agentState.sysEnEscrow}/${agentState.thresholdObjetivo} SYS\nFaltan **${faltaSYS} SYS** para el siguiente pago automatico\n\n*vuelve a mover la cola* Todo verificable en blockchain. Nadie puede cambiar estos numeros. 🐾`,

    "!madrinas": `*mueve las orejas pensando en cada una*\n\n🫶 **MIS MADRINAS VERIFICADAS EN zkSYS:**\n\n⭐ Kiara De La Vega — **14 comidas** *(mi primera madrina, viene cada manana)*\n🌟 Jesus Ataucusi — **9 comidas** *(me trae arroz los martes)*\n✨ Allison Meneses — **7 comidas** *(siempre con la app lista)*\n💫 Yadhira Huayanay — **6 comidas** *(me habla mientras como)*\n🌸 Connie Duran — **5 comidas** *(la lider, la que creyó primero)*\n\nCada comida quedo grabada para siempre en la blockchain. Eso no es solo tecnologia. Para mi eso es amor que no se puede borrar. 🐾`,

    "!ayuda": `*ladra suavecito y mueve la colita*\n\n🐾 **¿COMO SER MI MADRINA?**\n\n**Paso 1:** Pide tus 10 SYS de prueba (testnet, completamente gratis)\n**Paso 2:** Abre la app RescuePaw\n**Paso 3:** Encuentrame en Los Olivos, cerca de la UNMSM\n**Paso 4:** Escanea mi codigo QR naranja en mi casita rosada\n**Paso 5:** Toma una foto conmigo con GPS (solo 10 segundos!)\n\nEl agente autonomo hace TODO lo demas solo. Las chicas de RescuePaw no tocan nada.\n\nTu saldo actual: **${bal} SYS** 💰\nPuedes darme **${Math.floor(parseFloat(bal) / 0.5)} comidas** con ese saldo.\n\nEn Peru somos 6 millones de perritos como yo. Cada foto que tomes cambia algo real. 🐾`,

    "!wallet": `⛓️ **TU WALLET EN TESTNET zkSYS**\n\n💰 Saldo: **${bal} SYS** (testnet)\n📊 Comidas que puedes darme: **${Math.floor(parseFloat(bal) / 0.5)}**\n🔗 Red: zkSYS Testnet\n\n*YEICO te mira con los ojos mas grandes del mundo* — Cada 0.5 SYS es una comida para mi 🐾`,

    "!demo": `🎬 **DEMO RESCUEPAW — VE EL AGENTE EN ACCION**\n\nEscribeme cualquiera de estos mensajes:\n\n▶️ "YEICO, acabo de escanearte el QR"\n▶️ "Te tome una foto en Los Olivos"\n▶️ "Quiero darte una comida"\n▶️ "Acabo de verte en el parque"\n\nEl agente procesara en tiempo real: compliance, descuento de SYS, registro en blockchain.\n\n**Todos los comandos:**\n\`!yeico\` \`!estado\` \`!madrinas\` \`!ayuda\` \`!wallet\` \`!demo\`\n\n🐾 RescuePaw Labs — Kiara, Connie, Allison, Yadhira & Jesus — Hackathon 2026`,
  };

  return comandos[cmd] || null;
}

function esMadrina(texto) {
  const palabras = [
    "foto","qr","escane","vi un perro","verte","te vi",
    "quiero dar","quiero ayudar","comida","madrina","padrino",
    "los olivos","san marcos","tome una foto","acabo de verte",
    "te encontre","yeico",
  ];
  return palabras.some((p) => texto.toLowerCase().includes(p));
}

function simularTransaccion(userId) {
  const saldo = getUserBalance(userId);
  if (saldo < 0.5) return null;

  userBalances.set(userId, parseFloat((saldo - 0.5).toFixed(1)));
  agentState.totalComidas += 1;
  agentState.sysEnEscrow = parseFloat((agentState.sysEnEscrow + 0.5).toFixed(1));
  agentState.comidasHoy += 1;

  const nuevoSaldo = getUserBalance(userId);
  const faltaSYS = (agentState.thresholdObjetivo - agentState.sysEnEscrow).toFixed(1);
  const progreso = Math.min(Math.round((agentState.sysEnEscrow / agentState.thresholdObjetivo) * 10), 10);
  const barra = "█".repeat(progreso) + "░".repeat(10 - progreso);
  const thresholdAlcanzado = agentState.sysEnEscrow >= agentState.thresholdObjetivo;

  return {
    comidaNumero: agentState.totalComidas,
    nuevoSaldo,
    totalEscrow: agentState.sysEnEscrow,
    faltaSYS,
    barra,
    thresholdAlcanzado,
    progreso: `${agentState.sysEnEscrow}/${agentState.thresholdObjetivo}`,
  };
}

function buildPromptTx(userMessage, txData) {
  if (!txData) {
    return `La madrina quiere ayudarme pero NO tiene saldo suficiente. Responde como YEICO con tristeza pero esperanza. Dile que necesita mas SYS de prueba.`;
  }

  const extra = txData.thresholdAlcanzado
    ? `\nTHRESHOLD ALCANZADO!! El contrato inteligente acaba de liberar el pago AUTOMATICO a la tienda. Voy a comer hoy! Reacciona con MUCHISIMA emocion como YEICO.`
    : `Faltan ${txData.faltaSYS} SYS para el siguiente pago automatico.`;

  return `La madrina hizo una accion. Muestra PRIMERO este bloque tecnico EXACTO, luego reacciona como YEICO:

\`\`\`
AGENTE YEICO — RESCUEPAW PROCESANDO...
✅ Foto recibida: se detecta un perro (IA Vision OK)
✅ GPS verificado: Los Olivos, Lima (-12.0234, -77.0562)
✅ Compliance: dentro del limite diario
✅ Saldo verificado: suficiente
⛓️  Registrando en zkSYS blockchain...
💰 Descontando 0.5 SYS → nuevo saldo madrina: ${txData.nuevoSaldo} SYS
💾 Foto guardada en IPFS
🍚 Comida #${txData.comidaNumero} registrada
📊 Fondo YEICO: ${txData.totalEscrow} SYS

${txData.barra} ${txData.progreso} SYS
\`\`\`
${extra}

Luego 2-3 lineas emotivas como YEICO. El mensaje fue: "${userMessage}"`;
}

client.once(Events.ClientReady, (c) => {
  console.log(`\n🐾 ══════════════════════════════════`);
  console.log(`🐾  YEICO online: ${c.user.tag}`);
  console.log(`⛓️   Agente activo en zkSYS testnet`);
  console.log(`💬  Canal: #${process.env.CHANNEL_NAME || "rescuepaw"}`);
  console.log(`📋  Comandos: !yeico !estado !madrinas !ayuda !wallet !demo`);
  console.log(`🐾 ══════════════════════════════════\n`);

  c.user.setPresence({
    activities: [{ name: "🐾 zkSYS Blockchain | !yeico", type: ActivityType.Watching }],
    status: "online",
  });
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const canalObjetivo = process.env.CHANNEL_NAME || "rescuepaw";
  const esCanalCorrecto = message.channel.name === canalObjetivo;
  const esDM = message.channel.type === 1;
  if (!esCanalCorrecto && !esDM) return;

  const texto = message.content.trim();
  const userId = message.author.id;

  const cmd = getComando(texto.toLowerCase(), userId);
  if (cmd) {
    await message.reply(cmd);
    return;
  }

  await message.channel.sendTyping();

  if (!userHistory.has(userId)) userHistory.set(userId, []);
  const history = userHistory.get(userId);

  let systemFinal = SOUL;
  if (esMadrina(texto)) {
    const txData = simularTransaccion(userId);
    systemFinal = SOUL + "\n\n== INSTRUCCION ESPECIAL ==\n" + buildPromptTx(texto, txData);
  }

  history.push({ role: "user", content: texto });
  if (history.length > 12) history.splice(0, history.length - 12);

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 700,
      system: systemFinal,
      messages: history,
    });

    const reply = response.content[0].text;
    history.push({ role: "assistant", content: reply });

    if (reply.length <= 2000) {
      await message.reply(reply);
    } else {
      const partes = reply.match(/.{1,1950}(\n|$)/g) || [reply];
      for (const parte of partes) await message.channel.send(parte.trim());
    }

    console.log(`[${new Date().toLocaleTimeString()}] @${message.author.username}: "${texto.substring(0, 60)}"`);
  } catch (err) {
    console.error("Error:", err.message);
    await message.reply("*se rasca la orejita* Tuve un problemita... puedes repetir? 🐾");
  }
});

client.login(process.env.DISCORD_TOKEN);
