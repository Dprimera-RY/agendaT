import nodemailer from 'nodemailer'
import { db } from '@/lib/db'

// Envío de emails por SMTP (configurable desde el panel admin: Ajustes → Correo).
// Si no está configurado, sendOtpEmail devuelve false y el sistema sigue funcionando
// con la verificación manual del administrador.

export async function getSmtpConfig() {
  const keys = ['smtpHost', 'smtpPort', 'smtpUser', 'smtpPass', 'smtpFrom']
  const rows = await db.setting.findMany({ where: { key: { in: keys } } })
  const map: Record<string, string> = {}
  for (const r of rows) map[r.key] = r.value
  if (!map.smtpHost || !map.smtpUser || !map.smtpPass) return null
  const port = Number(map.smtpPort) || 465
  return {
    host: map.smtpHost,
    port,
    secure: port === 465 || port === 587,
    auth: { user: map.smtpUser, pass: map.smtpPass },
    from: map.smtpFrom || map.smtpUser,
  }
}

const SUBJECTS: Record<string, string> = {
  register: 'Tu código de verificación — AgendaT',
  reset: 'Recupera tu contraseña — AgendaT',
}

function emailHtml(code: string, purpose: string) {
  const title = purpose === 'reset' ? 'Recuperación de contraseña' : 'Verificación de tu cuenta'
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f4f4f5;padding:24px">
    <div style="max-width:480px;margin:auto;background:#fff;border-radius:12px;padding:28px;border:1px solid #e4e4e7">
      <h2 style="margin:0 0 4px;color:#111">AgendaT</h2>
      <p style="margin:0 0 16px;color:#52525b;font-size:14px">${title}</p>
      <p style="font-size:14px;color:#3f3f46">Introduce este código para continuar:</p>
      <div style="font-size:34px;letter-spacing:10px;font-weight:bold;text-align:center;background:#f4f4f5;border-radius:8px;padding:14px 8px;color:#18181b">${code}</div>
      <p style="font-size:12px;color:#71717a;margin-top:16px">Caduca en 15 minutos. Si no solicitaste este correo, ignóralo.</p>
      <p style="font-size:12px;color:#a1a1aa">— Desarrollado por <b>rycode</b></p>
    </div>
  </div>`
}

// Envía el código OTP por email. Devuelve true si se envió correctamente.
export async function sendOtpEmail(
  email: string,
  code: string,
  purpose: 'register' | 'reset'
): Promise<boolean> {
  try {
    const cfg = await getSmtpConfig()
    if (!cfg) return false
    const transporter = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: cfg.auth,
    })
    await transporter.sendMail({
      from: `"AgendaT" <${cfg.from}>`,
      to: email,
      subject: SUBJECTS[purpose] || 'Código de verificación — AgendaT',
      text: `Tu código de verificación es: ${code}. Caduca en 15 minutos.`,
      html: emailHtml(code, purpose),
    })
    return true
  } catch {
    return false
  }
}
