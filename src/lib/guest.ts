// Identificador anónimo del cliente final (no registrado).
// Se genera una vez en el navegador y persiste en localStorage; se usa
// para "mis citas" y para reseñas únicas (una por negocio).
const STORAGE_KEY = 'agenda_guest_id'

const HASH_RE = /^[a-zA-Z0-9-]{20,64}$/

export function isValidGuestHash(hash: unknown): hash is string {
  return typeof hash === 'string' && HASH_RE.test(hash)
}

// Devuelve el hash del invitado, generándolo si no existe (solo en navegador)
export function getGuestHash(): string {
  if (typeof window === 'undefined') return ''
  try {
    let hash = window.localStorage.getItem(STORAGE_KEY)
    if (!hash || !HASH_RE.test(hash)) {
      hash = crypto.randomUUID()
      window.localStorage.setItem(STORAGE_KEY, hash)
    }
    return hash
  } catch {
    // localStorage no disponible (modo privado, etc.): hash efímero en memoria
    return crypto.randomUUID()
  }
}

// Guarda un código de recuperación pegado por el usuario (otro dispositivo)
export function setGuestHash(hash: string): void {
  if (typeof window === 'undefined' || !HASH_RE.test(hash)) return
  window.localStorage.setItem(STORAGE_KEY, hash)
}
