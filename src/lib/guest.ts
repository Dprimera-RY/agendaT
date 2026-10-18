// Identificador anónimo del cliente final (no registrado).
// Se genera una vez en el navegador y persiste en localStorage; se usa
// para "mis citas" y para reseñas únicas (una por negocio).
const STORAGE_KEY = 'agenda_guest_id'

const HASH_RE = /^[a-zA-Z0-9-]{20,64}$/

// crypto.randomUUID solo existe en contextos seguros (HTTPS/localhost);
// en HTTP por IP local (LAN) no está disponible, así que hay fallback.
function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback: UUID v4 con Math.random (suficiente para id anónimo local)
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function isValidGuestHash(hash: unknown): hash is string {
  return typeof hash === 'string' && HASH_RE.test(hash)
}

// Devuelve el hash del invitado, generándolo si no existe (solo en navegador)
export function getGuestHash(): string {
  if (typeof window === 'undefined') return ''
  try {
    let hash = window.localStorage.getItem(STORAGE_KEY)
    if (!hash || !HASH_RE.test(hash)) {
      hash = randomId()
      window.localStorage.setItem(STORAGE_KEY, hash)
    }
    return hash
  } catch {
    // localStorage no disponible (modo privado, etc.): hash efímero en memoria
    return randomId()
  }
}

// Guarda un código de recuperación pegado por el usuario (otro dispositivo)
export function setGuestHash(hash: string): void {
  if (typeof window === 'undefined' || !HASH_RE.test(hash)) return
  window.localStorage.setItem(STORAGE_KEY, hash)
}
