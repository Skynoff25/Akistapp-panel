"use client";

import { useMemo } from "react";
import type { Order, OrderStatus } from "@/lib/types";
import { ShoppingBag, BadgeCheck, PackageCheck, AlertTriangle } from "lucide-react";

interface KpiCardProps {
  label: string;
  count: number;
  icon: React.ReactNode;
  colorClass: string; // Tailwind bg/text classes
  isActive: boolean;
  onClick: () => void;
}

function KpiCard({ label, count, icon, colorClass, isActive, onClick }: KpiCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-200
        cursor-pointer select-none min-w-[150px] flex-1
        ${isActive
          ? `${colorClass} border-current shadow-md scale-[1.02]`
          : "bg-card border-border text-muted-foreground hover:border-current hover:scale-[1.01]"
        }
      `}
    >
      <div className={`p-2 rounded-lg ${isActive ? "bg-white/20" : "bg-muted"}`}>
        {icon}
      </div>
      <div className="text-left">
        <p className="text-2xl font-bold leading-none">{count}</p>
        <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
      </div>
    </button>
  );
}

interface OrderKpiBarProps {
  orders: Order[];
  activeFilter: OrderStatus | "ALL" | "PAYMENT_REPORTED";
  onFilterChange: (filter: OrderStatus | "ALL" | "PAYMENT_REPORTED") => void;
}

export function OrderKpiBar({ orders, activeFilter, onFilterChange }: OrderKpiBarProps) {
  const kpis = useMemo(() => {
    const pending = orders.filter((o) => o.status === "PENDING").length;
    const paymentReported = orders.filter(
      (o) => ["PENDING", "CONFIRMED", "READY", "EXPIRED_WARNING"].includes(o.status) && !!o.paymentMessage
    ).length;
    const ready = orders.filter((o) => o.status === "READY").length;
    const expired = orders.filter((o) => o.status === "EXPIRED_WARNING").length;
    return { pending, paymentReported, ready, expired };
  }, [orders]);

  return (
    <div className="flex flex-wrap gap-3 mb-5">
      <KpiCard
        label="Nuevas / Pendientes"
        count={kpis.pending}
        icon={<ShoppingBag className="h-4 w-4" />}
        colorClass="bg-amber-50 text-amber-700 border-amber-400"
        isActive={activeFilter === "PENDING"}
        onClick={() =>
          activeFilter === "PENDING" ? onFilterChange("ALL") : onFilterChange("PENDING")
        }
      />
      <KpiCard
        label="Pago Reportado"
        count={kpis.paymentReported}
        icon={<BadgeCheck className="h-4 w-4" />}
        colorClass="bg-emerald-50 text-emerald-700 border-emerald-400"
        isActive={activeFilter === "PAYMENT_REPORTED"}
        onClick={() =>
          activeFilter === "PAYMENT_REPORTED"
            ? onFilterChange("ALL")
            : onFilterChange("PAYMENT_REPORTED")
        }
      />
      <KpiCard
        label="Listos para Entregar"
        count={kpis.ready}
        icon={<PackageCheck className="h-4 w-4" />}
        colorClass="bg-blue-50 text-blue-700 border-blue-400"
        isActive={activeFilter === "READY"}
        onClick={() =>
          activeFilter === "READY" ? onFilterChange("ALL") : onFilterChange("READY")
        }
      />
      <KpiCard
        label="Reservas Vencidas"
        count={kpis.expired}
        icon={<AlertTriangle className="h-4 w-4" />}
        colorClass="bg-red-50 text-red-700 border-red-400"
        isActive={activeFilter === "EXPIRED_WARNING"}
        onClick={() =>
          activeFilter === "EXPIRED_WARNING"
            ? onFilterChange("ALL")
            : onFilterChange("EXPIRED_WARNING")
        }
      />
    </div>
  );
}
