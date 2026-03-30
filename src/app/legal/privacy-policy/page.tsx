import type { Metadata } from "next";
import { Shield, Mail, Lock, Eye, Trash2, UserCheck } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Política de Privacidad — AkistApp",
  description: "Conoce cómo AkistApp recopila, usa y protege tu información personal.",
};

const sections = [
  {
    icon: Eye,
    title: "1. Información que Recopilamos",
    content: `Al registrarte y usar AkistApp recopilamos la siguiente información:

**Datos de identificación:** nombre completo, dirección de correo electrónico, número de teléfono y cédula de identidad o RIF (cuando los proporcionas voluntariamente).

**Datos de uso:** historial de pedidos, tiendas favoritas, ciudad de residencia, y preferencias de entrega (domicilio o retiro en tienda).

**Datos técnicos:** dirección IP, tipo de dispositivo, sistema operativo, versión de la aplicación y tokens de notificación push (FCM) para enviarte actualizaciones de tus pedidos.

**Datos de ubicación:** ciudad seleccionada por el usuario para mostrar tiendas cercanas. No recopilamos ubicación GPS en tiempo real.`
  },
  {
    icon: Lock,
    title: "2. Cómo Usamos tu Información",
    content: `Usamos tu información para:

• **Procesar pedidos:** tus datos de contacto son compartidos con la tienda donde realizas la compra para coordinar la entrega.
• **Comunicación:** enviarte notificaciones push sobre el estado de tus pedidos (confirmado, listo para recoger, entregado).
• **Seguridad:** detectar y prevenir fraudes, bloquear cuentas que violen nuestros términos de uso.
• **Mejora del servicio:** analizar patrones de uso anónimos para mejorar la experiencia en la plataforma.
• **Soporte:** responder a consultas y resolver disputas entre compradores y tiendas.`
  },
  {
    icon: Shield,
    title: "3. Almacenamiento y Seguridad",
    content: `**Firebase (Google):** toda tu información es almacenada en Google Firebase (Firestore y Firebase Auth), cumpliendo con los estándares de seguridad de Google Cloud Platform.

**Cifrado:** los datos en tránsito están protegidos por TLS/SSL. Los datos en reposo son gestionados por Firebase con cifrado AES-256.

**Acceso limitado:** solo el personal técnico autorizado de AkistApp y los administradores de las tiendas donde realizas compras tienen acceso a tu información, y únicamente en la medida necesaria para procesar tus pedidos.

**Contraseñas:** no almacenamos tu contraseña en texto plano; Firebase Auth gestiona la autenticación de forma segura.`
  },
  {
    icon: UserCheck,
    title: "4. Tus Derechos (ARCO)",
    content: `Como usuario de AkistApp tienes los siguientes derechos sobre tu información personal:

**Acceso:** puedes solicitar una copia de todos los datos que tenemos sobre ti.
**Rectificación:** puedes corregir o actualizar tus datos en la sección "Perfil" de la aplicación.
**Cancelación:** puedes solicitar la eliminación de tu cuenta y todos tus datos personales.
**Oposición:** puedes oponerte al uso de tus datos para fines de marketing o análisis.

Para ejercer estos derechos, escríbenos a soporte@akistapp.com con el asunto "Solicitud ARCO". Responderemos en un plazo máximo de 15 días hábiles.`
  },
  {
    icon: Trash2,
    title: "5. Retención y Eliminación de Datos",
    content: `**Datos de cuenta activa:** los mantenemos mientras tu cuenta esté activa y sea necesario para prestarte el servicio.

**Historial de pedidos:** conservamos el historial de transacciones por un período de 5 años para cumplir con obligaciones fiscales y legales en Venezuela.

**Eliminación de cuenta:** al eliminar tu cuenta, tus datos personales se anonimizarán en un plazo de 30 días. Los registros de transacciones se conservarán en forma anonimizada conforme a lo indicado anteriormente.

**Datos técnicos:** los logs del sistema se eliminan automáticamente después de 90 días.`
  },
  {
    icon: Mail,
    title: "6. Terceros y Transferencias",
    content: `**No vendemos tu información.** Sin embargo, compartimos datos limitados con:

• **Google Firebase:** plataforma de backend (autenticación, base de datos, notificaciones).
• **Tiendas en AkistApp:** tus datos de contacto y dirección se comparten con la tienda donde realizas compras, solo para procesar tu pedido.

No transferimos tus datos a países sin nivel adecuado de protección. Google Firebase opera bajo el marco de Privacy Shield y cumple con el RGPD.`
  },
];

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
          En AkistApp nos comprometemos a proteger tu privacidad. Esta política explica cómo recopilamos, usamos y protegemos tu información personal.
        </p>
        <p className="text-sm text-muted-foreground mt-4">Última actualización: 29 de marzo de 2025</p>
      </div>

      {/* Intro card */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-10">
        <p className="text-blue-900 text-sm leading-relaxed">
          <span className="font-semibold">Resumen simple:</span> Recopilamos solo la información necesaria para que puedas comprar en tiendas locales a través de AkistApp. No vendemos tus datos. Puedes solicitar la eliminación de tu cuenta en cualquier momento escribiéndonos a{" "}
          <a href="mailto:soporte@akistapp.com" className="underline font-medium">soporte@akistapp.com</a>.
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
              <div className="prose prose-slate max-w-none text-muted-foreground leading-relaxed">
                {section.content.split('\n').map((paragraph, j) => {
                  if (!paragraph.trim()) return <br key={j} />;
                  // Bold markdown simulation
                  const parts = paragraph.split(/\*\*(.*?)\*\*/g);
                  return (
                    <p key={j} className="mb-3 last:mb-0">
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
        <h2 className="text-xl font-bold mb-2">¿Tienes preguntas?</h2>
        <p className="text-slate-400 mb-4">Nuestro equipo de privacidad está disponible para atender tus consultas.</p>
        <a
          href="mailto:soporte@akistapp.com"
          className="inline-flex items-center gap-2 bg-white text-slate-900 font-semibold px-6 py-3 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <Mail className="h-4 w-4" />
          soporte@akistapp.com
        </a>
        <p className="text-xs text-slate-500 mt-4">
          También puedes consultar nuestros{" "}
          <Link href="/legal/terms" className="underline text-slate-400 hover:text-white">Términos de Uso</Link>
          {" "}o el{" "}
          <Link href="/legal/help" className="underline text-slate-400 hover:text-white">Centro de Ayuda</Link>.
        </p>
      </div>
    </article>
  );
}
