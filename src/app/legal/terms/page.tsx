import type { Metadata } from "next";
import { FileText, ShoppingBag, Users, AlertTriangle, Scale, Mail, Building2, BookOpen } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos y Condiciones — AkistApp",
  description: "Lee los términos y condiciones de uso de AkistApp antes de utilizar nuestra plataforma.",
};

const sections = [
  {
    icon: ShoppingBag,
    title: "1. Descripción del Servicio",
    content: `AkistApp es un motor de búsqueda y directorio digital diseñado para conectar a consumidores con comercios locales en Venezuela. La plataforma permite a los usuarios buscar disponibilidad, ubicación y detalles de productos o servicios ofrecidos por terceros (los "Comercios Afiliados").

Para acceder a ciertas funcionalidades es necesario crear una cuenta. Al descargar, acceder o utilizar nuestra aplicación móvil y panel web, usted acepta estar sujeto a los presentes Términos y Condiciones. Si no está de acuerdo con estos términos, le rogamos que no utilice nuestros servicios.`,
  },
  {
    icon: Building2,
    title: "2. Naturaleza de la Plataforma y Limitación de Responsabilidad",
    content: `AkistApp actúa exclusivamente como un intermediario tecnológico e informativo.

**Ausencia de relación comercial directa:** Skynoff Technologies no es propietario, no vende, no revende ni controla los productos o servicios mostrados en la aplicación.

**Transacciones:** Cualquier transacción, compra, reserva o pago se realiza de manera directa entre el Usuario y el Comercio Afiliado, fuera o dentro de los canales facilitados, eximiendo a AkistApp de cualquier responsabilidad sobre garantías, calidad, devoluciones o cumplimiento por parte del vendedor.

**Exactitud de la información:** Aunque exigimos a los Comercios Afiliados mantener su inventario y precios actualizados, AkistApp no garantiza la disponibilidad en tiempo real ni la exactitud ininterrumpida de los precios mostrados en la plataforma.`,
  },
  {
    icon: Users,
    title: "3. Registro y Cuentas de Usuario",
    content: `Para acceder a ciertas funciones se requerirá la creación de una cuenta.

**Usuarios (Consumidores):** Se comprometen a proporcionar información veraz (como número de teléfono o correo electrónico) para garantizar la seguridad de la comunidad.

**Comercios Afiliados:** Están sujetos a un proceso de validación y verificación. Se comprometen a no publicar productos ilícitos, falsificados o que infrinjan las leyes locales de la República Bolivariana de Venezuela.

AkistApp se reserva el derecho de suspender o eliminar cuentas que violen estos términos, realicen spam o muestren comportamientos fraudulentos.`,
  },
  {
    icon: BookOpen,
    title: "4. Propiedad Intelectual",
    content: `Todo el código fuente, diseño, interfaces y logotipos (incluyendo la marca AkistApp y Skynoff Technologies) son propiedad exclusiva de sus desarrolladores.

Está prohibida la reproducción, ingeniería inversa o uso no autorizado de estos elementos.

Las fotografías y logotipos de los Comercios Afiliados son propiedad de sus respectivos dueños, quienes otorgan a AkistApp una licencia de uso para su exhibición en el buscador.`,
  },
  {
    icon: FileText,
    title: "5. Pedidos, Pagos y Cancelaciones",
    content: `**Proceso de pedido:** El cliente selecciona productos y crea una orden. La tienda recibe la notificación, la confirma o rechaza. Una vez confirmada, el cliente coordina el pago según los métodos indicados por la tienda.

**Precios y tasas:** Los precios se expresan en dólares estadounidenses (USD). AkistApp no garantiza la exactitud de las tasas de conversión mostradas; la tienda y el cliente deben acordar el monto definitivo al momento del pago.

**Cancelaciones:** Los pedidos en estado "Pendiente" pueden ser cancelados antes de la confirmación. Una vez confirmado, la cancelación queda sujeta a la política de cada tienda.

**Devoluciones:** Las devoluciones son gestionadas directamente entre el usuario y la tienda. AkistApp puede registrar la devolución en el sistema para efectos de inventario pero no interviene en reembolsos monetarios.`,
  },
  {
    icon: AlertTriangle,
    title: "6. Modificaciones del Servicio y de los Términos",
    content: `Nos reservamos el derecho de modificar, suspender o discontinuar cualquier aspecto de AkistApp en cualquier momento.

Asimismo, estos Términos pueden ser actualizados periódicamente. Los cambios serán notificados a través de la aplicación. El uso continuo de la aplicación tras cualquier cambio constituye la aceptación de los nuevos términos.`,
  },
  {
    icon: Scale,
    title: "7. Ley Aplicable y Jurisdicción",
    content: `Estos términos se rigen por las leyes de la **República Bolivariana de Venezuela**, incluyendo la Ley de Mensajes de Datos y Firmas Electrónicas.

Cualquier controversia será sometida a la jurisdicción de los **tribunales competentes en la ciudad de Anaco, Estado Anzoátegui**.

**Contacto legal:** Para consultas legales, escríbenos a soporte@akistapp.com con el asunto "Consulta Legal".`,
  },
];

function parseBold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, k) =>
    k % 2 === 1 ? <strong key={k} className="text-foreground font-semibold">{part}</strong> : part
  );
}

export default function TermsPage() {
  return (
    <article>
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <FileText className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-3">Términos y Condiciones de Uso</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Al usar AkistApp aceptas estos términos. Por favor léelos con atención.
        </p>
        <p className="text-sm text-muted-foreground mt-3 font-medium">
          Desarrollado y operado por <span className="text-foreground">Skynoff Technologies</span>
        </p>
      </div>

      {/* Aviso */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-10">
        <p className="text-amber-900 text-sm leading-relaxed">
          <span className="font-semibold">Importante:</span> AkistApp actúa exclusivamente como intermediario tecnológico. Las relaciones comerciales (precios, entrega, facturación y garantía) son directamente entre el usuario y los Comercios Afiliados. Skynoff Technologies no es parte vendedora en ninguna transacción.
        </p>
      </div>

      {/* Secciones */}
      <div className="space-y-6">
        {sections.map((section, i) => {
          const Icon = section.icon;
          return (
            <div key={i} className="bg-white rounded-2xl border p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold">{section.title}</h2>
              </div>
              <div className="text-muted-foreground leading-relaxed space-y-2">
                {section.content.split('\n').map((paragraph, j) => {
                  if (!paragraph.trim()) return null;
                  return <p key={j}>{parseBold(paragraph)}</p>;
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="mt-12 text-center bg-slate-900 text-white rounded-2xl p-8">
        <h2 className="text-xl font-bold mb-2">¿Necesitas aclaraciones?</h2>
        <p className="text-slate-400 mb-4">Nuestro equipo de soporte está disponible para resolver tus dudas.</p>
        <a
          href="mailto:soporte@akistapp.com"
          className="inline-flex items-center gap-2 bg-white text-slate-900 font-semibold px-6 py-3 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <Mail className="h-4 w-4" />
          soporte@akistapp.com
        </a>
        <p className="text-xs text-slate-500 mt-4">
          También puedes consultar nuestra{" "}
          <Link href="/legal/privacy-policy" className="underline text-slate-400 hover:text-white">Política de Privacidad</Link>
          {" "}o visitar el{" "}
          <Link href="/legal/help" className="underline text-slate-400 hover:text-white">Centro de Ayuda</Link>.
        </p>
      </div>
    </article>
  );
}
