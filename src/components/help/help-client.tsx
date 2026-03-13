"use client";

import { PageHeader } from "@/components/ui/page-header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Package,
  ShoppingCart,
  Banknote,
  Scaling,
  ShieldCheck,
  Layers,
  RotateCcw,
  Tag,
  Scale,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

// ─── Sección helper ────────────────────────────────────────────────────────────
function Section({ icon: Icon, title, color, children }: {
  icon: React.ElementType;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2">
      <div className={`flex items-center gap-2 font-semibold text-sm mb-1 ${color}`}>
        <Icon className="h-4 w-4" />
        {title}
      </div>
      <div className="text-sm text-muted-foreground leading-relaxed pl-6">{children}</div>
    </div>
  );
}

// ─── Flujo de estado visual ─────────────────────────────────────────────────
function StatusFlow() {
  const steps = [
    { label: "PENDIENTE", color: "bg-yellow-500", desc: "Pedido recibido, sin confirmar aún" },
    { label: "CONFIRMADO", color: "bg-blue-500", desc: "Confirmaste que puedes atenderlo" },
    { label: "LISTO", color: "bg-purple-500", desc: "Producto preparado para retiro o envío" },
    { label: "ENTREGADO", color: "bg-green-500", desc: "Cliente recibió su pedido" },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-wrap mt-2">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <span className={`h-2.5 w-2.5 rounded-full ${step.color}`} />
            <span className="text-[10px] font-bold">{step.label}</span>
            <span className="text-[10px] text-muted-foreground max-w-[80px] text-center">{step.desc}</span>
          </div>
          {i < steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground mb-6 hidden sm:block" />}
        </div>
      ))}
    </div>
  );
}

