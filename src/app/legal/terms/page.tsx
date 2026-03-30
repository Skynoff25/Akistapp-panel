import type { Metadata } from "next";
import { FileText, ShoppingBag, Users, AlertTriangle, Scale, Mail } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Términos y Condiciones — AkistApp",
  description: "Lee los términos y condiciones de uso de AkistApp antes de utilizar nuestra plataforma.",
};

const sections = [
  {
    icon: ShoppingBag,
    title: "1. Descripción del Servicio",
    content: `AkistApp es una plataforma digital que conecta a consumidores con tiendas y comercios locales en Venezuela. A través de nuestra aplicación móvil y panel de administración web, los negocios pueden publicar sus productos, gestionar pedidos e inventario, mientras los clientes pueden explorar, seleccionar y solicitar productos con opciones de retiro en tienda o envío a domicilio.

**AkistApp actúa únicamente como intermediario tecnológico.** No somos vendedores directos de los productos publicados en la plataforma. La relación comercial (entrega, factura fiscal, garantía) se establece directamente entre el comprador y la tienda.

El servicio está disponible para usuarios en el territorio venezolano. Para acceder a todas las funcionalidades es necesario crear una cuenta y verificar tu dirección de correo electrónico.`
  },
  {
    icon: Users,
    title: "2. Roles y Responsabilidades",
    content: `**Clientes:**
• Deben ser mayores de 18 años o actuar bajo supervisión de un adulto responsable.
• Son responsables de la exactitud de la información de entrega proporcionada.
• Deben coordinar el pago directamente con la tienda a través de los métodos de pago publicados.
• El incumplimiento del pago o la recepción de pedidos sin justificación puede resultar en la suspensión de la cuenta.

**Tiendas y Comercios:**
• Son responsables de la exactitud de la información de sus productos (precios, stock, descripción).
• Deben actualizar el inventario de forma oportuna para evitar pedidos de productos sin stock.
• Son responsables de la entrega de los productos y la emisión de la factura fiscal correspondiente.
• AkistApp no se hace responsable por disputas derivadas de la calidad, descripción o entrega de los productos.

**Administradores de Tienda:**
• Son responsables de mantener seguros los accesos al panel de administración.
• No deben compartir credenciales con personas no autorizadas.`
  },
  {
    icon: FileText,
    title: "3. Pedidos, Pagos y Cancelaciones",
    content: `**Proceso de pedido:**
1. El cliente selecciona productos y crea una orden desde la app.
2. La tienda recibe la notificación y confirma (o rechaza) el pedido.
3. Una vez confirmado, el cliente coordina el pago según los métodos indicados por la tienda.
4. La tienda actualiza el estado del pedido: Confirmado → Listo → Entregado.

**Precios y tasas de cambio:**
Los precios se expresan en dólares estadounidenses (USD). La conversión a bolívares es referencial y puede variar. AkistApp no garantiza la exactitud de las tasas mostradas; la tienda y el cliente deben acordar el monto definitivo al momento del pago.

**Cancelaciones:**
• Los pedidos en estado "Pendiente" pueden ser cancelados por la tienda o el cliente antes de la confirmación.
• Una vez confirmado, la cancelación queda sujeta a la política de cada tienda.
• Los pedidos cancelados que ya tenían inventario descontado tendrán el stock restituido automáticamente en el sistema.

**Devoluciones:**
Las devoluciones son gestionadas directamente con la tienda. AkistApp puede registrar la devolución en el sistema para efectos de inventario, pero no interviene en reembolsos monetarios.`
  },
  {
    icon: AlertTriangle,
    title: "4. Conductas Prohibidas",
    content: `Está terminantemente prohibido:

• **Fraude:** crear pedidos falsos, usar información de terceros sin autorización, o proporcionar datos de contacto incorrectos deliberadamente.
• **Abuso:** hostigar, amenazar o discriminar a otros usuarios, empleados de tiendas o personal de AkistApp.
• **Manipulación:** intentar acceder a cuentas ajenas, manipular el sistema de inventario o modificar precios de manera no autorizada.
• **Spam:** enviar mensajes masivos, publicitarios o inapropiados a través de los canales de comunicación del sistema.
• **Uso comercial no autorizado:** revender acceso al panel o usar la plataforma para fines diferentes al comercio legítimo de productos.

El incumplimiento de estas normas puede resultar en la suspensión temporal o permanente de la cuenta, y en casos graves, en acciones legales bajo la legislación venezolana aplicable.`
  },
  {
    icon: Scale,
    title: "5. Limitación de Responsabilidad",
    content: `**AkistApp no garantiza:**
• La disponibilidad ininterrumpida del servicio (sujeto a mantenimientos y fuerza mayor).
• La exactitud de los precios o el stock publicados por las tiendas.
• La calidad, autenticidad o estado de los productos comercializados por terceros.
• La entrega de productos en los plazos indicados por las tiendas.

**AkistApp no es responsable por:**
• Pérdidas económicas derivadas de transacciones entre clientes y tiendas.
• Daños causados por el uso incorrecto de la plataforma.
• Incumplimientos contractuales entre las partes de una transacción comercial.

En ningún caso la responsabilidad de AkistApp excederá el monto equivalente a las comisiones cobradas en la transacción específica que generó el daño.

**Fuerza mayor:** AkistApp no será responsable por incumplimientos causados por eventos fuera de su control, incluyendo fallas de servicios de terceros (Firebase, Google), cortes de electricidad, restricciones gubernamentales u otras circunstancias de fuerza mayor.`
  },
  {
    icon: FileText,
    title: "6. Modificaciones y Ley Aplicable",
    content: `**Modificaciones:** AkistApp se reserva el derecho de modificar estos Términos y Condiciones en cualquier momento. Los cambios serán notificados a través de la aplicación con al menos 15 días de anticipación. El uso continuado de la plataforma después de dicho período implica la aceptación de los nuevos términos.

**Ley aplicable:** Estos términos se rigen por las leyes de la República Bolivariana de Venezuela. Cualquier disputa será sometida a los tribunales competentes de acuerdo con la legislación venezolana vigente, incluyendo la Ley de Mensajes de Datos y Firmas Electrónicas.

**Idioma oficial:** En caso de conflicto entre versiones en idiomas distintos, la versión en español prevalecerá.

**Contacto legal:** Para consultas legales, escríbenos a soporte@akistapp.com con el asunto "Consulta Legal".`
  },
];

