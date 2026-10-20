// Utilidades para fechas y horarios (server-side compatible)
export function formatDate(date: Date): string {
  return date.toISOString()
}

export function parseTimeToDate(date: Date, time: string): Date {
  const [h, m] = time.split(':').map(Number)
  const d = new Date(date)
  d.setHours(h, m, 0, 0)
  return d
}

// Genera slots de N minutos entre startTime y endTime
export function generateSlots(
  date: Date,
  startTime: string,
  endTime: string,
  durationMin: number,
  bookedSlots: { start: Date; end: Date }[]
): { start: Date; end: Date; available: boolean }[] {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const dayStart = new Date(date)
  dayStart.setHours(sh, sm, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(eh, em, 0, 0)

  const slots: { start: Date; end: Date; available: boolean }[] = []
  // Paso fijo de 15 min (o la duración si es menor), independiente de la
  // duración del servicio, para permitir cualquier inicio que quepa en el día.
  const stepMs = Math.min(15, durationMin) * 60 * 1000
  let cursor = new Date(dayStart)
  while (cursor < dayEnd) {
    const slotEnd = new Date(cursor.getTime() + durationMin * 60 * 1000)
    if (slotEnd > dayEnd) break

    // Verificar si el slot choca con alguna cita existente
    const conflict = bookedSlots.some(
      (b) => cursor < b.end && slotEnd > b.start
    )
    slots.push({ start: new Date(cursor), end: slotEnd, available: !conflict })
    cursor = new Date(cursor.getTime() + stepMs)
  }
  return slots
}

// Día de la semana 0=Dom, 1=Lun... 6=Sab (igual que JS getDay)
export function dayOfWeek(date: Date): number {
  return date.getDay()
}

export function toISO(date: Date): string {
  return date.toISOString()
}

export function fromISO(s: string): Date {
  return new Date(s)
}