// ─── Tip callout ────────────────────────────────────────────────────────────
function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 mt-2 p-2.5 bg-primary/5 border border-primary/20 rounded-md text-xs text-primary">
      <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 mt-2 p-2.5 bg-destructive/5 border border-destructive/20 rounded-md text-xs text-destructive">
      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function HelpClient({ storeId }: { storeId: string }) {
  return (
    <>
      <PageHeader
        title="Centro de Ayuda"
        description="Guías rápidas para las funcionalidades del panel de tu tienda."
      />

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {[
          { icon: Package, label: "Añadir Productos", color: "text-blue-500", section: "productos" },
          { icon: ShoppingCart, label: "Gestionar Pedidos", color: "text-green-500", section: "pedidos" },
          { icon: Banknote, label: "Punto de Venta", color: "text-purple-500", section: "pos" },
          { icon: Scaling, label: "Finanzas", color: "text-orange-500", section: "finanzas" },
          { icon: ShieldCheck, label: "Roles y Aprobaciones", color: "text-red-500", section: "roles" },
          { icon: Scale, label: "Venta por Peso", color: "text-teal-500", section: "peso" },
        ].map((item) => (
          <a key={item.section} href={`#${item.section}`}>
            <Card className="hover:border-primary/40 hover:bg-muted/30 transition-colors cursor-pointer h-full">
              <CardContent className="flex items-center gap-3 p-4">
                <item.icon className={`h-6 w-6 shrink-0 ${item.color}`} />
                <span className="font-medium text-sm">{item.label}</span>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>

      <Accordion type="multiple" className="space-y-3">

        {/* ── PRODUCTOS ── */}
        <AccordionItem value="productos" id="productos" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              <span className="font-semibold">Gestión de Productos</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">

            <Section icon={Package} title="¿Cómo añado un producto a mi tienda?" color="text-blue-500">
              <ol className="list-decimal pl-4 space-y-1">
                <li>Ve a <strong>Mis Productos</strong> en el menú lateral.</li>
                <li>Haz clic en <strong>"Añadir Producto"</strong>.</li>
                <li>Busca el producto en el catálogo global y haz clic en <strong>"Añadir a mi tienda"</strong>.</li>
                <li>El producto aparece en tu inventario con stock 0 y precio 0. <strong>Debes editarlo</strong> para configurar precio y stock.</li>
              </ol>
              <Tip>Si el producto que buscas no existe en el catálogo, contacta al administrador para que lo agregue.</Tip>
            </Section>

            <Section icon={Layers} title="Variantes y Combinaciones" color="text-indigo-500">
              Activa <strong>"Manejar Variantes"</strong> cuando un producto tiene múltiples presentaciones (tallas, colores, capacidades).
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li><strong>Constructor de Combinaciones:</strong> genera variantes automáticamente (ej: Color: Rojo, Azul × Talla: S, M).</li>
                <li><strong>Presets:</strong> genera rápidamente tallas de ropa, zapatos o pantalones.</li>
                <li>Cada variante tiene su propio precio, stock y costo.</li>
              </ul>
              <Warning>Con variantes activas no puedes usar precio de oferta global ni la unidad de peso. Desactiva variantes primero.</Warning>
            </Section>

            <Section icon={Tag} title="Precio Base vs Precio Oferta" color="text-amber-500">
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Precio Base:</strong> precio normal del producto.</li>
                <li><strong>Precio Oferta:</strong> precio temporal de descuento. Si está activo, el cliente ve el precio oferta (el precio base aparece tachado).</li>
              </ul>
              <Tip>Deja el campo "Precio Oferta" vacío para desactivar la oferta y mostrar solo el precio base.</Tip>
            </Section>

            <Section icon={CheckCircle2} title="Stock y Disponibilidad" color="text-green-500">
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Stock:</strong> cantidad disponible. El sistema descuenta automáticamente cuando se realiza una venta.</li>
                <li><strong>Disponible (switch):</strong> oculta el producto de la app sin eliminarlo. Útil cuando se agota temporalmente.</li>
              </ul>
            </Section>

          </AccordionContent>
        </AccordionItem>

        {/* ── PEDIDOS ── */}
        <AccordionItem value="pedidos" id="pedidos" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-green-500" />
              <span className="font-semibold">Gestión de Pedidos</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">

            <Section icon={ShoppingCart} title="Ciclo de vida de un pedido" color="text-green-500">
              Cada pedido pasa por un flujo de estados. Debes avanzarlos manualmente usando el selector en la tabla:
              <StatusFlow />
              <Tip>Cambia el estado en el selector de la tabla y pulsa "OK". El cliente puede recibir notificaciones en la app según el estado.</Tip>
            </Section>

            <Section icon={RotateCcw} title="¿Cómo proceso una devolución?" color="text-orange-500">
              <ol className="list-decimal pl-4 space-y-1">
                <li>El pedido debe estar en estado <strong>ENTREGADO</strong>.</li>
                <li>Haz clic en el menú <strong>⋮</strong> del pedido.</li>
                <li>Selecciona <strong>"Procesar Devolución"</strong>.</li>
                <li>El sistema cambia el estado a <strong>DEVUELTO</strong> y <strong>reintegra automáticamente el stock</strong> descontado.</li>
              </ol>
              <Warning>La devolución es irreversible. Una vez procesada, no puedes volver al estado ENTREGADO.</Warning>
            </Section>

            <Section icon={Tag} title="Descuento Manual en Pedido" color="text-amber-500">
              Solo disponible mientras el pedido está en <strong>PENDIENTE</strong>. Te permite restar un monto fijo al total (ej: para compensar al cliente por algún inconveniente). Queda registrado en el historial del pedido.
            </Section>

          </AccordionContent>
        </AccordionItem>

        {/* ── POS ── */}
        <AccordionItem value="pos" id="pos" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-purple-500" />
              <span className="font-semibold">Punto de Venta (POS)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">

            <Section icon={Banknote} title="¿Cómo registro una venta en tienda?" color="text-purple-500">
              <ol className="list-decimal pl-4 space-y-1">
                <li>Ve a <strong>Punto de Venta</strong> en el menú.</li>
                <li>Verifica que las <strong>tasas de cambio</strong> estén correctas (puedes sincronizar con BCV).</li>
                <li>Haz clic en <strong>"Añadir"</strong> en cada producto para agregarlo al carrito.</li>
                <li>Ajusta cantidades en el carrito.</li>
                <li>Aplica cupón o descuento si corresponde.</li>
                <li>Haz clic en <strong>"COMPLETAR VENTA"</strong>. El stock se descuenta automáticamente.</li>
              </ol>
              <Tip>Puedes añadir datos del cliente (nombre, cédula, teléfono) antes de completar la venta para el comprobante.</Tip>
            </Section>

            <Section icon={Scaling} title="Tasas de Cambio (BCV y Paralelo)" color="text-orange-500">
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Tasa Oficial (BCV):</strong> global para todas las tiendas. Se actualiza con el botón "Actualizar BCV".</li>
                <li><strong>Tasa de Reposición (Paralelo):</strong> exclusiva de tu tienda. Se usa para calcular tu costo real de reposición en USD en los reportes de finanzas.</li>
              </ul>
              <Tip>Actualiza el paralelo regularmente para que tus reportes de ganancia real sean precisos.</Tip>
            </Section>

            <Section icon={Tag} title="Cupones y Descuentos" color="text-teal-500">
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Cupón:</strong> código creado en la sección <strong>Cupones</strong>. Puede ser porcentaje (%) o monto fijo ($).</li>
                <li><strong>Descuento Manual:</strong> monto libre en $ aplicado directamente. Queda registrado en la venta.</li>
              </ul>
            </Section>

          </AccordionContent>
        </AccordionItem>

        {/* ── FINANZAS ── */}
        <AccordionItem value="finanzas" id="finanzas" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Scaling className="h-5 w-5 text-orange-500" />
              <span className="font-semibold">Finanzas</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">

            <Section icon={Scaling} title="¿Qué son las Finanzas Reales?" color="text-orange-500">
              El módulo de Finanzas te muestra el análisis de ganancias reales (en USD) de tus ventas, considerando el costo de reposición de cada producto.
              <ul className="list-disc pl-4 mt-1 space-y-1">
                <li><strong>Ingreso Total:</strong> suma de los precios de venta.</li>
                <li><strong>Costo Total:</strong> suma del costo de reposición (Costo USD × Tasa Paralela).</li>
                <li><strong>Ganancia Neta:</strong> Ingreso − Costo. Esta es tu ganancia real estimada.</li>
              </ul>
              <Tip>Para que los reportes sean precisos, configura el "Costo de Reposición (USD)" en cada producto al editarlo en Mis Productos.</Tip>
            </Section>

          </AccordionContent>
        </AccordionItem>

        {/* ── ROLES ── */}
        <AccordionItem value="roles" id="roles" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-red-500" />
              <span className="font-semibold">Roles y Aprobaciones</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">

            <Section icon={ShieldCheck} title="Diferencia entre Manager y Empleado" color="text-red-500">
              <div className="overflow-x-auto">
                <table className="w-full text-xs mt-1 border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1 pr-4 font-semibold">Acción</th>
                      <th className="text-center py-1 px-2 font-semibold">Manager</th>
                      <th className="text-center py-1 px-2 font-semibold">Empleado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Ver pedidos", "✅", "✅"],
                      ["Cambiar estado pedido", "✅", "✅"],
                      ["Usar POS", "✅", "✅"],
                      ["Editar precios", "✅", "❌"],
                      ["Eliminar producto", "✅ (directo)", "🔔 requiere aprobación"],
                      ["Ver Finanzas", "✅", "❌"],
                      ["Crear cupones", "✅", "❌"],
                      ["Crear promociones", "✅", "❌"],
                    ].map(([action, manager, employee]) => (
                      <tr key={action as string} className="border-b">
                        <td className="py-1 pr-4">{action}</td>
                        <td className="text-center py-1 px-2">{manager}</td>
                        <td className="text-center py-1 px-2">{employee}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section icon={AlertTriangle} title="Flujo de Aprobaciones" color="text-amber-500">
              Cuando un <strong>Empleado</strong> intenta eliminar un producto, se crea una <strong>solicitud de aprobación</strong> en vez de eliminarlo directamente.
              <ol className="list-decimal pl-4 mt-1 space-y-1">
                <li>El empleado solicita la eliminación.</li>
                <li>El manager recibe la solicitud en la sección <strong>"Aprobaciones"</strong>.</li>
                <li>El manager aprueba (el producto se elimina) o rechaza (no pasa nada).</li>
              </ol>
            </Section>

          </AccordionContent>
        </AccordionItem>

        {/* ── PESO ── */}
        <AccordionItem value="peso" id="peso" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-teal-500" />
              <span className="font-semibold">Venta por Peso (Frutas y Verduras)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-4">

            <Section icon={Scale} title="¿Cómo configuro un producto por peso?" color="text-teal-500">
              <ol className="list-decimal pl-4 space-y-1">
                <li>Al editar el producto en <strong>Mis Productos</strong>, busca el campo <strong>"Unidad de Medida"</strong>.</li>
                <li>Selecciona <strong>Kilogramo (kg)</strong>, <strong>Gramo (gr)</strong> o <strong>Libra (lb)</strong>.</li>
                <li>El campo de <strong>Stock</strong> pasará a aceptar decimales (ej: <code>5.500</code> para 5.5 kg).</li>
                <li>El precio se mostrará como <strong>$/kg</strong> en el POS y en la app.</li>
              </ol>
              <Tip>Si el administrador creó el producto base con la unidad correcta, la heredarás al añadirlo a tu tienda.</Tip>
            </Section>

            <Section icon={Banknote} title="¿Cómo vendo por peso en el POS?" color="text-purple-500">
              <ol className="list-decimal pl-4 space-y-1">
                <li>El producto aparece con un badge <Badge variant="outline" className="text-[10px] font-mono">KG</Badge> en la tabla.</li>
                <li>Al añadirlo al carrito, la cantidad inicial es <strong>0.1</strong> (en lugar de 1).</li>
                <li>Los botones <strong>+/−</strong> ajustan de <strong>0.1 en 0.1</strong>.</li>
                <li>Puedes escribir directamente la cantidad exacta en el input (ej: <code>0.350</code> para 350 gramos).</li>
                <li>El total se calcula automáticamente: cantidad × precio/kg.</li>
              </ol>
              <Warning>La devolución de productos por peso también reintegra el stock en decimales. Asegúrate de ingresar la cantidad pesada correctamente antes de completar la venta.</Warning>
            </Section>

          </AccordionContent>
        </AccordionItem>

      </Accordion>
    </>
  );
}
