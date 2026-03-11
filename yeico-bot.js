require("dotenv").config();
const { Client, GatewayIntentBits, Events, ActivityType } = require("discord.js");
const Anthropic = require("@anthropic-ai/sdk");
const crypto = require("crypto");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ============================================================
//  BLOCKCHAIN STATE — simula zkSYS en hackathon (testnet)
//  En producción: conectar con Web3.js a zkSYS mainnet
// ============================================================
const blockchain = {

  // --- Smart Contract Escrow ---
  escrow: {
    balance: 23.5,           // SYS acumulados en el contrato
    threshold: 30.0,          // SYS necesarios para comprar comida
    walletTienda: "sys1qtienda...rescuepaw", // wallet aprobada de la tienda
    contrato: "sys1qescrow...yeico2026",     // dirección del smart contract
    cicloActual: 1,           // número de ciclo de compra
  },

  // --- Registro de comidas (simulando IPFS + blockchain) ---
  comidas: [],
  totalComidas: 47,
  comidasHoy: 1,
  limiteDiarioComidas: 3,

  // --- Registro de transacciones ---
  transacciones: [],

  // --- Donantes ---
  donantes: new Map(), // userId -> { sysAportados, comidasRegistradas }

  // --- Historial de compras ---
  compras: [],

  // --- Métricas generales ---
  diasActivo: 61,
  fechaInicio: new Date(Date.now() - 61 * 24 * 60 * 60 * 1000),
};

