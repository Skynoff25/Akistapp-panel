"use client";

import { useState } from 'react';
import { signInWithEmailAndPassword, signOut, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { AppUser } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { LogIn } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await setPersistence(auth, browserSessionPersistence);

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const userDocRef = doc(db, 'Users', userCredential.user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const appUser = userDocSnap.data() as AppUser;
        if (appUser.rol === 'customer') {
          await signOut(auth);
          toast({
            variant: "destructive",
            title: "Acceso Denegado",
            description: "Los clientes no tienen acceso a este panel de administración.",
          });
        } else {
          toast({
            title: "Inicio de Sesión Exitoso",
            description: "¡Bienvenido de nuevo!",
          });
        }
      } else {
        await signOut(auth);
        toast({
          variant: 'destructive',
          title: 'Error de Cuenta',
          description: 'No se encontró la información de tu cuenta. Contacta a soporte.',
        });
      }
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Fallo en el Inicio de Sesión",
        description: error.message || "Ocurrió un error desconocido.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm mx-4">
        <CardHeader className="text-center">
            <div className="flex justify-center items-center mb-4">
                <Image
                    src="/akistapp_logo.png"
                    alt="AkistApp Logo"
                    width={56}
                    height={56}
                />
            </div>
          <CardTitle className="text-2xl font-bold">AkistApp Admin</CardTitle>
          <CardDescription>Introduce tus credenciales para acceder al panel</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
              ) : (
                <LogIn className="mr-2 h-4 w-4" />
              )}
              Iniciar Sesión
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
