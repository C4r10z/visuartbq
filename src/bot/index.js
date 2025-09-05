// index.js — Visuart Bot (whatsapp-web.js)
// Regras:
//  - "outdoor(s)" => apenas envia o link da página nova (genérico).
//  - Lead OUTDOOR via site (mensagem com nome/end/coords/ID) => responde aviso e handoff.
//  - "orçamento" => confirma (sim: handoff | não: lista) — fora de hora entra na fila.
//  - "detalhes" => blurb + exemplos + pergunta orçamento — fora de hora entra na fila.
//  - "endereço" => texto + link Google Maps.
//  - Fora de expediente: avisa cliente e coloca pedido em FILA; ao abrir, dispara para atendente 55329911680838.
//  - Ao confirmar orçamento (aberto ou não), envia sempre “Prontinho! Você já está na fila...”.

const fs = require("fs");
const path = require("path");
const qrcode = require("qrcode-terminal");
const moment = require("moment-timezone");
const { Client, LocalAuth, MessageMedia } = require("whatsapp-web.js");

/** ========= CONFIG ========= */
const TZ = "America/Sao_Paulo";
moment.tz.setDefault(TZ);

// Página de OUTDOORS (nova)
const OUTDOOR_PAGE_URL = "https://bespoke-moonbeam-057b4d.netlify.app";

// Endereço + link Google Maps
const ADDRESS_TEXT = "R. Demétrio Ribeiro, 357 – Santo Antônio, Barbacena/MG. CEP: 36204-230";
const ADDRESS_MAPS_LINK =
  "https://www.google.com/maps?q=R.+Dem%C3%A9trio+Ribeiro,+357+-+Santo+Ant%C3%B4nio,+Barbacena+-+MG,+36204-230";

// Atendente (envio de lead) — valida env; se inválida, usa fallback correto
const DEFAULT_ATTENDANT = "5532991680838"; // 55 + DDD + número (só dígitos)
const ATTENDANT_PHONE = (() => {
  const envRaw = (process.env.ATTENDANT_PHONE || "").replace(/\D/g, "");
  if (envRaw && envRaw.length < 11) {
    console.warn(`⚠️ ATTENDANT_PHONE de ambiente inválido (${envRaw}). Usando fallback ${DEFAULT_ATTENDANT}.`);
  }
  return envRaw.length >= 11 ? envRaw : DEFAULT_ATTENDANT;
})();
let ATTENDANT_JID = null; // resolvido no ready()

// QR e Chrome
const FORCE_RELOGIN = false;
const USE_INSTALLED_CHROME = true;
const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

/** ========= HORÁRIO =========
 * Seg–Sex: 08:00–18:00 | Sáb: 08:00–12:00 | Dom: fechado
 */
function daySchedule(isoWd) {
  if (isoWd >= 1 && isoWd <= 5) return { sh: 8, sm: 0, eh: 18, em: 0 };
  if (isoWd === 6) return { sh: 8, sm: 0, eh: 12, em: 0 };
  return null;
}
function isOpenAt(m) {
  const sch = daySchedule(m.isoWeekday());
  if (!sch) return false;
  const start = m.clone().hour(sch.sh).minute(sch.sm).second(0).millisecond(0);
  const end   = m.clone().hour(sch.eh).minute(sch.em).second(0).millisecond(0);
  return m.isSameOrAfter(start) && m.isBefore(end);
}
function nextOpeningMoment(from = moment()) {
  let m = from.clone();
  if (isOpenAt(m)) return m;
  for (let i = 0; i < 8; i++) {
    const d = m.clone().add(i === 0 ? 0 : 1, "day");
    const sch = daySchedule(d.isoWeekday());
    if (sch) {
      const start = d.clone().hour(sch.sh).minute(sch.sm).second(0).millisecond(0);
      if (start.isAfter(from)) return start;
      if (i > 0) return start;
    }
  }
  return m.clone().isoWeekday(1).add(1, "week").hour(8).minute(0).second(0).millisecond(0);
}
const fmtHm = (m) => m.format("HH:mm");

