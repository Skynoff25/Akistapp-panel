"use client";

import type { Metadata } from "next";
import { HelpCircle, ChevronDown, ChevronUp, ShoppingBag, BarChart2, Package, Store, Mail, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const categories = [
  {
    icon: ShoppingBag,
    title: "Pedidos y Compras",
    faqs: [
      {
        q: "¿Cómo realizo un pedido?",
        a: "Abre AkistApp, selecciona una tienda, añade los productos que deseas al carrito y pulsa 'Crear Orden'. Deberás tener el correo verificado para completar tu primera compra. Una vez creado el pedido, la tienda lo revisará y confirmará."
      },
      {
        q: "¿Cómo sé el estado de mi pedido?",
        a: "Puedes ver el estado en la sección 'Mis Pedidos' de la app. Los estados son: Pendiente → Confirmado → Listo para recoger/enviar → Entregado. Recibirás notificaciones push en cada cambio de estado."
      },
      {
        q: "¿Cómo pago mi pedido?",
        a: "El pago se realiza directamente con la tienda. Al confirmar tu pedido, verás los métodos de pago disponibles (Zelle, Pago Móvil, Transferencia, etc.). Debes contactar a la tienda para corroborar el monto final antes de transferir, ya que los precios pueden variar por la tasa del día."
      },
      {
        q: "¿Puedo cancelar un pedido?",
        a: "Sí, mientras el pedido esté en estado 'Pendiente' puedes contactar a la tienda para cancelarlo. Una vez confirmado, la cancelación depende de la política de cada comercio. En caso de cancelación, el inventario reservado se restituye automáticamente."
      },
      {
        q: "¿Puedo comprar por fracción de kilo?",
        a: "Sí, los productos que las tiendas configuren por peso (Kg, Gr, Lb) permiten cantidades decimales. En la app verás el selector ajustado a incrementos de 0.1 kg. Desde el panel POS de la tienda, el cajero puede ingresar cualquier cantidad decimal."
      },
    ]
  },
  {
    icon: Store,
    title: "Tiendas y Administración",
    faqs: [
      {
        q: "¿Cómo registro mi tienda en AkistApp?",
        a: "El registro de nuevas tiendas lo gestiona el equipo de AkistApp. Escríbenos a soporte@akistapp.com con el nombre de tu negocio, ciudad y número de contacto. Te guiaremos en el proceso de incorporación."
      },
      {
        q: "¿Cómo añado o edito productos?",
        a: "Accede al panel de tu tienda en el navegador, ve a 'Mis Productos' y usa el botón 'Añadir Producto'. Puedes editar precios, stock, imágenes, variantes y unidades de medida desde ahí. Los cambios se reflejan en la app en tiempo real."
      },
      {
        q: "¿Cómo gestiono el inventario?",
        a: "El inventario se descuenta automáticamente cuando una orden pasa al estado 'Entregado' (para pedidos online) o al completar una venta en el Punto de Venta (POS). Puedes ajustar el stock manualmente en 'Mis Productos'."
      },
      {
        q: "¿Qué pasa si cancelo un pedido cuyo stock ya fue descontado?",
        a: "Si cancelas un pedido que ya tenía el inventario descontado (ventas POS o app móvil), el sistema restituye automáticamente las unidades al stock disponible."
      },
      {
        q: "¿Cómo uso el Punto de Venta (POS)?",
        a: "El POS está disponible en tu panel web. Busca los productos, añádelos al carrito, introduce los datos del cliente (opcional), configura la tasa del día y pulsa 'Completar Venta'. El sistema descuenta el inventario y genera un comprobante imprimible automáticamente."
      },
    ]
  },
  {
    icon: BarChart2,
    title: "Tasas de Cambio y Finanzas",
    faqs: [
      {
        q: "¿Cómo se calculan los precios en bolívares?",
        a: "Los precios en la plataforma se expresan en USD. La conversión a bolívares es referencial y se basa en la tasa BCV oficial del día. La tienda puede configurar su propia tasa paralela para los reportes internos de costo."
      },
      {
        q: "¿Por qué debo actualizar la tasa BCV manualmente?",
        a: "La tasa BCV se actualiza automáticamente cada vez que accedes al módulo POS si pulsas el botón 'Actualizar BCV'. Recomendamos actualizar al inicio de cada jornada. El sistema mostrará una advertencia si la tasa tiene más de 6 horas sin actualizarse para evitar ventas con tasa desactualizada."
      },
      {
        q: "¿Qué es la tasa paralela?",
        a: "Es la tasa de reposición que cada tienda configura individualmente. Se usa exclusivamente para los reportes financieros internos (costo real de reposición en USD). No es visible para los clientes."
      },
    ]
  },
  {
    icon: Package,
    title: "Cuenta y Perfil",
    faqs: [
      {
        q: "¿Por qué debo verificar mi correo?",
        a: "La verificación de correo protege tu cuenta y la de las tiendas. Solo los usuarios verificados pueden realizar pedidos en AkistApp. Revisa tu bandeja de entrada (y la carpeta de spam) después de registrarte."
      },
      {
        q: "Olvidé mi contraseña, ¿qué hago?",
        a: "En la pantalla de inicio de sesión, pulsa '¿Olvidaste tu contraseña?' e introduce tu correo. Recibirás un enlace para restablecerla. Si no lo recibes en 5 minutos, revisa la carpeta de spam."
      },
      {
        q: "¿Cómo elimino mi cuenta?",
        a: "Escríbenos a soporte@akistapp.com con el asunto 'Eliminar cuenta' desde el correo con el que te registraste. Procederemos a anonimizar tus datos en un plazo de 30 días, conforme a nuestra Política de Privacidad."
      },
    ]
  },
];

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
      >
        <span className="font-medium text-foreground pr-4">{q}</span>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        }
      </button>
      {open && (
        <div className="px-4 pb-4 text-muted-foreground text-sm leading-relaxed border-t bg-slate-50">
          <p className="pt-4">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  return (
    <article>
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
          <HelpCircle className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-3">Centro de Ayuda</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Encuentra respuestas a las preguntas más frecuentes sobre AkistApp. Si no encuentras lo que buscas, escríbenos.
        </p>
      </div>

      {/* FAQ Categories */}
      <div className="space-y-10">
        {categories.map((cat, i) => {
          const Icon = cat.icon;
          return (
            <section key={i}>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold">{cat.title}</h2>
              </div>
              <div className="space-y-2">
                {cat.faqs.map((faq, j) => (
                  <AccordionItem key={j} q={faq.q} a={faq.a} />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Contact CTA */}
      <div className="mt-12 grid md:grid-cols-2 gap-4">
        <a
          href="mailto:soporte@akistapp.com"
          className="flex items-center gap-4 p-6 bg-primary text-white rounded-2xl hover:bg-primary/90 transition-colors"
        >
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20">
            <Mail className="h-6 w-6" />
          </div>
          <div>
            <p className="font-bold text-lg">Correo electrónico</p>
            <p className="text-primary-foreground/80 text-sm">soporte@akistapp.com</p>
          </div>
        </a>
        <div className="flex items-center gap-4 p-6 bg-slate-900 text-white rounded-2xl">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/10">
            <MessageCircle className="h-6 w-6" />
          </div>
          <div>
            <p className="font-bold text-lg">Tiempo de respuesta</p>
            <p className="text-slate-400 text-sm">Respondemos en 24–48 horas hábiles</p>
          </div>
        </div>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-8">
        ¿Necesitas consultar nuestras políticas?{" "}
        <Link href="/legal/privacy-policy" className="underline hover:text-foreground">Política de Privacidad</Link>
        {" · "}
        <Link href="/legal/terms" className="underline hover:text-foreground">Términos de Uso</Link>
      </p>
    </article>
  );
}
