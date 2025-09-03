// ✅ Arquivo completo: utilitários de WhatsApp/Maps para o site

/** Telefone padrão da Visuart (formato internacional, sem espaços) */
const PHONE = "5532999831313";

/** Detecta mobile de forma simples (bom o suficiente para abrir app nativo) */
const isMobile = () =>
  /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");

/**
 * Abre uma conversa no WhatsApp com mensagem baseada no serviço.
 * Ex: openWA("letreiros")
 */
export const openWA = (serviceKey = "") => {
  const base = `https://wa.me/${PHONE}`;
  const label = serviceKey ? serviceKey.toUpperCase() : "GERAL";
  const msg = encodeURIComponent(
    `Olá! Tenho interesse no serviço: ${label}. Pode me enviar mais informações?`
  );
  window.open(`${base}?text=${msg}`, "_blank", "noopener,noreferrer");
};

/**
 * Gera a URL de WhatsApp com dados de um outdoor (objeto da sua lista).
 * Ex: <a href={waOutdoorMsg(outdoor)} target="_blank">WhatsApp</a>
 *
 * Espera um objeto com pelo menos:
 *  - name
 *  - address (opcional)
 *  - position [lat, lng]
 *  - id (opcional)
 */
export const waOutdoorMsg = (o = {}) => {
  const name = o?.name || "Outdoor";
  const address = o?.address ? `\nEndereço: ${o.address}` : "";
  const coords =
    Array.isArray(o?.position) && o.position.length === 2
      ? `\nCoordenadas: ${o.position[0]}, ${o.position[1]}`
      : "";
  const id = o?.id ? `\nID: ${o.id}` : "";
  const msg = encodeURIComponent(
    `Olá! Tenho interesse no ponto:\n${name}${address}${coords}${id}\n\nPoderia me enviar valores e disponibilidade?`
  );
  return `https://wa.me/${PHONE}?text=${msg}`;
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
    const url = isMobile() ? `geo:0,0?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`;
    window.open(url, "_blank", "noopener,noreferrer");
  } else {
    const q = encodeURIComponent(String(addressOrLatLng));
    const url = isMobile() ? `geo:0,0?q=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }
};
