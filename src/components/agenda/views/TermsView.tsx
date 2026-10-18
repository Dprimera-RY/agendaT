'use client'

import { ArrowLeft, FileText, ShieldCheck } from 'lucide-react'
import { useRouterStore } from '@/lib/stores/router-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// Página legal: Términos y Condiciones + Uso de Datos del sistema AgendaT.
// Enlazada desde el registro (casilla de aceptación), el footer y el login.
// Sección numerada (definida a nivel de módulo, no dentro del render)
function Section({
  n,
  title,
  children,
}: {
  n: number
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold flex items-start gap-2">
        <span className="text-primary">{n}.</span> {title}
      </h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2">
        {children}
      </div>
    </section>
  )
}

export function TermsView() {
  const { navigate } = useRouterStore()

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="-ml-2 mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" />
        Volver al catálogo
      </Button>

      <div className="flex items-center gap-3 mb-6">
        <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
          <FileText className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Términos y Condiciones y Uso de Datos
          </h1>
          <p className="text-sm text-muted-foreground">
            Última actualización: octubre de 2026 · AgendaT — desarrollado por <b>rycode</b>
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 sm:p-8 space-y-6">
          <Section n={1} title="Identificación del servicio">
            <p>
              AgendaT es una plataforma web de gestión y reserva de citas para negocios locales
              (peluquerías, barberías, spas, estudios y similares), operada por <b>rycode</b> (en
              adelante, «el Prestador»). Al crear una cuenta, utilizar esta plataforma o agendar
              una cita, usted acepta los presentes Términos y Condiciones en su totalidad.
            </p>
          </Section>

          <Section n={2} title="Objeto del servicio">
            <p>
              AgendaT facilita la publicación de negocios, la gestión de agendas y disponibilidad,
              la reserva de citas por parte de clientes y las notificaciones asociadas (WhatsApp y
              notificaciones push del navegador). AgendaT <b>no presta los servicios profesionales</b>{" "}
              del negocio reservado, sino que actúa únicamente como intermediario tecnológico de
              agenda.
            </p>
          </Section>

          <Section n={3} title="Cuenta, registro y verificación de identidad">
            <p>
              El registro de cuentas de titular (dueños de negocio) requiere un{" "}
              <b>correo electrónico válido</b>. La identidad se verifica mediante un código de
              seguridad (OTP) enviado a dicho correo; hasta que la verificación no se complete, la
              cuenta no podrá utilizarse. El Prestador podrá verificar manualmente cuentas cuando
              el correo electrónico no sea accesible.
            </p>
            <p>
              Usted se compromete a: (i) facilitar datos verdaderos y actualizados; (ii) mantener la
              confidencialidad de su contraseña; (iii) notificar cualquier uso no autorizado. La
              contraseña se almacena en texto plano en la base de datos del servidor actual —ella es
              su única llave de acceso—, por lo que no debe reutilizar contraseñas de otros
              servicios.
            </p>
          </Section>

          <Section n={4} title="Uso de los datos personales (Política de uso de datos)">
            <p>
              Conforme a la Ley 116/2022 de Protección de Datos Personales de la República de Cuba y
              normativa aplicable, recopilamos y tratamos los siguientes datos:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <b>Dueños de negocio:</b> nombre, usuario, contraseña, correo electrónico, teléfono
                /WhatsApp, datos del negocio (nombre, dirección, provincia, imágenes, servicios,
                precios y horarios).
              </li>
              <li>
                <b>Clientes:</b> nombre, teléfono/WhatsApp, correo electrónico (opcional), fecha y
                hora de la cita, notas aportadas y un{" "}
                <b>código de dispositivo anónimo</b> (hash local en el navegador) que permite
                consultar «Mis citas» sin identificarse personalmente. Las reseñas pueden mostrar
                el nombre que usted decida escribir.
              </li>
              <li>
                <b>Técnicos:</b> cookies de sesión, suscripciones a notificaciones push y registros
                de uso necesarios para operar el servicio.
              </li>
            </ul>
            <p>
              <b>Finalidades:</b> prestar el servicio de agenda, notificarle citas (por WhatsApp,
              correo y push), mostrar el catálogo público de negocios, facturar licencias y dar
              soporte. <b>Base legal:</b> consentimiento del interesado. <b>Conservación:</b> mientras
              exista la cuenta o la cita, y los plazos legalmente exigibles. Sus datos{" "}
              <b>no se venden ni se ceden a terceros</b>, salvo obligación legal. Puede ejercer
              derechos de acceso, rectificación, supresión y oposición escribiendo al canal de
              soporte indicado en la app.
            </p>
          </Section>

          <Section n={5} title="Citas y depósitos">
            <p>
              Las citas quedan en estado «pendiente» hasta su confirmación por el negocio. Si el
              negocio ha configurado un <b>depósito obligatorio</b>, el cliente deberá abonar el
              monto indicado; el método de pago se acuerda directamente entre cliente y negocio, y
              el negocio confirma la cita manualmente al recibarlo. Cancelaciones y reprogramaciones
              se gestionan desde la app según las reglas mostradas en cada vista.
            </p>
          </Section>

          <Section n={6} title="Reseñas y moderación">
            <p>
              Las reseñas solo pueden dejarlas clientes con una cita previa. Para evitar difamación,
              injurias o contenidos ilícitos, el administrador de la plataforma puede{" "}
              <b>editar o eliminar</b> cualquier reseña publicada. No se admitirán expresiones
              ofensivas, falsas o que atenten contra la reputación de terceros.
            </p>
          </Section>

          <Section n={7} title="Notificaciones">
            <p>
              Al activar las notificaciones push o facilitar su WhatsApp, usted acepta recibir
              avisos relacionados con sus citas (confirmaciones, cambios, cancelaciones). Puede
              desactivarlas en cualquier momento desde la configuración de su navegador o de la
              app.
            </p>
          </Section>

          <Section n={8} title="Propiedad intelectual y responsabilidad">
            <p>
              El software, marca AgendaT y su diseño pertenecen a rycode. Los contenidos de cada
              negocio (textos, fotos, precios) son responsabilidad de su titular. El Prestador no
              responde de los servicios prestados por los negocios ni de los acuerdos de pago
              acordados fuera de la plataforma, y se reserva el derecho de suspender cuentas que
              incumplan estos términos o la normativa vigente.
            </p>
          </Section>

          <Section n={9} title="Modificaciones y contacto">
            <p>
              Estos términos podrán actualizarse; la versión vigente estará siempre disponible en
              esta página. Para dudas sobre estos términos o sobre el uso de sus datos, use el
              canal de soporte configurado en la aplicación (sección «Soporte» del panel).
            </p>
          </Section>

          <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              Al marcar «Acepto los Términos y Condiciones y el Uso de Datos» durante el registro,
              usted declara haber leído y comprendido este documento y otorga su consentimiento
              libre e informado para el tratamiento de sus datos conforme a la sección 4.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-center">
        <Button onClick={() => navigate('/register')}>Volver al registro</Button>
      </div>
    </div>
  )
}
