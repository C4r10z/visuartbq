// Event bus simples para integrar clique da lista com foco no mapa
const listeners = new Map();

export function on(event, cb) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(cb);
  return () => off(event, cb);
}

export function off(event, cb) {
  listeners.get(event)?.delete(cb);
}

export function emit(event, payload) {
  listeners.get(event)?.forEach(cb => cb(payload));
}