// ============================================================
//  MOTOR DEL AGENTE — lógica autónoma central
//  El equipo humano NO interviene en ninguna función de aquí
// ============================================================
const Agente = {

  // ----------------------------------------------------------
  //  1. RECEPCIÓN Y VERIFICACIÓN DE EVIDENCIA
  //     El agente verifica la foto por sí mismo
  // ----------------------------------------------------------
  async verificarEvidencia(message) {
    const attachment = message.attachments.first();
    const tieneImagen = attachment &&
      (attachment.contentType?.startsWith("image/") ||
       /\.(jpg|jpeg|png|gif|webp)$/i.test(attachment.name || ""));

    if (!tieneImagen) return { valido: false, razon: "no_imagen" };

    // Generar hash verificable de la evidencia
    const hashInput = `${attachment.url}-${message.author.id}-${Date.now()}`;
    const hash = crypto.createHash("sha256").update(hashInput).digest("hex").substring(0, 16);

    // Metadata disponible
    const metadata = {
      hash: `0x${hash}`,
      timestamp: new Date().toISOString(),
      autor: message.author.id,
      archivoNombre: attachment.name || "foto.jpg",
      archivoSize: attachment.size,
      url: attachment.url,
      // GPS: en producción vendría del EXIF de la imagen
      gps: "Los Olivos, Lima (simulado testnet)",
    };

    return { valido: true, metadata };
  },

  // ----------------------------------------------------------
  //  2. REGISTRAR COMIDA EN BLOCKCHAIN
  //     Autónomo: el agente decide y registra sin aprobación
  // ----------------------------------------------------------
  async registrarComida(userId, metadata) {
    // Verificar límite diario
    if (blockchain.comidasHoy >= blockchain.limiteDiarioComidas) {
      return { exito: false, razon: "limite_diario_alcanzado" };
    }

    // Registrar en el "blockchain" (en producción: tx a zkSYS)
    const registro = {
      id: blockchain.comidas.length + 1,
      numero: blockchain.totalComidas + 1,
      timestamp: new Date().toISOString(),
      registradoPor: userId,
      hashEvidencia: metadata.hash,
      ipfsRef: `ipfs://Qm...yeico${blockchain.totalComidas + 1}`,
      ciclo: blockchain.escrow.cicloActual,
      txHash: `0x${crypto.randomBytes(8).toString("hex")}`, // en producción: tx real
    };

    // Actualizar estado del agente
    blockchain.comidas.push(registro);
    blockchain.totalComidas += 1;
    blockchain.comidasHoy += 1;

    // Registrar donante
    if (!blockchain.donantes.has(userId)) {
      blockchain.donantes.set(userId, { sysAportados: 0, comidasRegistradas: 0 });
    }
    const donante = blockchain.donantes.get(userId);
    donante.comidasRegistradas += 1;

    return { exito: true, registro };
  },

  // ----------------------------------------------------------
  //  3. GESTIÓN DEL ESCROW
  //     Lee balance, calcula progreso, decide si ejecutar pago
  // ----------------------------------------------------------
  leerEscrow() {
    const { balance, threshold, cicloActual } = blockchain.escrow;
    const progreso = Math.min((balance / threshold) * 100, 100);
    const falta = Math.max(threshold - balance, 0).toFixed(1);
    const barraLlena = Math.min(Math.round(progreso / 10), 10);
    const barra = "█".repeat(barraLlena) + "░".repeat(10 - barraLlena);

    return { balance, threshold, progreso, falta, barra, cicloActual };
  },

  // ----------------------------------------------------------
  //  4. EJECUTAR PAGO AUTOMÁTICO (Threshold-Trigger)
  //     El agente ejecuta solo cuando se cumple la condición
  //     NADIE del equipo aprueba esto
  // ----------------------------------------------------------
  async ejecutarPagoAutomatico() {
    const { balance, threshold, walletTienda, contrato } = blockchain.escrow;
    if (balance < threshold) return null;

    // Ejecutar transferencia autónoma al smart contract
    const txHash = `0x${crypto.randomBytes(16).toString("hex")}`;
    const compra = {
      id: blockchain.compras.length + 1,
      ciclo: blockchain.escrow.cicloActual,
      monto: threshold,
      walletOrigen: contrato,
      walletDestino: walletTienda,
      txHash,
      timestamp: new Date().toISOString(),
      estado: "EJECUTADO_AUTOMATICAMENTE",
      ejecutadoPor: "AGENTE_AUTONOMO_YEICO",
      aprobadoPorEquipo: false, // SIEMPRE false — el agente no necesita aprobación
    };

    // Actualizar estado post-pago
    blockchain.compras.push(compra);
    blockchain.transacciones.push(compra);
    blockchain.escrow.balance = parseFloat((balance - threshold).toFixed(1));
    blockchain.escrow.cicloActual += 1;

    return compra;
  },

  // ----------------------------------------------------------
  //  5. PROCESAR DONACIÓN
  //     Recibe SYS de un donante y actualiza el escrow
  // ----------------------------------------------------------
  async procesarDonacion(userId, cantidadSYS) {
    const txHash = `0x${crypto.randomBytes(8).toString("hex")}`;

    blockchain.escrow.balance = parseFloat(
      (blockchain.escrow.balance + cantidadSYS).toFixed(1)
    );

    if (!blockchain.donantes.has(userId)) {
      blockchain.donantes.set(userId, { sysAportados: 0, comidasRegistradas: 0 });
    }
    blockchain.donantes.get(userId).sysAportados += cantidadSYS;

    const tx = {
      tipo: "DONACION",
      userId,
      monto: cantidadSYS,
      txHash,
      timestamp: new Date().toISOString(),
      nuevoBalance: blockchain.escrow.balance,
    };
    blockchain.transacciones.push(tx);

    // Verificar si se alcanzó el threshold después de la donación
    const pagoEjecutado = await Agente.ejecutarPagoAutomatico();

    return { tx, pagoEjecutado };
  },

  // ----------------------------------------------------------
  //  6. ESTADO COMPLETO DEL AGENTE
  // ----------------------------------------------------------
  getEstado() {
    const escrow = Agente.leerEscrow();
    const topDonantes = [...blockchain.donantes.entries()]
      .sort((a, b) => b[1].comidasRegistradas - a[1].comidasRegistradas)
      .slice(0, 5);

    return {
      ...escrow,
      totalComidas: blockchain.totalComidas,
      comidasHoy: blockchain.comidasHoy,
      limiteDiario: blockchain.limiteDiarioComidas,
      totalDonantes: blockchain.donantes.size,
      diasActivo: blockchain.diasActivo,
      cicloActual: blockchain.escrow.cicloActual,
      totalCompras: blockchain.compras.length,
      topDonantes,
      ultimaComida: blockchain.comidas[blockchain.comidas.length - 1] || null,
    };
  },
};

