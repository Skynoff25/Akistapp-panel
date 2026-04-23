"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { SystemConfig } from '@/lib/types';
import { AlertCircle, Save, Loader2, DollarSign } from 'lucide-react';
import { getGlobalRates, updateGlobalRates } from '@/app/dashboard/rates-actions';

export default function SystemSettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRates, setSavingRates] = useState(false);
  
  const [rates, setRates] = useState({ tasaOficial: 36.5, tasaParalela: 40.0 });
  
  const [config, setConfig] = useState<SystemConfig>({
    isAppBlocked: false,
    blockMessage: 'La aplicación se encuentra en mantenimiento preventivo. Intenta más tarde.',
    minAppVersion: '1.0.0',
    updateMessage: 'Hay una nueva versión obligatoria de la app.',
    storeUrl: 'https://play.google.com/store/apps/details?id=com.skynoff.akistapp'
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'System', 'config');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setConfig(snap.data() as SystemConfig);
        }
        
        const globalRates = await getGlobalRates();
        setRates({ tasaOficial: globalRates.tasaOficial, tasaParalela: globalRates.tasaParalela });
      } catch (err) {
        console.error("Error fetching config", err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  const handleSaveRates = async () => {
      setSavingRates(true);
      const res = await updateGlobalRates(rates.tasaOficial, rates.tasaParalela);
      setSavingRates(false);
      if (res.error) {
          toast({ variant: 'destructive', title: 'Error', description: res.error });
      } else {
          toast({ title: 'Tasas actualizadas', description: 'Las tasas globales se actualizaron manualmente.' });
      }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const docRef = doc(db, 'System', 'config');
      await setDoc(docRef, config, { merge: true });
      toast({
        title: "Configuración guardada",
        description: "Los parámetros de control de la App se han actualizado con éxito.",
      });
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error al guardar",
        description: err.message,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-full mt-20"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Configuración del Sistema" 
        description="Parámetros globales y controles de emergencia para la aplicación móvil." 
      />

      <Card className={config.isAppBlocked ? "border-destructive flex-1 justify-center relative overflow-hidden ring-destructive ring-2" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className={config.isAppBlocked ? "text-destructive" : ""} />
            Control de Emergencia de la App
          </CardTitle>
          <CardDescription>
            Usa estas opciones para bloquear el acceso a la App Móvil de manera inmediata en todos los dispositivos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between border p-4 rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label className="text-base">Bloquear Aplicación</Label>
              <p className="text-sm text-muted-foreground">Si está activo, ningún usuario podrá utilizar la aplicación móvil.</p>
            </div>
            <Switch 
              checked={config.isAppBlocked}
              onCheckedChange={(checked) => setConfig({ ...config, isAppBlocked: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="blockMessage">Mensaje de Bloqueo</Label>
            <Input 
              id="blockMessage"
              value={config.blockMessage}
              onChange={(e) => setConfig({ ...config, blockMessage: e.target.value })}
              placeholder="Ej: Mantenimiento programado."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Control de Versiones</CardTitle>
          <CardDescription>
            Obliga a todos los usuarios que tengan una versión menor a la indicada a actualizar la App.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="minAppVersion">Versión Mínima Requerida (X.Y.Z)</Label>
            <Input 
              id="minAppVersion"
              value={config.minAppVersion}
              onChange={(e) => setConfig({ ...config, minAppVersion: e.target.value })}
              placeholder="Ej: 1.0.5"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="updateMessage">Mensaje para Actualizar</Label>
            <Input 
              id="updateMessage"
              value={config.updateMessage}
              onChange={(e) => setConfig({ ...config, updateMessage: e.target.value })}
              placeholder="Ej: Hay una actualización obligatoria disponible."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="storeUrl">URL de la Tienda de Apps</Label>
            <Input 
              id="storeUrl"
              value={config.storeUrl}
              onChange={(e) => setConfig({ ...config, storeUrl: e.target.value })}
              placeholder="Enlace a Google Play o App Store"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><DollarSign className="w-5 h-5"/> Tasas de Cambio Globales</CardTitle>
          <CardDescription>
            Configuración manual de la Tasa BCV Oficial y Paralela por defecto en caso de que falle la actualización automática.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tasaOficial">Tasa Oficial (BCV)</Label>
                <Input 
                  id="tasaOficial"
                  type="number"
                  step="0.01"
                  value={rates.tasaOficial}
                  onChange={(e) => setRates({ ...rates, tasaOficial: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tasaParalela">Tasa Paralela Sugerida</Label>
                <Input 
                  id="tasaParalela"
                  type="number"
                  step="0.01"
                  value={rates.tasaParalela}
                  onChange={(e) => setRates({ ...rates, tasaParalela: parseFloat(e.target.value) || 0 })}
                />
              </div>
          </div>
          <Button onClick={handleSaveRates} disabled={savingRates} variant="secondary">
            {savingRates ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Actualizar Tasas
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Guardar Configuración
        </Button>
      </div>
    </div>
  );
}