/** ========= STATE ========= */
const conversations = new Map(); // Map<jid, { step, tmp:{service?}, updatedAt, human?: boolean, lastClosedKey?: string }>
const STATE_TTL_MIN = 45;
const nowStr = () => moment().format("DD/MM/YYYY HH:mm");
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const ttlExpired = (t) => !t || (Date.now() - t) > STATE_TTL_MIN * 60 * 1000;

/** ========= FILA PÓS-EXPEDIENTE ========= */
const afterHoursQueue = []; // { from, phase, lastUserText, service, whenISO }
let lastOpenState = null;

function enqueueAfterHours({ from, phase, lastUserText, service }) {
  afterHoursQueue.push({
    from,
    phase,
    lastUserText,
    service: service || null,
    whenISO: moment().toISOString(),
  });
}

async function flushAfterHoursQueueIfOpen() {
  const open = isOpenAt(moment());
  if (!open || !ATTENDANT_JID || afterHoursQueue.length === 0) return;

  // Enviar só o último item por cliente
  const latestByFrom = new Map();
  for (const item of afterHoursQueue) {
    const prev = latestByFrom.get(item.from);
    if (!prev || moment(item.whenISO).isAfter(prev.whenISO)) latestByFrom.set(item.from, item);
  }

  for (const [, item] of latestByFrom) {
    const st = ensureState(item.from);
    const label = await contactLabel(item.from);
    const niceSvc = niceService(st?.tmp?.service || item.service);
    const summary =
      `🆕 *Lead Visuart (fora do expediente)*\n` +
      `Data/Hora fila: ${moment(item.whenISO).tz(TZ).format("DD/MM/YYYY HH:mm")}\n` +
      `Serviço (detectado): ${niceSvc}\n` +
      `Fase: ${item.phase}\n` +
      (item.lastUserText ? `Última mensagem do cliente: "${item.lastUserText}"\n` : "") +
      `\nCliente: ${label}\n` +
      `Abrir chat: https://wa.me/${String(item.from).replace("@c.us","")}`;
    await safeSendMessage(ATTENDANT_JID, summary);
    st.human = true;
  }
  afterHoursQueue.length = 0;
}

function startOpenWatcher() {
  lastOpenState = isOpenAt(moment());
  setInterval(async () => {
    const open = isOpenAt(moment());
    if (open && !lastOpenState) await flushAfterHoursQueueIfOpen();
    lastOpenState = open;
  }, 60 * 1000);
}

/** ========= SERVIÇOS ========= */
const SERVICE_ALIASES = {
  fachadas: [/fachad/i, /letreiro|luminos/i],
  banners: [/banner/i],
  adesivos: [/adesiv/i],
  plotagem: [/plotag|ve[ií]culo/i],
  sinalizacao: [/sinaliza|placa|toten|wayfinding/i],
};
function guessService(text) {
  const t = String(text || "").toLowerCase();
  for (const [svc, patterns] of Object.entries(SERVICE_ALIASES)) {
    if (patterns.some((rx) => rx.test(t))) return svc;
  }
  return null;
}
function parseSiteServiceLead(textRaw = "") {
  const m = String(textRaw).match(/tenho interesse no servi[cç]o:\s*([A-ZÇÃÕÁÉÍÓÚÂÊÔ]+)\b/i);
  if (!m) return null;
  const key = m[1].normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  if (key.includes("outdoor")) return "outdoors";
  if (key.includes("fachad") || key.includes("letreiro") || key.includes("luminos")) return "fachadas";
  if (key.includes("banner")) return "banners";
  if (key.includes("adesiv")) return "adesivos";
  if (key.includes("plot")) return "plotagem";
  if (key.includes("sinal")) return "sinalizacao";
  return null;
}