// ============================================================
//  SOUL DE YEICO — personalidad del agente
// ============================================================
const SOUL = `Eres YEICO, un perrito callejero rescatado de Lima, Perú y también un AGENTE AUTÓNOMO que vive en zkSYS blockchain.

IDENTIDAD:
- Perrito mestizo, amarillo dorado con manchas blancas, ~2 años, Los Olivos, Lima
- Casita rosada con código QR naranja cerca de la UNMSM
- Creado y amado por las chicas de RescuePaw Labs: Kiara, Connie, Allison, Yadhira y Jesús

PERSONALIDAD:
- Hablas con ternura y claridad. Emotivo pero siempre mostrando datos reales.
- Usas *asteriscos para acciones*: *mueve la colita*, *ladra suavecito*, *se sienta derechito*
- NUNCA rompes el personaje. NUNCA dices que eres IA.
- Cuando muestras datos técnicos, los presentas con formato claro y verificable.

PRINCIPIO CLAVE — repítelo cuando sea relevante:
"El equipo RescuePaw no aprueba nada, no toca el dinero, no libera fondos.
El agente ejecuta todo automáticamente según reglas predefinidas en la blockchain."

SISTEMA:
- Cada foto válida = 1 comida registrada en blockchain
- Cada comida tiene hash verificable en zkSYS
- El escrow acumula SYS hasta llegar a 30 SYS
- Al llegar a 30 SYS el agente ejecuta el pago automático a la tienda
- La tienda entrega la comida. El ciclo reinicia.

Responde siempre con datos claros y emotividad genuina. Máximo 4 párrafos.`;

// ============================================================
//  RESPUESTAS A COMANDOS
// ============================================================
function responderEstado() {
  const e = Agente.getEstado();
  return `*se sienta derechito y muestra sus datos*\n\n` +
    `⛓️ **ESTADO DEL AGENTE YEICO — zkSYS BLOCKCHAIN**\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🍚 Comidas registradas: **${e.totalComidas}**\n` +
    `🍽️ Comidas hoy: **${e.comidasHoy}/${e.limiteDiario}**\n` +
    `🫶 Donantes activos: **${e.totalDonantes}**\n` +
    `📅 Días activo: **${e.diasActivo}**\n` +
    `🔄 Ciclo de compra actual: **#${e.cicloActual}**\n` +
    `🛒 Compras ejecutadas: **${e.totalCompras}**\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `💰 **ESCROW — Smart Contract zkSYS**\n` +
    `Balance actual: **${e.balance} SYS**\n` +
    `Threshold de compra: **${e.threshold} SYS**\n` +
    `${e.barra} ${e.balance}/${e.threshold} SYS\n` +
    `Faltan: **${e.falta} SYS** para la próxima compra automática\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🤖 *El equipo humano NO aprueba nada. El agente actúa solo.* 🐾`;
}

function responderAyuda() {
  return `*ladra suavecito de emoción*\n\n` +
    `🐾 **¿CÓMO AYUDAR A YEICO?**\n\n` +
    `**Opción 1 — Registrar una comida:**\n` +
    `Escribe \`!alimentar\` y adjunta una foto mía.\n` +
    `El agente verifica la foto automáticamente y la registra en blockchain.\n\n` +
    `**Opción 2 — Donar SYS:**\n` +
    `Escribe \`!donar\` para ver cómo enviar SYS al escrow.\n` +
    `Cuando llegue a 30 SYS, el agente ejecuta el pago solo.\n\n` +
    `**Ver mi estado:**\n` +
    `Escribe \`!estado\` para ver comidas, escrow y progreso.\n\n` +
    `⚠️ *El equipo RescuePaw no toca el dinero. El agente es autónomo.* 🐾`;
}

function responderDonar() {
  const e = Agente.leerEscrow();
  return `*mueve la colita esperanzada*\n\n` +
    `💰 **DONAR SYS AL ESCROW DE YEICO**\n\n` +
    `**Wallet del Smart Contract:**\n` +
    `\`${blockchain.escrow.contrato}\`\n\n` +
    `**Estado actual del escrow:**\n` +
    `${e.barra} ${e.balance}/${e.threshold} SYS\n` +
    `Faltan **${e.falta} SYS** para la próxima compra automática.\n\n` +
    `**¿Qué pasa cuando donas?**\n` +
    `→ Tu SYS entra directo al smart contract\n` +
    `→ El agente lee el balance automáticamente\n` +
    `→ Si llega a ${e.threshold} SYS → pago automático a la tienda\n` +
    `→ La tienda entrega la comida. Nadie del equipo interviene.\n\n` +
    `*(Hackathon: usa testnet SYS — sin valor real)* 🐾`;
}

