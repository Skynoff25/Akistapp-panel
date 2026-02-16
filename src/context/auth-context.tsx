"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onIdTokenChanged, User, signOut } from 'firebase/auth'; 
import { auth, areFirebaseCredentialsSet, db } from '@/lib/firebase';
import { usePathname, useRouter } from 'next/navigation';
import Loader from '@/components/ui/loader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import type { AppUser } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Cookies from 'js-cookie'; 

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, appUser: null, loading: true });

function FirebaseConfigChecker({ children }: { children: React.ReactNode }) {
    if (!areFirebaseCredentialsSet) {
        return (
            <div className="flex h-screen items-center justify-center bg-background p-4">
                <Alert variant="destructive" className="max-w-lg">
                    <Terminal className="h-4 w-4" />
                    <AlertTitle>Falta la Configuración de Firebase</AlertTitle>
                    <AlertDescription>
                        Las variables de entorno de Firebase no están configuradas. Por favor, crea un archivo <code>.env.local</code> y añade las credenciales de tu proyecto de Firebase. Revisa <code>.env.local.example</code> para ver las variables requeridas.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }
    return <>{children}</>;
}


export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    if (!areFirebaseCredentialsSet) {
        setLoading(false);
        return;
    }
    
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const token = await user.getIdToken();
        Cookies.set('token', token, { path: '/' }); 

        const userDocRef = doc(db, 'Users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setAppUser({ id: userDocSnap.id, ...userDocSnap.data() } as AppUser);
        } else {
          setAppUser(null);
          await signOut(auth);
        }
      } else {
        Cookies.remove('token', { path: '/' });
        setAppUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loading || !areFirebaseCredentialsSet) return;
    
    const isAuthPage = pathname === '/login';

    if (!user) {
      if (!isAuthPage) {
        router.push('/login');
      }
      return;
    }

    if (!appUser) {
      return;
    }

    if (appUser.rol === 'customer') {
      signOut(auth);
      toast({
        variant: 'destructive',
        title: 'Acceso Denegado',
        description: 'Los clientes no tienen acceso a este panel de administración.',
      });
      return;
    }
    
    const isStorePanel = pathname?.startsWith('/store');
    const isAdminPanel = pathname?.startsWith('/dashboard');

    if (isAuthPage) {
        if (appUser.rol === 'admin') {
            router.push('/dashboard');
        } else if ((appUser.rol === 'store_manager' || appUser.rol === 'store_employee') && appUser.storeId) {
            router.push(`/store/${appUser.storeId}`);
        }
    } else { 
        if (appUser.rol === 'admin' && !isAdminPanel) {
             router.push('/dashboard');
        } else if ((appUser.rol === 'store_manager' || appUser.rol === 'store_employee') && !isStorePanel) {
            if (appUser.storeId) {
                router.push(`/store/${appUser.storeId}`);
            } else {
                signOut(auth);
                toast({ variant: 'destructive', title: 'Error de Cuenta', description: 'No tienes una tienda asignada.' });
            }
        }
    }

  }, [user, appUser, loading, pathname, router, toast]);

  const isAuthPage = pathname === '/login';

  if (loading && !isAuthPage) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <Loader text="Autenticando..." />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, appUser, loading }}>
        <FirebaseConfigChecker>
            {children}
        </FirebaseConfigChecker>
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);