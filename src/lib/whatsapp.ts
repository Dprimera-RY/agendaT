// Helpers para armar links wa.me y los mensajes de notificación de citas.
// Se usan tanto en las APIs (devolver el link al cliente) como referencia del texto.

export function waLink(phone: string | null | undefined, text: string): string | null {
  if (!phone) return null
  const digits = phone.replace(/[^0-9]/g, '')
  if (!digits) return null
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
}

export function fmtApptDate(date: Date): string {
  return date.toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })
}

// ===== Mensajes por evento =====

export function msgNewAppointment(opts: {
  businessName: string
  customerName: string
  customerPhone: string
  servicesList: string
  date: Date
  totalDurationMin: number
  depositRequired?: boolean
  depositAmount?: number | null
}): string {
  const depositLine = opts.depositRequired
    ? `\nPara CONFIRMAR la cita, el cliente debe realizar el depósito${opts.depositAmount ? ` de $${opts.depositAmount}` : ''}.\nUna vez recibido el depósito, marca la cita como confirmada en tu panel.`
    : ''
  return `🟢 *NUEVA CITA AGENDADA*

📋 Negocio: ${opts.businessName}
👤 Cliente: ${opts.customerName}
📞 Teléfono: ${opts.customerPhone}
💅 Servicio: ${opts.servicesList}
📅 Fecha: ${fmtApptDate(opts.date)}
⏱️ Duración total: ${opts.totalDurationMin} min${depositLine}`
}

export function msgConfirmed(opts: { businessName: string; customerName: string; serviceName: string; date: Date }): string {
  return `✅ *CITA CONFIRMADA*

Hola ${opts.customerName},

Tu cita en *${opts.businessName}* ha sido confirmada:
💅 ${opts.serviceName}
📅 ${fmtApptDate(opts.date)}

Te esperamos!`
}

export function msgRescheduled(opts: { businessName: string; customerName: string; serviceName: string; date: Date }): string {
  return `📅 *CITA REPROGRAMADA*

Hola ${opts.customerName},

Tu cita en *${opts.businessName}* fue reprogramada:
💅 ${opts.serviceName}
🗓 Nueva fecha: ${fmtApptDate(opts.date)}

Si no puedes asistir, avísanos con antelación.`
}

export function msgCancelled(opts: { businessName: string; customerName: string; serviceName: string; date: Date }): string {
  return `❌ *CITA CANCELADA*

Hola ${opts.customerName},

Tu cita en *${opts.businessName}* fue cancelada:
💅 ${opts.serviceName}
📅 ${fmtApptDate(opts.date)}

Si deseas agendar otra, contáctanos.`
}

export function msgCompleted(opts: { businessName: string; customerName: string; serviceName: string }): string {
  return `🙏 *¡GRACIAS POR TU VISITA!*

Hola ${opts.customerName},

Tu cita en *${opts.businessName}* (${opts.serviceName}) quedó completada.
Si te atendieron bien, déjanos una reseña desde la página del negocio.`
}

export function msgCustomerCancelled(opts: {
  businessName: string
  customerName: string
  customerPhone: string
  serviceName: string
  date: Date
}): string {
  return `🚫 *EL CLIENTE CANCELÓ*

👤 ${opts.customerName} (${opts.customerPhone})
💅 ${opts.serviceName}
📅 ${fmtApptDate(opts.date)}

El horario quedó libre en tu agenda.`
}

export function msgCustomerReactivated(opts: {
  businessName: string
  customerName: string
  customerPhone: string
  serviceName: string
  date: Date
}): string {
  return `🔄 *CITA REACTIVADA*

El cliente ${opts.customerName} (${opts.customerPhone}) reactivó su cita cancelada:
💅 ${opts.serviceName}
📅 ${fmtApptDate(opts.date)}

Revísala en tu panel.`
}