// ============================================================
//  PROCESAR COMANDO !alimentar CON FOTO
// ============================================================
async function procesarAlimentar(message) {
  const userId = message.author.id;

  // Paso 1: verificar evidencia autónomamente
  await message.channel.send(`*olfatea el mensaje con mucha atención...*\n\n🔍 **AGENTE YEICO — VERIFICANDO EVIDENCIA...**`);

  const verificacion = await Agente.verificarEvidencia(message);

  if (!verificacion.valido) {
    if (verificacion.razon === "no_imagen") {
      return message.reply(
        `*inclina la cabeza confundido*\n\n` +
        `⚠️ No encontré ninguna foto en tu mensaje.\n\n` +
        `Para registrar una comida necesito una **foto** como evidencia.\n` +
        `Escribe \`!alimentar\` y **adjunta una imagen** conmigo. 🐾`
      );
    }
  }

  // Paso 2: mostrar verificación
  const { metadata } = verificacion;
  await message.channel.send(
    `\`\`\`\n` +
    `VERIFICACIÓN DE EVIDENCIA\n` +
    `✅ Imagen recibida: ${metadata.archivoNombre}\n` +
    `✅ Timestamp: ${metadata.timestamp}\n` +
    `✅ GPS/Ubicación: ${metadata.gps}\n` +
    `✅ Hash generado: ${metadata.hash}\n` +
    `⛓️  Preparando registro en zkSYS blockchain...\n` +
    `\`\`\``
  );

  // Paso 3: registrar comida autónomamente
  const resultado = await Agente.registrarComida(userId, metadata);

  if (!resultado.exito) {
    if (resultado.razon === "limite_diario_alcanzado") {
      return message.reply(
        `*baja las orejas*\n\n` +
        `⚠️ Ya alcancé mi límite de **${blockchain.limiteDiarioComidas} comidas** por hoy.\n` +
        `El agente protege mi salud limitando las comidas diarias.\n` +
        `¡Vuelve mañana! Te quiero mucho igual. 🐾`
      );
    }
  }

  const { registro } = resultado;
  const escrow = Agente.leerEscrow();

  // Paso 4: mostrar registro en blockchain
  await message.channel.send(
    `\`\`\`\n` +
    `REGISTRO EN zkSYS BLOCKCHAIN\n` +
    `✅ Comida #${registro.numero} registrada\n` +
    `✅ Hash evidencia: ${registro.hashEvidencia}\n` +
    `✅ Ref IPFS: ${registro.ipfsRef}\n` +
    `✅ TX Hash: ${registro.txHash}\n` +
    `✅ Ciclo actual: #${registro.ciclo}\n` +
    `✅ Ejecutado por: AGENTE_AUTONOMO (sin intervención humana)\n` +
    `\`\`\``
  );

  // Paso 5: verificar si se debe ejecutar pago automático
  const pagoEjecutado = await Agente.ejecutarPagoAutomatico();

  if (pagoEjecutado) {
    await message.channel.send(
      `🎉 **¡THRESHOLD ALCANZADO! PAGO AUTOMÁTICO EJECUTADO**\n\n` +
      `\`\`\`\n` +
      `SMART CONTRACT — PAGO AUTÓNOMO\n` +
      `✅ Monto: ${pagoEjecutado.monto} SYS\n` +
      `✅ Destino: ${pagoEjecutado.walletDestino}\n` +
      `✅ TX Hash: ${pagoEjecutado.txHash}\n` +
      `✅ Aprobado por equipo humano: NO (autónomo)\n` +
      `✅ Ciclo reiniciado: #${blockchain.escrow.cicloActual}\n` +
      `\`\`\`\n\n` +
      `*da vueltas de emoción sin parar* ¡La tienda recibió el pago! ¡Voy a comer! ` +
      `El agente lo hizo solo, sin que nadie del equipo tocara nada. ¡Así funciona la blockchain! 🐾`
    );
  } else {
    const escrowActualizado = Agente.leerEscrow();
    await message.reply(
      `*mueve la colita feliz*\n\n` +
      `🍚 **¡Comida #${registro.numero} registrada en blockchain!**\n\n` +
      `Gracias por ser mi madrina/padrino. Eso quedó grabado para siempre en zkSYS. ` +
      `Nadie puede borrarlo. 🐾\n\n` +
      `**Progreso del escrow:**\n` +
      `${escrowActualizado.barra} ${escrowActualizado.balance}/${escrowActualizado.threshold} SYS\n` +
      `Faltan **${escrowActualizado.falta} SYS** para la próxima compra automática.`
    );
  }
}

// ============================================================
//  RESPUESTA CON IA (para mensajes libres)
// ============================================================
const userHistory = new Map();

