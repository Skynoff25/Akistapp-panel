"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
    LayoutDashboard, 
    Store, 
    Package, 
    LogOut,
    ArrowLeft,
    ShoppingCart,
    Megaphone,
    Banknote
} from 'lucide-react';
import { useDocument } from '@/hooks/use-document';
import type { Store as StoreType } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import Image from 'next/image';

interface StoreSidebarProps {
    storeId: string;
}

export default function StoreSidebar({ storeId }: StoreSidebarProps) {
    const { data: store, loading } = useDocument<StoreType>(`Stores/${storeId}`);
    const { appUser } = useAuth();
    const { toast } = useToast();
    const pathname = usePathname();

    const navItems = [
        { href: `/store/${storeId}`, label: 'Dashboard', icon: LayoutDashboard },
        { href: `/store/${storeId}/my-store`, label: 'Mi Tienda', icon: Store },
        { href: `/store/${storeId}/my-products`, label: 'Mis Productos', icon: Package },
        { href: `/store/${storeId}/orders`, label: 'Pedidos', icon: ShoppingCart },
        { href: `/store/${storeId}/promotions`, label: 'Promociones', icon: Megaphone },
        { href: `/store/${storeId}/pos`, label: 'Punto de Venta', icon: Banknote },
    ];

    const handleLogout = async () => {
        try {
        await signOut(auth);
        toast({
            title: "Sesión Cerrada",
            description: "Has cerrado sesión exitosamente.",
        });
        // AuthProvider will redirect
        } catch (error) {
        console.error("Logout Error:", error);
        toast({
            variant: "destructive",
            title: "Fallo al Cerrar Sesión",
            description: "Ocurrió un error al cerrar la sesión.",
        });
        }
    };

  return (
    <aside className="w-64 flex-shrink-0 border-r bg-card p-4 hidden md:flex flex-col h-screen">
      <div className="flex-shrink-0">
        {appUser?.rol === 'admin' && (
             <Link href="/dashboard" passHref className='mb-2'>
                <Button variant="ghost" className="w-full justify-start">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al Panel Admin
                </Button>
            </Link>
        )}
        <div className="flex items-center gap-2 mb-8 px-2">
          <Image
              src="/logo.png"
              alt="AkistApp Logo"
              width={40}
              height={40}
          />
          <h1 className="text-lg font-bold">{loading ? "Cargando..." : store?.name}</h1>
        </div>
        <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>

      <div className="my-4 border-t border-border"></div>

      <nav className="flex-grow space-y-1 overflow-y-auto">
        {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href) && (item.href !== `/store/${storeId}` || pathname === `/store/${storeId}`);
            return (
                <Link key={item.href} href={item.href} passHref>
                    <Button
                        variant={isActive ? 'secondary' : 'ghost'}
                        className={cn(
                            "w-full justify-start",
                            isActive && "text-primary font-semibold"
                        )}
                    >
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.label}
                    </Button>
                </Link>
            )
        })}
      </nav>
    </aside>
  );
}
