import type { Metadata } from "next";
import { Shield, Mail, Lock, Eye, Trash2, UserCheck, Database } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidad — AkistApp",
  description: "En AkistApp valoramos y protegemos tu privacidad. Conoce cómo recopilamos y usamos tu información.",
};

const sections = [
  {
    icon: Eye,
    title: "1. Información que Recopilamos",
    content: `Cuando utilizas AkistApp recopilamos la siguiente información:

**Datos de cuenta:** Nombre completo, correo electrónico y/o número de teléfono (mediante validación), y cédula de identidad cuando la proporcionas voluntariamente.

**Datos de uso:** Historial de búsquedas de productos y comercios visitados dentro de la app, con el fin de mejorar las recomendaciones locales y la experiencia de búsqueda.

**Ubicación:** Si el usuario otorga el permiso, utilizamos la ubicación GPS (en primer plano) estrictamente para mostrar los comercios más cercanos a su posición. En la versión web del panel de administración, sólo se utiliza la ciudad seleccionada por el usuario, sin acceso a GPS.`,
  },
  {
    icon: Lock,
    title: "2. Uso de la Información",
    content: `No vendemos, alquilamos ni comercializamos su información personal a terceros.

Los datos se utilizan para:
• **Personalizar** la experiencia de búsqueda y las recomendaciones de comercios locales.
• **Procesar pedidos** y facilitar la coordinación entre compradores y tiendas.
• **Mejorar la plataforma** y mantener la seguridad del sistema.
• **Enviar notificaciones** push sobre el estado de sus pedidos (confirmado, listo, entregado).

Los Comercios Afiliados solo recibirán la información necesaria del usuario si este decide establecer contacto directo a través de la aplicación (por ejemplo, al solicitar una orden o enviar un pedido a domicilio).`,
  },
  {
    icon: Database,
    title: "3. Almacenamiento y Seguridad",
    content: `La información es almacenada y procesada utilizando los estándares de seguridad de la industria y la infraestructura en la nube de Google Firebase, garantizando que sus credenciales y datos de contacto estén protegidos contra accesos no autorizados.

**Firebase Auth:** Gestiona la autenticación de forma segura. Las contraseñas nunca son almacenadas en texto plano.

**Firebase Firestore:** Los datos en reposo están cifrados con AES-256 y los datos en tránsito están protegidos por TLS/SSL.

**Acceso limitado:** Sólo personal técnico autorizado de Skynoff Technologies y los administradores de las tiendas donde realizas compras tienen acceso a tu información, en la medida estrictamente necesaria para prestar el servicio.`,
  },
  {
    icon: UserCheck,
    title: "4. Tus Derechos",
    content: `Como usuario de AkistApp tienes los siguientes derechos sobre tu información personal:

**Acceso:** Puedes consultar los datos que tenemos sobre ti desde la sección "Perfil" de la aplicación.

**Rectificación:** Puedes corregir o actualizar tus datos de nombre, teléfono y ubicación directamente en la app desde "Editar Perfil".

**Eliminación:** Los usuarios tienen derecho a solicitar la eliminación definitiva de su cuenta y todos sus datos asociados en cualquier momento a través de la sección de configuración de la aplicación o contactando a nuestro soporte técnico.

**Oposición:** Puedes oponerte al uso de tus datos para fines de personalización desactivando los permisos correspondientes en los ajustes de tu dispositivo.`,
  },
  {
    icon: Trash2,
    title: "5. Retención y Eliminación de Datos",
    content: `**Datos de cuenta activa:** Los mantenemos mientras tu cuenta esté activa y sean necesarios para prestarte el servicio.

**Historial de pedidos:** Conservamos el registro de transacciones por un período razonable para cumplir con obligaciones de soporte y, cuando aplique, legales.

**Eliminación de cuenta:** Al solicitar la eliminación de tu cuenta, tus datos personales serán anonimizados o eliminados en un plazo máximo de 30 días. Los registros de transacciones completadas pueden mantenerse en forma anonimizada.

Para solicitar la eliminación de tu cuenta y datos, escríbenos a soporte@akistapp.com con el asunto "Eliminar Cuenta".`,
  },
  {
    icon: Mail,
    title: "6. Terceros y Contacto",
    content: `**No vendemos tu información.** Compartimos datos limitados únicamente con:

• **Google Firebase (Google LLC):** Plataforma de backend para autenticación, base de datos y notificaciones push. Opera bajo los estándares de seguridad de Google Cloud y cumple con las regulaciones internacionales de protección de datos.

• **Comercios Afiliados:** Tu información de contacto y dirección de entrega sólo se comparte con la tienda específica donde realizas una compra, y únicamente en el marco de esa transacción.

**Contacto:** Para cualquier consulta sobre privacidad o para ejercer tus derechos, escríbenos a soporte@akistapp.com.`,
  },
];

function parseBold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, k) =>
    k % 2 === 1 ? <strong key={k} className="text-foreground font-semibold">{part}</strong> : part
  );
}

export default function PrivacyPolicyPage() {
  return (
    <article>
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-3">Política de Privacidad</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          En AkistApp valoramos y protegemos su privacidad. Esta política explica cómo recopilamos y usamos su información.
        </p>
        <p className="text-sm text-muted-foreground mt-3 font-medium">
          Desarrollado y operado por <span className="text-foreground">Skynoff Technologies</span>
        </p>
      </div>

      {/* Resumen destacado */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-10">
        <p className="text-blue-900 text-sm leading-relaxed">
          <span className="font-semibold">Resumen:</span> Recopilamos sólo la información necesaria para conectarte con comercios locales. No vendemos ni compartimos tus datos con terceros fuera de las tiendas donde realizas compras. Puedes solicitar la eliminación de tu cuenta en cualquier momento escribiéndonos a{" "}
          <a href="mailto:soporte@akistapp.com" className="underline font-medium">soporte@akistapp.com</a>.
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
                  return (
                    <p key={j}>{parseBold(paragraph)}</p>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA contacto */}
      <div className="mt-12 text-center bg-slate-900 text-white rounded-2xl p-8">
        <h2 className="text-xl font-bold mb-2">¿Tienes preguntas sobre tu privacidad?</h2>
        <p className="text-slate-400 mb-4">Nuestro equipo de soporte está disponible para atender tus consultas.</p>
        <a
          href="mailto:soporte@akistapp.com"
          className="inline-flex items-center gap-2 bg-white text-slate-900 font-semibold px-6 py-3 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <Mail className="h-4 w-4" />
          soporte@akistapp.com
        </a>
        <p className="text-xs text-slate-500 mt-4">
          También puedes leer nuestros{" "}
          <Link href="/legal/terms" className="underline text-slate-400 hover:text-white">Términos y Condiciones</Link>
          {" "}o visitar el{" "}
          <Link href="/legal/help" className="underline text-slate-400 hover:text-white">Centro de Ayuda</Link>.
        </p>
      </div>
    </article>
  );
}
