// ✅ Arquivo completo: utilitários de WhatsApp/Maps para o site

/** Telefone padrão da Visuart (formato internacional, sem espaços)
 *  IMPORTANTe: use o MESMO número onde o bot está rodando (ex.: do SELF_JID sem "@c.us")
 */
const PHONE = "5532984685261"; // <- Coloque aqui o número do seu bot/atendente (apenas dígitos, com 55)

/** Detecta mobile de forma simples (bom o suficiente para abrir app nativo) */
const isMobile = () =>
  /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");

/** Gera link wa.me com mensagem já codificada */
const waLink = (msg) => `https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`;

/** Sanitiza para não disparar a regra do bot que responde "Outdoors" com link
 *  - Remove/ troca ocorrências de "outdoor(s)" por "ponto"
 */
const stripOutdoorWords = (s) =>
  String(s || "").replace(/outdoor(s)?/gi, "ponto");

/**
 * Abre uma conversa no WhatsApp com mensagem baseada no serviço.
 * Ex: openWA("letreiros")
 */
export const openWA = (serviceKey = "") => {
  const label = serviceKey ? serviceKey.toUpperCase() : "GERAL";
  const msg =
    `Olá! Tenho interesse no serviço: ${label}. ` +
    `Pode me enviar mais informações?`;
  window.open(waLink(msg), "_blank", "noopener,noreferrer");
};

/**
 * Gera a URL de WhatsApp com dados de um ponto (sem usar "outdoor" no texto).
 * Ex: <a href={waOutdoorMsg(outdoor)} target="_blank">WhatsApp</a>
 *
 * Espera um objeto com pelo menos:
 *  - name
 *  - address (opcional)
 *  - position [lat, lng]
 *  - id (opcional)
 */
export const waOutdoorMsg = (o = {}) => {
  const safeName = stripOutdoorWords(o?.name || "Ponto");
  const safeAddrRaw = o?.address || "";
  const safeAddr = safeAddrRaw ? `\n• ${stripOutdoorWords(safeAddrRaw)}` : "";

  const hasPos =
    Array.isArray(o?.position) &&
    o.position.length === 2 &&
    isFinite(o.position[0]) &&
    isFinite(o.position[1]);

  const coords = hasPos ? `\n• Coordenadas: ${o.position[0]}, ${o.position[1]}` : "";
  const id = o?.id ? `\n• ID: ${o.id}` : "";

  // IMPORTANTE: não mencionar "outdoor" aqui
  const msg =
    `Olá! Vim do site e me interessei por este ponto:\n` +
    `• ${safeName}${safeAddr}${coords}${id}\n` +
    `Pode me atender?`;

  return waLink(msg);
};

/**
 * (Opcional) Abre app de mapas com endereço; em mobile usa esquema geo://
 * Use se precisar fora do MapView/Popup.
 */
export const openMaps = (addressOrLatLng) => {
  if (!addressOrLatLng) return;
  // addressOrLatLng pode ser string (endereço) ou [lat, lng]
  if (Array.isArray(addressOrLatLng) && addressOrLatLng.length === 2) {
    const [lat, lng] = addressOrLatLng;
    const q = `${lat},${lng}`;
    const url = isMobile()
      ? `geo:0,0?q=${q}`
      : `https://www.google.com/maps/search/?api=1&query=${q}`;
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    const q = encodeURIComponent(String(addressOrLatLng));
    const url = isMobile()
      ? `geo:0,0?q=${q}`
      : `https://www.google.com/maps/search/?api=1&query=${q}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }
};