export default function TermsPage() {
  return (
    <article>
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <FileText className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-3">Términos y Condiciones</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Al crear una cuenta o usar AkistApp aceptas estos términos. Por favor léelos con atención.
        </p>
        <p className="text-sm text-muted-foreground mt-4">Última actualización: 29 de marzo de 2025</p>
      </div>

      {/* Intro card */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-10">
        <p className="text-amber-900 text-sm leading-relaxed">
          <span className="font-semibold">Importante:</span> AkistApp es una plataforma intermediaria. Las relaciones comerciales (precios, entrega, facturación y garantía) son directamente entre los clientes y las tiendas registradas. AkistApp no es parte vendedora en ninguna transacción.
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-8">
        {sections.map((section, i) => {
          const Icon = section.icon;
          return (
            <div key={i} className="bg-white rounded-2xl border p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold">{section.title}</h2>
              </div>
              <div className="text-muted-foreground leading-relaxed space-y-3">
                {section.content.split('\n').map((paragraph, j) => {
                  if (!paragraph.trim()) return null;
                  const parts = paragraph.split(/\*\*(.*?)\*\*/g);
                  return (
                    <p key={j}>
                      {parts.map((part, k) =>
                        k % 2 === 1 ? <strong key={k} className="text-foreground">{part}</strong> : part
                      )}
                    </p>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Contact */}
      <div className="mt-12 text-center bg-slate-900 text-white rounded-2xl p-8">
        <h2 className="text-xl font-bold mb-2">¿Necesitas aclaraciones?</h2>
        <p className="text-slate-400 mb-4">Contáctanos para resolver cualquier duda sobre estos términos.</p>
        <a
          href="mailto:soporte@akistapp.com"
          className="inline-flex items-center gap-2 bg-white text-slate-900 font-semibold px-6 py-3 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <Mail className="h-4 w-4" />
          soporte@akistapp.com
        </a>
        <p className="text-xs text-slate-500 mt-4">
          También puedes leer nuestra{" "}
          <Link href="/legal/privacy-policy" className="underline text-slate-400 hover:text-white">Política de Privacidad</Link>
          {" "}o visitar el{" "}
          <Link href="/legal/help" className="underline text-slate-400 hover:text-white">Centro de Ayuda</Link>.
        </p>
      </div>
    </article>
  );
}
