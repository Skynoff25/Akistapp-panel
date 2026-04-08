# Resumen Funcional de AkistApp Control Panel

El Panel de Control de AkistApp es una plataforma integral diseñada con dos capas de administración principales: un **Panel Global (Super Admin)** para la gestión total del sistema, y un **Panel de Tienda (Store Dashboard)** enfocado en la operatividad diaria de cada negocio afiliado.

A continuación, se detalla el alcance y las funciones de cada módulo.

---

## 1. Panel de Administración Global (Super Admin)
_Sección orientada a los dueños e ingenieros de la plataforma AkistApp. Permite una visión panóptica y un control absoluto sobre el ecosistema._

* **Dashboard Global:** Visualización de métricas de nivel general, ingresos totales y actividad del ecosistema.
* **Gestión de Pedidos Globales:** Monitoreo en tiempo real de todas las transacciones (`ONLINE` y `IN_STORE`) que ocurren a través de las distintas tiendas.
* **Módulo de Tiendas:**
  * Creación, edición, verificación y suspensión (bloqueo) de tiendas y comercios suscritos.
  * Gestión de suscripciones y vigencia del plan (Basic, Pro/Premium).
  * Habilitación controlada de submódulos avanzados (Módulo Punto de Venta POS, Módulo de Finanzas/OCR).
* **Gestión del Catálogo Común (Productos globales):** Visualización o precarga de catálogo maestro, etiquetas y categorías generales.
* **Gestión de Usuarios:**
  * Visualización de todos los perfiles de la app móvil y del panel web (roles: administrador, gerente, empleado, cliente).
  * Control de reputación (Rating), verificación de teléfonos e identidad, y baneo/bloqueo de cuentas con motivos justificados.
* **Módulo de Promociones y Marketing:** Visualización y control sobre las pautas, banners o promociones que se empujan a la App Móvil.
* **Centro de Resolución y Denuncias:** Panel para auditar los reportes o quejas elevados por los clientes respecto a productos o transacciones con las tiendas de la plataforma.
* **Motor de Notificaciones (Push FCM):** Envió masivo o segmentado de Notificaciones Push directo a los dispositivos de los clientes.
* **Panel de Configuración General e Infraestructura:**
  * **Kill Switch / Modo Emergencia:** Interruptor para bloquear globalmente el acceso a la app móvil con mensaje personalizado en caso de mantenimiento crítico.
  * **Actualización Forzosa:** Definición de la versión mínima permitida; si el cliente posee una inferior, será redirigido a la Play Store / App Store.
  * **Tasa BCV Centralizada:** Actualización y seguimiento de la tasa oficial como fallback o referencia del sistema.
  * **Gestión de Normativas:** Control de los Textos de Políticas de Privacidad, Términos y Condiciones, y Centro de Ayuda compartidos hacia la app móvil.

---

## 2. Panel de Gestión de Tienda (Store Dashboard)
_Interfaz dedicada a los propietarios y empleados de cada comercio (SaaS). Soporta roles para evitar que los empleados regulares accedan a configuraciones delicadas._

* **Dashboard del Comercio:** Indicadores de rendimiento locales, órdenes del día y estados de venta.
* **Mi Tienda (Configuración de Negocio):**
  * Actualización de datos públicos: Horarios, Teléfonos de contacto (soporte), dirección física.
  * **Pasarelas y Métodos de Pago:** Configuración dinámica de opciones (Pago Móvil, Zelle, Efectivo, Punto) que los usuarios verán desde la app, junto a sus detalles y números de cuenta.
* **Gestión de Inventario (Mis Productos):**
  * Creación / Edición completa de productos con imágenes.
  * **Modificadores y Variantes:** Añadir distintas versiones (ej. Tallas, Colores) que manejan precios distintos y su propio inventario descontable.
  * **Soporte de Unidades:** Productos por Unidad estándar, o decimales basados en Peso (kg, gr, lb).
* **Gestión de Pedidos (Orders & Fulfillment):**
  * Columna vertebral operativa. Cambio de estados de transacción (`Pendiente` -> `Confirmado` -> `Proceso` -> `Entregado` / `Devuelto` / `Cancelado`).
  * **Deducción Inteligente de Inventario:** El inventario se restaura automáticamente si un pedido con múltiples variantes o pesos es cancelado/devuelto, o se deduce en entregas.
  * **Consola de Edición Post-Venta y Correcciones:** Habilidad de modificar un pedido en curso, eliminar productos sobrantes o ajustar pesos precisos sin chocar con reglas de validación.
  * Creación y pre-visualización de Notas de Entrega / Comprobantes (Print-Ready) aptas para tickeras de 80mm/58mm.
* **Módulo de Fidelización (Cupones y Descuentos):**
  * Creación de códigos canjeables en la app móvil.
  * Permite establecer porcentajes de descuento globales o montos fijos con fecha de caducidad y estricta validación en vivo.
* **Punto de Venta Integrado (POS):** *(Solo si es habilitado por Super Admin)*
  * Terminal online para procesar ventas de piso o caja (Mostrador) usando el mismo inventario.
  * Soporte multipago rápido, aplicación de descuentos manuales condicionados solo a Gerentes, y bloqueador de seguridad si la Tasa BCV local ha expirado o está desactualizada para evitar pérdidas en la conversión Bs/USD.
* **Módulo de Finanzas e ISLR (Finanzas Reales - Venezuela):** *(Solo si es habilitado)*
  * **Motor OCR de Facturas:** Los dueños suben fotos de facturas físicas de sus proveedores.
  * El sistema auto extrae mediante IA el RIF, Razón Social (con heurísticas para identificar C.A. / S.A.), montos totales de artículos comprados, y consolida gastos.
  * Libreta de Proveedores autocompletable: Si la IA detecta que el proveedor cambió de dirección pero el RIF coincide, actualiza la libreta interna automáticamente.
  * **Exportación de Retenciones SENIAT:** Emisión en formato `TXT` especializado y agrupación quincenal de reportes contables.
* **Aprobaciones (Governance):**
  * Buzón donde las acciones ejecutadas por perfiles "Empleado", tales como la Solicitud de Eliminación de un Producto, quedan "Pendientes" hasta que el dueño o gerente las apruebe limitando los riesgos o errores malintencionados.
* **Centro de Ayuda:** Portal local para revisar manuales, contacto con administración y guías rápidas de plataforma.
