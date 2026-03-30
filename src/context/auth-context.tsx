
"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onIdTokenChanged, User, signOut } from 'firebase/auth'; 
import { auth, areFirebaseCredentialsSet, db } from '@/lib/firebase';
import { usePathname, useRouter } from 'next/navigation';
import Loader from '@/components/ui/loader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
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
                        Las variables de entorno de Firebase no están configuradas. Por favor, crea un archivo <code>.env.local</code> y añade las credenciales de tu proyecto de Firebase.
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
    
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Sincronizar token con cookie para que el servidor (Server Actions) pueda leerlo
        const token = await firebaseUser.getIdToken(true); // Force refresh to ensure validity
        
        // Configuramos la cookie de forma que sea accesible para las Server Actions
        // secure: false en desarrollo si no hay HTTPS, lax es más compatible que strict para tokens de sesión
        Cookies.set('token', token, { 
            expires: 7, 
            secure: window.location.protocol === 'https:', 
            sameSite: 'lax',
            path: '/' 
        });

        const userDocRef = doc(db, 'Users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const data = userDocSnap.data() as AppUser;
          
          if (data.isBlocked) {
            setAppUser(null);
            Cookies.remove('token', { path: '/' });
            await signOut(auth);
            toast({
                variant: 'destructive',
                title: 'Cuenta Bloqueada',
                description: data.blockedReason || 'Tu cuenta ha sido suspendida. Contacta a soporte.',
            });
          } else {
            setAppUser({ ...data, id: userDocSnap.id });
            // Update last login
            updateDoc(userDocRef, { lastLoginAt: Date.now() }).catch(() => {});
          }
        } else {
          setAppUser(null);
          if (pathname !== '/login') {
             Cookies.remove('token', { path: '/' });
             await signOut(auth);
          }
        }
      } else {
        setAppUser(null);
        Cookies.remove('token', { path: '/' });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [toast, pathname]);

  useEffect(() => {
    if (loading || !areFirebaseCredentialsSet) return;
    
    const isPublicPage = pathname?.startsWith('/legal') || pathname === '/login';
    const isLoginPage = pathname === '/login';
    const isStorePanel = pathname?.startsWith('/store');
    const isAdminPanel = pathname?.startsWith('/dashboard');

    if (!user) {
      if (!isPublicPage) {
        router.push('/login');
      }
      return;
    }

    if (!appUser) return;

    if (appUser.rol === 'customer') {
      signOut(auth);
      Cookies.remove('token', { path: '/' });
      toast({
        variant: 'destructive',
        title: 'Acceso Denegado',
        description: 'Los clientes no tienen acceso a este panel de administración.',
      });
      return;
    }
    
    if (isLoginPage) {
        if (appUser.rol === 'admin') {
            router.push('/dashboard');
        } else if ((appUser.rol === 'store_manager' || appUser.rol === 'store_employee') && appUser.storeId) {
            router.push(`/store/${appUser.storeId}`);
        }
    } else { 
        if (appUser.rol === 'admin' && !isAdminPanel && !isStorePanel && !isPublicPage) {
             router.push('/dashboard');
        } else if ((appUser.rol === 'store_manager' || appUser.rol === 'store_employee') && !isStorePanel && !isPublicPage) {
            if (appUser.storeId) {
                router.push(`/store/${appUser.storeId}`);
            } else {
                signOut(auth);
                Cookies.remove('token', { path: '/' });
                toast({ variant: 'destructive', title: 'Error de Cuenta', description: 'No tienes una tienda asignada.' });
            }
        }
    }

  }, [user, appUser, loading, pathname, router, toast]);

  const isPublicPage = pathname?.startsWith('/legal') || pathname === '/login';

  if (loading && !isPublicPage) {
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
