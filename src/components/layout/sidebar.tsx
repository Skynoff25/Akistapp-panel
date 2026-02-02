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
    Users, 
    LogOut,
    Megaphone,
    ShieldAlert
} from 'lucide-react';
import Image from 'next/image';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/stores', label: 'Tiendas', icon: Store },
  { href: '/dashboard/products', label: 'Productos', icon: Package },
  { href: '/dashboard/users', label: 'Usuarios', icon: Users },
  { href: '/dashboard/promotions', label: 'Promociones', icon: Megaphone },
  { href: '/dashboard/reports', label: 'Denuncias', icon: ShieldAlert },
];

const NavItem = ({ href, label, icon: Icon }: typeof navItems[0]) => {
  const pathname = usePathname();
  const isActive = pathname.startsWith(href) && (href !== '/dashboard' || pathname === '/dashboard');


  return (
    <Link href={href} passHref>
      <Button
        variant={isActive ? 'secondary' : 'ghost'}
        className={cn(
            "w-full justify-start",
            isActive && "text-primary font-semibold"
        )}
      >
        <Icon className="mr-2 h-4 w-4" />
        {label}
      </Button>
    </Link>
  );
};

export default function Sidebar() {
  const { toast } = useToast();

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
        <div className="flex items-center gap-2 mb-8 px-2">
          <Image
              src="/logo.png"
              alt="AkistApp Logo"
              width={40}
              height={40}
          />
          <h1 className="text-xl font-bold">AkistApp</h1>
        </div>
        <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
      
      <div className="my-4 border-t border-border"></div>

      <nav className="flex-grow space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </nav>
    </aside>
  );
}