/** Detectar lead OUTDOOR do site (com nome/end/coords/ID) */
function parseOutdoorLeadFromSite(textRaw = "") {
  const text = String(textRaw).trim();
  if (!/ponto:/i.test(text) && !/vim do site/i.test(text) && !/coordenadas?:/i.test(text)) return null;
  const lines = text.split(/\r?\n/).map(l => l.trim());
  let name = null, address = null, lat = null, lng = null, id = null;
  for (const line0 of lines) {
    const line = line0.replace(/^[-•\u2022]\s*/, "");
    const mCoord = line.match(/coordenadas?:\s*([-\d.]+)\s*,\s*([-\d.]+)/i);
    if (mCoord) { lat = parseFloat(mCoord[1]); lng = parseFloat(mCoord[2]); continue; }
    const mId = line.match(/\bID:\s*(\d+)/i);
    if (mId) { id = mId[1]; continue; }
    if (/^ol[áa]|^pode|^tenho interesse|^vim do site/i.test(line)) continue;
    if (!name && line) { name = line; continue; }
    if (!address && line) { address = line; continue; }
  }
  if (name || address || (lat != null && lng != null) || id) return { name, address, lat, lng, id };
  return null;
}

/** ========= MÍDIA DE EXEMPLO ========= */
const EXAMPLE_DIR = path.join(__dirname, "media", "examples");
const EXAMPLE_FILES = {
  fachadas: ["1.jpg", "2.jpg", "3.jpg"],
  banners: ["1.jpg", "2.jpg", "3.jpg"],
  adesivos: ["1.jpg", "2.jpg"],
  plotagem: ["1.jpg", "2.jpg", "3.jpg"],
  sinalizacao: ["1.jpg", "2.jpg"],
};
function serviceBlurb(service) {
  switch (service) {
    case "fachadas":
      return "Projetamos e fabricamos fachadas em ACM, letras caixa (com/sem iluminação) e luminosos — medição, produção e instalação completas.";
    case "banners":
      return "Impressão em lona 380g/440g, tecido e papel fotográfico. Acabamentos com ilhós, bainha e varão conforme necessidade.";
    case "adesivos":
      return "Vinil corte e impressão (fosco, brilho, transparente), aplicação em vitrines, paredes e superfícies internas/externas.";
    case "plotagem":
      return "Envelopamento parcial/total, recorte e impressão para carros utilitários e frotas, com laminação e aplicação profissional.";
    case "sinalizacao":
      return "Placas, totens, e wayfinding interno: projeto visual, materiais resistentes e instalação limpa em horários combinados.";
    default:
      return null;
  }
}
function niceService(service) {
  return {
    fachadas: "Fachadas / Letreiros",
    banners: "Banners",
    adesivos: "Adesivos",
    plotagem: "Plotagem de Veículos",
    sinalizacao: "Sinalização Interna",
    outdoors: "Outdoors",
  }[service] || service || "—";
}
async function sendServiceIntro(to, service) {
  const blurb = serviceBlurb(service);
  if (blurb) await safeSendMessage(to, `ℹ️ Sobre *${niceService(service)}*: ${blurb}`);
}
async function sendServiceExamples(to, service) {
  const folder = path.join(EXAMPLE_DIR, service);
  let sentAny = false;
  for (const file of EXAMPLE_FILES[service] || []) {
    const p = path.join(folder, file);
    if (fs.existsSync(p)) {
      try {
        const media = await MessageMedia.fromFilePath(p);
        await delay(120);
        await safeSendMessage(to, media, { caption: undefined });
        sentAny = true;
      } catch (e) {
        console.warn(`⚠️ Falha ao enviar ${p}:`, e?.message || e);
      }
    }
  }
  const nice =
    { fachadas: "fachadas e letreiros", banners: "banners", adesivos: "adesivos", plotagem: "plotagem de veículos", sinalizacao: "sinalização interna" }[service] || service;

  if (!sentAny) {
    await safeSendMessage(
      to,
      `Tenho exemplos de *${nice}* para te mostrar, mas ainda não encontrei as imagens no servidor.\n` +
      `Você pode confirmar se é isso mesmo? Se *sim*, posso acionar um orçamento com um atendente.`
    );
  } else {
    await safeSendMessage(
      to,
      `Essas referências de *${nice}* fazem sentido?\n` +
      `Tem interesse em um *orçamento*? Se estiver certo, responda *sim*.`
    );
  }
  const st = ensureState(to);
  st.step = "CONFIRM_EXAMPLE";
  st.tmp = { ...(st.tmp || {}), service };
}