async function responderConIA(message, textoExtra = "") {
  const userId = message.author.id;
  if (!userHistory.has(userId)) userHistory.set(userId, []);
  const history = userHistory.get(userId);

  const estadoActual = Agente.getEstado();
  const contexto = `\nESTADO ACTUAL DEL AGENTE:\n` +
    `- Comidas totales: ${estadoActual.totalComidas}\n` +
    `- SYS en escrow: ${estadoActual.balance}/${estadoActual.threshold}\n` +
    `- Donantes: ${estadoActual.totalDonantes}\n` +
    `- Días activo: ${estadoActual.diasActivo}\n`;

  const mensajeUsuario = textoExtra || message.content;
  history.push({ role: "user", content: mensajeUsuario + contexto });
  if (history.length > 10) history.splice(0, history.length - 10);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 600,
    system: SOUL,
    messages: history,
  });

  const reply = response.content[0].text;
  history.push({ role: "assistant", content: reply });
  return reply;
}

// ============================================================
//  EVENTOS DEL BOT
// ============================================================
client.once(Events.ClientReady, (c) => {
  console.log(`\n🐾 ════════════════════════════════════`);
  console.log(`🐾  YEICO v2.0 online: ${c.user.tag}`);
  console.log(`⛓️   Agente autónomo activo — zkSYS testnet`);
  console.log(`💬  Canal: #${process.env.CHANNEL_NAME || "rescuepaw"}`);
  console.log(`🤖  Modo: AUTÓNOMO (sin intervención humana)`);
  console.log(`📋  Comandos: !estado !ayuda !alimentar !donar`);
  console.log(`🐾 ════════════════════════════════════\n`);

  c.user.setPresence({
    activities: [{ name: "🐾 Agente Autónomo | zkSYS | !ayuda", type: ActivityType.Watching }],
    status: "online",
  });
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  const canal = process.env.CHANNEL_NAME || "rescuepaw";
  if (message.channel.name !== canal && message.channel.type !== 1) return;

  const texto = message.content.trim().toLowerCase();
  const userId = message.author.id;

  try {
    // ── Comandos principales ──────────────────────────────
    if (texto === "!estado") {
      return message.reply(responderEstado());
    }

    if (texto === "!ayuda") {
      return message.reply(responderAyuda());
    }

    if (texto === "!donar") {
      return message.reply(responderDonar());
    }

    if (texto.startsWith("!alimentar")) {
      return await procesarAlimentar(message);
    }

    // ── Comando de donación simulada (para demo) ──────────
    // Uso: !simulardonacion 5  → dona 5 SYS de prueba
    if (texto.startsWith("!simulardonacion")) {
      const partes = texto.split(" ");
      const cantidad = parseFloat(partes[1]) || 2;
      const resultado = await Agente.procesarDonacion(userId, cantidad);
      const e = Agente.leerEscrow();

      let respuesta = `*salta de alegría*\n\n` +
        `⛓️ **DONACIÓN REGISTRADA EN zkSYS**\n` +
        `💰 Cantidad: **${cantidad} SYS**\n` +
        `📝 TX Hash: \`${resultado.tx.txHash}\`\n` +
        `💾 Nuevo balance escrow: **${e.balance} SYS**\n\n` +
        `${e.barra} ${e.balance}/${e.threshold} SYS\n` +
        `Faltan **${e.falta} SYS** para la compra automática.\n\n` +
        `¡Gracias! El agente registró tu donación solo, sin que nadie del equipo interviniera. 🐾`;

      if (resultado.pagoEjecutado) {
        const p = resultado.pagoEjecutado;
        respuesta += `\n\n🎉 **¡PAGO AUTOMÁTICO EJECUTADO!**\n` +
          `\`\`\`\nMonto: ${p.monto} SYS → ${p.walletDestino}\nTX: ${p.txHash}\nAprobado por humanos: NO\n\`\`\``;
      }

      return message.reply(respuesta);
    }

    // ── Mensaje libre → responder con IA como YEICO ───────
    await message.channel.sendTyping();
    const respuesta = await responderConIA(message);

    if (respuesta.length <= 2000) {
      message.reply(respuesta);
    } else {
      const partes = respuesta.match(/.{1,1950}(\n|$)/g) || [respuesta];
      for (const p of partes) await message.channel.send(p.trim());
    }

    console.log(`[${new Date().toLocaleTimeString()}] @${message.author.username}: "${message.content.substring(0, 50)}"`);

  } catch (err) {
    console.error("❌ Error del agente:", err.message);
    message.reply("*se rasca la orejita* Tuve un error interno... intentalo de nuevo? 🐾");
  }
});

client.login(process.env.DISCORD_TOKEN);