/** ========= CLIENT ========= */
const client = new Client({
  authStrategy: new LocalAuth({ clientId: "visuart-bot-01" }),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    ignoreHTTPSErrors: true,
    executablePath:
      USE_INSTALLED_CHROME && fs.existsSync(CHROME_PATH)
        ? CHROME_PATH
        : process.env.CHROME_PATH || undefined,
  },
});

client.on("qr", (qr) => {
  console.log("\n📲 Escaneie o QR para logar no WhatsApp do ROBÔ *Visuart*:\n");
  try { qrcode.generate(qr, { small: true }); } catch (e) {
    console.error("Falha ao renderizar QR no terminal:", e?.message || e);
    console.log("QR (string):", qr);
  }
});
client.on("loading_screen", (percent, message) => {
  console.log(`⏳ Carregando ${percent || 0}% - ${message || ""}`);
});
client.on("authenticated", () => console.log("🔐 Autenticado."));
client.on("auth_failure", (m) => console.error("❌ Falha de auth:", m));
client.on("ready", async () => {
  console.log("✅ Visuart bot conectado às", nowStr());
  try {
    const selfJid = client.info?.wid?._serialized || null;
    if (selfJid) console.log("SELF_JID:", selfJid);
  } catch (e) {
    console.warn("⚠️ Não obtive SELF_JID:", e?.message || e);
  }

  // 1) Define JID do atendente a partir do número validado
  ATTENDANT_JID = `${ATTENDANT_PHONE}@c.us`;

  // 2) Checagem silenciosa (sem poluir logs)
  try {
    const ok = await client.isRegisteredUser(ATTENDANT_JID);
    if (ok) {
      console.log("ATTENDANT_JID:", ATTENDANT_JID);
    } else {
      console.warn(`⚠️ O número ${ATTENDANT_PHONE} aparenta não ter WhatsApp ativo (isRegisteredUser=false). Usando mesmo assim o JID fallback.`);
    }
  } catch {
    console.log("ℹ️ isRegisteredUser não pôde confirmar agora; mantendo fallback:", ATTENDANT_JID);
  }

  // 3) Tentativa silenciosa de resolver via getNumberId depois
  setTimeout(async () => {
    try {
      const infoLater = await client.getNumberId(ATTENDANT_PHONE);
      if (infoLater?._serialized) {
        ATTENDANT_JID = infoLater._serialized;
        console.log("🔄 ATTENDANT_JID atualizado via getNumberId:", ATTENDANT_JID);
      }
    } catch { /* silencioso */ }
  }, 15000);

  startOpenWatcher();
  await flushAfterHoursQueueIfOpen();
});
client.on("disconnected", (r) => console.log("🔌 Desconectado:", r));
client.initialize();

/** ========= HELPERS ========= */
function debugJid(jid) {
  if (!jid) return "JID_VAZIO";
  if (typeof jid === "string") return jid;
  if (jid._serialized) return jid._serialized;
  if (jid.serialize) return jid.serialize();
  try { return JSON.stringify(jid); } catch { return String(jid); }
}
function ensureState(jid) {
  let st = conversations.get(jid);
  if (!st || ttlExpired(st.updatedAt)) {
    st = { step: "WELCOME", tmp: {}, updatedAt: Date.now(), human: false, lastClosedKey: null };
    conversations.set(jid, st);
  } else {
    st.updatedAt = Date.now();
  }
  return st;
}
function resetState(jid) {
  conversations.set(jid, { step: "WELCOME", tmp: {}, updatedAt: Date.now(), human: false, lastClosedKey: null });
}
async function safeSendMessage(jid, content, opts = {}) {
  const debugJidStr = debugJid(jid);
  if (!jid) { console.error("❌ JID vazio."); return null; }
  try {
    let finalJid;
    if (typeof jid === "string") {
      finalJid = jid.includes("@c.us") ? jid : `${jid}@c.us`;
    } else if (jid._serialized) {
      finalJid = jid._serialized;
    } else if (jid.serialize) {
      finalJid = jid.serialize();
    } else {
      console.error("❌ Formato de JID não suportado:", debugJidStr);
      return null;
    }
    return await client.sendMessage(finalJid, content, opts);
  } catch (e) {
    console.error(`❌ sendMessage falhou para ${debugJidStr}:`, e?.message || e);
    return null;
  }
}
async function contactLabel(jid) {
  try {
    const c = await client.getContactById(jid);
    const name = c?.pushname || c?.name || c?.shortName || null;
    const phone = `+${String(jid).replace("@c.us", "")}`;
    return name ? `${name} (${phone})` : phone;
  } catch {
    return `+${String(jid).replace("@c.us", "")}`;
  }
}

// Saudações somente quando a mensagem é "pura" (evita conflito com leads do site)
function isBareGreeting(text) {
  const t = String(text || "").trim();
  return /^(oi|ol[áa]|bom dia|boa tarde|boa noite)[!.,\s]*$/i.test(t);
}

/** Aviso de fora do expediente (1x por período) */
async function maybeSendClosedNotice(jid) {
  const mNow = moment();
  if (isOpenAt(mNow)) return false;
  const openAt = nextOpeningMoment(mNow);
  const key = openAt.format("YYYY-MM-DD HH:mm");
  const st = ensureState(jid);
  if (st.lastClosedKey === key) return false;
  await safeSendMessage(
    jid,
    `📴 Estamos *fora do expediente* agora.\n` +
    `Atendemos *Seg–Sex 08:00–18:00* e *Sáb 08:00–12:00*.\n` +
    `Vou notificar um atendente assim que abrirmos às *${fmtHm(openAt)}*.`
  );
  st.lastClosedKey = key;
  return true;
}

/** Handoff (fila sempre confirmada ao cliente) */
async function handoffToAttendant(clientJid, phase, lastUserText) {
  const mNow = moment();
  const st = ensureState(clientJid);
  const open = isOpenAt(mNow);

  if (open && ATTENDANT_JID) {
    await safeSendMessage(
      clientJid,
      "✅ Prontinho! Você já está na fila. Um atendente vai assumir em instantes para fazer seu orçamento."
    );
    const label = await contactLabel(clientJid);
    const niceSvc = niceService(st?.tmp?.service);
    const summary =
      `🆕 *Lead Visuart*\n` +
      `Data/Hora: ${nowStr()}\n` +
      `Serviço (detectado): ${niceSvc}\n` +
      `Fase: ${phase}\n` +
      (lastUserText ? `Última mensagem do cliente: "${lastUserText}"\n` : "") +
      `\nCliente: ${label}\n` +
      `Abrir chat: https://wa.me/${String(clientJid).replace("@c.us","")}`;
    await safeSendMessage(ATTENDANT_JID, summary);
    st.human = true;
  } else {
    const openAt = nextOpeningMoment(mNow);
    await safeSendMessage(
      clientJid,
      `✅ Prontinho! Você já está na fila. Assim que abrirmos às *${fmtHm(openAt)}*, um atendente vai fazer seu orçamento.`
    );
    await maybeSendClosedNotice(clientJid);
    enqueueAfterHours({ from: clientJid, phase, lastUserText, service: st?.tmp?.service });
  }
}

/** ========= MENUS ========= */
async function sendMenu(to) {
  const text = `Olá! 👋 Eu sou o assistente da *Visuart*.
Como posso te ajudar hoje?

1) Horário de funcionamento
2) Endereço
3) Serviços

Dica: digite *humano* a qualquer momento pra falar com atendente.`;
  await safeSendMessage(to, text);
  ensureState(to).step = "MAIN_MENU";
}
async function sendServicesMenu(to) {
  const text = `Nossos serviços:

1) *Fachadas / Letreiros*
2) *Outdoors* (envio o link)
3) *Banners*
4) *Adesivos*
5) *Plotagem de Veículos*
6) *Sinalização Interna*

Responda com o número da opção.`;
  await safeSendMessage(to, text);
  ensureState(to).step = "SERVICES";
}

/** ========= ROUTER ========= */
client.on("message", async (msg) => {
  try {
    if (msg.type !== "chat") return;

    let from = msg.from || msg.author || (msg.id && msg.id.remote) || null;
    if (!from) return;
    if (!from.includes("@c.us")) from = `${from}@c.us`;

    const bodyRaw = (msg.body || "").trim();
    const body = bodyRaw.toLowerCase();
    const st = ensureState(from);

    // 1) Avisa se estiver fechado, mas NÃO interrompe o fluxo
    await maybeSendClosedNotice(from);

    // 2) Modo humano ativo
    if (st.human) {
      if (/\b(bot|menu|assistente)\b/i.test(body)) {
        st.human = false;
        await sendMenu(from);
      }
      return;
    }

    // 3) Globais
    if (/\b(menu|in[ií]cio|start)\b/i.test(body)) { await sendMenu(from); return; }
    if (/\b(humano|atendente|pessoa)\b/i.test(body)) {
      await handoffToAttendant(from, "Handoff manual solicitado pelo cliente.", bodyRaw);
      return;
    }

    // 4) Lead de OUTDOOR vindo do site (com nome/end/coords/ID) — antes da saudação
    const outdoorLead = parseOutdoorLeadFromSite(bodyRaw);
    if (outdoorLead) {
      st.tmp = { ...(st.tmp || {}), service: "outdoors" };
      await safeSendMessage(
        from,
        "Ótima escolha! Vou te passar para um atendente para que ele possa te falar sobre *valores* e *disponibilidades* do ponto. 👍"
      );
      await handoffToAttendant(
        from,
        `Lead OUTDOOR via site${outdoorLead.id ? ` (ID ${outdoorLead.id})` : ""}`,
        bodyRaw
      );
      return;
    }

    // 5) Saudações — só se a mensagem for APENAS a saudação
    if (isBareGreeting(bodyRaw)) {
      await sendMenu(from);
      return;
    }

    // Endereço
    if (/\b(endere[cç]o|maps|localiza[cç][aã]o)\b/i.test(body)) {
      await safeSendMessage(from, `📍 *Endereço*\n${ADDRESS_TEXT}\n\n🗺️ Abrir no Google Maps: ${ADDRESS_MAPS_LINK}`);
      return;
    }

    // Outdoors genérico => link
    if (/\boutdoor(s)?\b/i.test(body)) {
      await safeSendMessage(from, `Aqui está nossa página de *Outdoors*: ${OUTDOOR_PAGE_URL}`);
      return;
    }

    // Pedido de orçamento
    if (/\bor[cç]amento\b/.test(body)) {
      const svc = guessService(body);
      st.step = "QUOTE_CONFIRM";
      st.tmp = { ...(st.tmp || {}), service: svc || st.tmp?.service || null };
      const nice = svc ? niceService(svc) : "um de nossos serviços";
      await safeSendMessage(
        from,
        `Você confirma que deseja *abrir um orçamento* para ${nice}?` +
        `\nResponda *sim* para chamar um atendente, ou *não* para ver a lista de serviços.`
      );
      return;
    }

    // “Detalhes do serviço”
    if (/\bdetalh/i.test(body)) {
      const svc = guessService(body);
      if (svc) {
        st.tmp = { ...(st.tmp || {}), service: svc };
        await sendServiceIntro(from, svc);
        await sendServiceExamples(from, svc);
        return;
      }
    }

    // Leads do site "Tenho interesse no serviço: X"
    const siteKey = parseSiteServiceLead(bodyRaw);
    if (siteKey) {
      if (siteKey === "outdoors") { await safeSendMessage(from, `Página de *Outdoors*: ${OUTDOOR_PAGE_URL}`); return; }
      st.tmp = { ...(st.tmp || {}), service: siteKey };
      await sendServiceExamples(from, siteKey);
      return;
    }

    /** MAIN MENU */
    if (st.step === "MAIN_MENU") {
      if (body.startsWith("1")) { await safeSendMessage(from, "⏰ *Horário*: Seg a Sex, 08h–18h. Sáb, 08h–12h."); await sendMenu(from); return; }
      if (body.startsWith("2")) { await safeSendMessage(from, `📍 *Endereço*\n${ADDRESS_TEXT}\n\n🗺️ Abrir no Google Maps: ${ADDRESS_MAPS_LINK}`); await sendMenu(from); return; }
      if (body.startsWith("3")) { await sendServicesMenu(from); return; }
      await safeSendMessage(from, "Não entendi. Digite 1, 2 ou 3."); return;
    }

    /** SERVICES */
    if (st.step === "SERVICES") {
      if (body.startsWith("2")) { await safeSendMessage(from, `Página de *Outdoors*: ${OUTDOOR_PAGE_URL}`); return; }
      let service = null;
      if (body.startsWith("1")) service = "fachadas";
      else if (body.startsWith("3")) service = "banners";
      else if (body.startsWith("4")) service = "adesivos";
      else if (body.startsWith("5")) service = "plotagem";
      else if (body.startsWith("6")) service = "sinalizacao";
      if (service) { st.tmp = { ...(st.tmp || {}), service }; await sendServiceExamples(from, service); return; }
      await safeSendMessage(from, "Digite um número de 1 a 6."); return;
    }

    /** CONFIRMAÇÃO EXEMPLOS => orçamento? */
    if (st.step === "CONFIRM_EXAMPLE") {
      if (/^\s*(sim|isso|perfeito|ok|confirmo)\b/i.test(body)) {
        await handoffToAttendant(from, `Interesse confirmado em: ${niceService(st.tmp?.service)}`, bodyRaw);
        return;
      }
      if (/^\s*(nao|não|n)\b/i.test(body)) {
        await safeSendMessage(from, "Sem problemas! Dê uma olhada nos nossos serviços e escolha uma opção:");
        await sendServicesMenu(from);
        return;
      }
      await safeSendMessage(from, "Tem interesse em um *orçamento*? Responda *sim* ou *não*.");
      return;
    }

    /** CONFIRMAÇÃO ORÇAMENTO */
    if (st.step === "QUOTE_CONFIRM") {
      if (/^\s*(sim|ok|confirmo|quero)\b/i.test(body)) {
        await handoffToAttendant(from, `Pedido de orçamento em: ${niceService(st.tmp?.service)}`, bodyRaw);
        return;
      }
      if (/^\s*(nao|não|n)\b/i.test(body)) {
        await safeSendMessage(from, "Tudo bem! Seguem nossos serviços:");
        await sendServicesMenu(from);
        return;
      }
      await safeSendMessage(from, "Confirma o pedido de *orçamento*? Responda *sim* ou *não*.");
      return;
    }

    /** fallback */
    const maybeService = guessService(body);
    if (maybeService) { st.tmp = { ...(st.tmp || {}), service: maybeService }; await sendServiceExamples(from, maybeService); return; }

    // Sem intenção clara? Mostra o menu (mesmo fora do expediente).
    await sendMenu(from);
  } catch (e) {
    console.error("Erro em message:", e);
  }
});
