"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { StoreProduct, ProductVariant } from "@/lib/types";
import { updateStoreProduct } from "@/app/store/[storeId]/my-products/actions";
import { useAuth } from "@/context/auth-context";
import { useEffect, useState } from "react";
import { Label } from "../ui/label";
import { PlusCircle, Trash2, Wand2, Zap, Link, Upload, Copy, Layers, PackageSearch } from "lucide-react";
import { HelpTip } from "@/components/ui/help-tip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "../ui/separator";

const variantSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "El nombre es obligatorio."),
  price: z.coerce.number().min(0, "El precio debe ser positivo."),
  stock: z.coerce.number().int("El stock debe ser un número entero.").min(0, "El stock no puede ser negativo."),
  costPriceUsd: z.coerce.number().min(0, "El costo no puede ser negativo.").default(0),
  sku: z.string().optional(),
});

const storeProductSchema = z.object({
  price: z.coerce.number().min(0, "El precio no puede ser negativo.").optional(),
  promotionalPrice: z.coerce.number().min(0, "El precio promocional no puede ser negativo.").optional().nullable(),
  // Decimal allowed for weight-based units (KG, GR, LB)
  currentStock: z.coerce.number().min(0, 'El stock no puede ser negativo.').optional(),
  isAvailable: z.boolean(),
  storeSpecificImage: z.any().optional(),
  storeSpecificImageUrl: z.string().optional(),
  description: z.string().optional(),
  disclaimer: z.string().optional(),
  costPriceUsd: z.coerce.number().min(0, 'El costo no puede ser negativo.').optional(),
  casheaEligible: z.boolean(),
  hasVariations: z.boolean(),
  variants: z.array(variantSchema).optional(),
  isGenericBrand: z.boolean().default(false),
  unit: z.enum(['UNIT', 'KG', 'GR', 'LB']).default('UNIT'),
}).superRefine((data, ctx) => {
    if (data.unit === 'UNIT' && data.currentStock !== undefined && !Number.isInteger(data.currentStock)) {
         ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["currentStock"], message: "El stock debe ser un número entero para venta por unidad." });
    }
    if (data.hasVariations) {
        if (!data.variants || data.variants.length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["variants"],
                message: "Debes agregar al menos una variante.",
            });
        }
    } else {
        if (typeof data.price !== 'number') {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["price"], message: "El precio es obligatorio." });
        }
        if (typeof data.currentStock !== 'number') {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["currentStock"], message: "El stock es obligatorio." });
        }
    }
});

type StoreProductFormValues = z.infer<typeof storeProductSchema>;

interface StoreProductFormProps {
  storeId: string;
  product: StoreProduct;
  onSuccess: () => void;
}

export function StoreProductForm({ storeId, product, onSuccess }: StoreProductFormProps) {
  const { toast } = useToast();
  const { appUser } = useAuth();
  const canEditPrice = appUser?.rol === 'store_manager' || appUser?.rol === 'admin';

  const [showGenerator, setShowGenerator] = useState(false);
  const [attr1Name, setAttr1Name] = useState("Color");
  const [attr1Values, setAttr1Values] = useState("");
  const [attr2Name, setAttr2Name] = useState("Talla");
  const [attr2Values, setAttr2Values] = useState("");
  const [batchPrice, setBatchPrice] = useState<number>(0);
  const [batchStock, setBatchStock] = useState<number>(1);
  const [batchCost, setBatchCost] = useState<number>(0);

  const form = useForm<StoreProductFormValues>({
    resolver: zodResolver(storeProductSchema),
    defaultValues: {
      price: 0,
      promotionalPrice: null,
      currentStock: 0,
      isAvailable: true,
      storeSpecificImage: "",
      storeSpecificImageUrl: "",
      description: "",
      disclaimer: "",
      costPriceUsd: 0,
      casheaEligible: false,
      hasVariations: false,
      variants: [],
      isGenericBrand: false,
      unit: "UNIT",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  const hasVariations = form.watch("hasVariations");
  const currentUnit = form.watch("unit");
  const isWeightUnit = currentUnit === 'KG' || currentUnit === 'GR' || currentUnit === 'LB';
  const unitLabel = currentUnit === 'KG' ? 'kg' : currentUnit === 'GR' ? 'gr' : currentUnit === 'LB' ? 'lb' : 'uds';
  const stockStep = isWeightUnit ? '0.001' : '1';

  useEffect(() => {
    if (product) {
        form.reset({
            price: product.price || 0,
            promotionalPrice: product.promotionalPrice || null,
            currentStock: product.currentStock || 0,
            isAvailable: product.isAvailable,
            storeSpecificImage: "",
            storeSpecificImageUrl: product.storeSpecificImage?.startsWith('http') ? product.storeSpecificImage : "",
            description: product.description || "",
            disclaimer: product.disclaimer || "",
            costPriceUsd: product.costPriceUsd || 0,
            casheaEligible: product.casheaEligible || false,
            hasVariations: product.hasVariations || false,
            variants: product.variants || [],
            isGenericBrand: product.isGenericBrand || false,
            unit: product.unit || "UNIT",
        });
        if (product.price > 0 && batchPrice === 0) setBatchPrice(product.price);
        if (product.costPriceUsd && product.costPriceUsd > 0 && batchCost === 0) setBatchCost(product.costPriceUsd);
    }
  }, [product, form]);

  const generateCombinations = () => {
    const vals1 = attr1Values.split(',').map(v => v.trim()).filter(v => v);
    const vals2 = attr2Values.split(',').map(v => v.trim()).filter(v => v);

    if (vals1.length === 0) {
        toast({ variant: 'destructive', title: 'Error', description: 'Debes ingresar al menos un valor en el Atributo 1.' });
        return;
    }

    const newVariants: any[] = [];

    if (vals2.length === 0) {
        vals1.forEach(v1 => {
            newVariants.push({
                id: crypto.randomUUID(),
                name: `${attr1Name}: ${v1}`,
                price: batchPrice,
                stock: batchStock,
                costPriceUsd: batchCost,
            });
        });
    } else {
        vals1.forEach(v1 => {
            vals2.forEach(v2 => {
                newVariants.push({
                    id: crypto.randomUUID(),
                    name: `${attr1Name}: ${v1} / ${attr2Name}: ${v2}`,
                    price: batchPrice,
                    stock: batchStock,
                    costPriceUsd: batchCost,
                });
            });
        });
    }

    newVariants.forEach(v => append(v));
    setShowGenerator(false);
    toast({ title: 'Éxito', description: `Se han generado ${newVariants.length} combinaciones.` });
  };

  const generateBatchPresets = (type: 'shoes' | 'clothing' | 'pants') => {
    let names: string[] = [];
    switch (type) {
      case 'shoes': for (let i = 35; i <= 45; i++) names.push(`Talla ${i}`); break;
      case 'clothing': names = ['XS', 'S', 'M', 'L', 'XL', 'XXL']; break;
      case 'pants': for (let i = 28; i <= 42; i += 2) names.push(`Talla ${i}`); break;
    }
    names.forEach(name => append({ id: crypto.randomUUID(), name, price: batchPrice, stock: batchStock, costPriceUsd: batchCost }));
    toast({ description: `Añadidas ${names.length} variantes.` });
  };

  const handleDuplicateVariant = (index: number) => {
    const variantToCopy = fields[index];
    append({ ...variantToCopy, id: crypto.randomUUID(), name: `${variantToCopy.name} (Copia)` });
  };

  const onSubmit = async (data: StoreProductFormValues) => {
    if (data.currentStock !== undefined) {
        data.currentStock = Math.round(data.currentStock * 1000) / 1000;
    }
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'storeSpecificImage' && key !== 'storeSpecificImageUrl') {
            if (key === 'variants') formData.append(key, JSON.stringify(value));
            else formData.append(key, String(value));
        }
    });
    if (data.storeSpecificImageUrl) formData.append('storeSpecificImageUrl', data.storeSpecificImageUrl);
    if (data.storeSpecificImage instanceof File) formData.append('storeSpecificImage', data.storeSpecificImage);

    const result = await updateStoreProduct(storeId, product.id, formData);
    if (result?.errors) {
        const msg = (result.errors as any)._form ? (result.errors as any)._form.join(", ") : "Error al actualizar";
        form.setError("root.serverError", { message: msg });
    } else {
        toast({ title: "Producto Actualizado", description: `"${product.name}" actualizado.` });
        onSuccess();
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[75vh] overflow-y-auto p-1">

        <FormField
          control={form.control}
          name="isGenericBrand"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-muted/10">
              <div className="space-y-0.5">
                <FormLabel className="text-sm font-medium flex items-center gap-2">
                  <PackageSearch className="h-4 w-4" />
                  ¿Producto genérico / marca variable?
                </FormLabel>
                <FormDescription className="text-xs">Marca variable o no relevante.</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="unit"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 bg-muted/10">
              <div className="space-y-0.5">
                <FormLabel className="text-sm font-medium flex items-center gap-1.5">
                  Unidad de Medida
                  <HelpTip text="KG/GR/LB: para frutas, verduras o productos a granel.\nEl precio y stock aceptarán decimales.\nEl POS mostrará el precio como $/kg." />
                </FormLabel>
                <FormDescription className="text-xs">Para frutas, verduras o productos a granel.</FormDescription>
              </div>
              <Select onValueChange={field.onChange} value={field.value} disabled={hasVariations}>
                <FormControl>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="UNIT">Por Unidad</SelectItem>
                  <SelectItem value="KG">Kilogramo (kg)</SelectItem>
                  <SelectItem value="GR">Gramo (gr)</SelectItem>
                  <SelectItem value="LB">Libra (lb)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="hasVariations"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/20">
              <div className="space-y-0.5">
                <FormLabel className="text-base flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-primary" />
                  Manejar Variantes / Combinaciones
                  <HelpTip text="Activa si el producto tiene tallas, colores o presentaciones distintas.\nCada variante tiene su propio precio y stock.\nNo compatible con Unidad de Medida por peso." />
                </FormLabel>
                <FormDescription>Activa para gestionar tallas, colores o versiones.</FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!canEditPrice} />
              </FormControl>
            </FormItem>
          )}
        />
        
        {hasVariations ? (
            <Card className="border-primary/20">
                <CardHeader className="pb-3 border-b mb-4">
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <CardTitle className="text-lg">Gestor de Variantes</CardTitle>
                          <CardDescription>Crea combinaciones únicas.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                           <Button 
                            type="button" 
                            variant={showGenerator ? "secondary" : "outline"} 
                            size="sm" 
                            onClick={() => setShowGenerator(!showGenerator)}
                            className="gap-2"
                           >
                             <Layers className="h-4 w-4" />
                             {showGenerator ? "Cerrar Constructor" : "Constructor de Combinaciones"}
                           </Button>
                        </div>
                      </div>

                      {showGenerator ? (
                        <div className="space-y-4 p-4 bg-primary/5 rounded-md border border-primary/20 animate-in fade-in slide-in-from-top-2">
                            <h4 className="text-sm font-bold flex items-center gap-2"><Wand2 className="h-4 w-4"/> Generador Automático</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs">Nombre Atributo 1 (ej: Color)</Label>
                                    <Input value={attr1Name} onChange={e => setAttr1Name(e.target.value)} className="h-8 text-xs" />
                                    <Label className="text-xs">Valores (separados por comas)</Label>
                                    <Input value={attr1Values} onChange={e => setAttr1Values(e.target.value)} placeholder="Rojo, Azul, Verde" className="h-8 text-xs" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">Nombre Atributo 2 (Opcional - ej: Talla)</Label>
                                    <Input value={attr2Name} onChange={e => setAttr2Name(e.target.value)} className="h-8 text-xs" />
                                    <Label className="text-xs">Valores (separados por comas)</Label>
                                    <Input value={attr2Values} onChange={e => setAttr2Values(e.target.value)} placeholder="S, M, L" className="h-8 text-xs" />
                                </div>
                            </div>
                            <Separator />
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-bold">Precio sug.</Label>
                                    <Input type="number" value={batchPrice} onChange={e => setBatchPrice(Number(e.target.value))} className="h-8 text-xs" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-bold">Stock sug.</Label>
                                    <Input type="number" value={batchStock} onChange={e => setBatchStock(Number(e.target.value))} className="h-8 text-xs" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[10px] uppercase font-bold">Costo sug.</Label>
                                    <Input type="number" value={batchCost} onChange={e => setBatchCost(Number(e.target.value))} className="h-8 text-xs" />
                                </div>
                                <div className="flex items-end">
                                    <Button type="button" onClick={generateCombinations} className="w-full h-8 text-xs">Generar</Button>
                                </div>
                            </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 bg-muted/30 rounded-md border border-dashed">
                            <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">PVP Sugerido</Label>
                            <Input type="number" className="h-8 text-xs" value={batchPrice} onChange={(e) => setBatchPrice(Number(e.target.value))} />
                            </div>
                            <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Stock Sugerido</Label>
                            <Input type="number" className="h-8 text-xs" value={batchStock} onChange={(e) => setBatchStock(Number(e.target.value))} />
                            </div>
                            <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Costo Sugerido</Label>
                            <Input type="number" className="h-8 text-xs" value={batchCost} onChange={(e) => setBatchCost(Number(e.target.value))} />
                            </div>
                            <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Presets</Label>
                            <Select onValueChange={(v) => generateBatchPresets(v as any)}>
                                <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder="Lote..." /></SelectTrigger>
                                <SelectContent>
                                <SelectItem value="shoes">Zapatos (35-45)</SelectItem>
                                <SelectItem value="clothing">Ropa (XS-XXL)</SelectItem>
                                <SelectItem value="pants">Pantalones (28-42)</SelectItem>
                                </SelectContent>
                            </Select>
                            </div>
                        </div>
                      )}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                         {fields.length === 0 ? (
                            <p className="text-center py-8 text-sm text-muted-foreground italic">No hay variantes aún.</p>
                         ) : fields.map((field, index) => (
                             <div key={field.id} className="grid grid-cols-12 gap-2 items-start border-b pb-4 last:border-0 hover:bg-muted/10 transition-colors px-1">
                                <FormField
                                    control={form.control}
                                    name={`variants.${index}.name`}
                                    render={({ field }) => (
                                        <FormItem className="col-span-4">
                                            <FormLabel className="text-[10px] uppercase text-muted-foreground font-semibold">Variante</FormLabel>
                                            <FormControl><Input className="h-8 text-xs" placeholder="Ej: Rojo / XL" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                 <FormField
                                    control={form.control}
                                    name={`variants.${index}.price`}
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel className="text-[10px] uppercase text-muted-foreground font-semibold">PVP ($)</FormLabel>
                                            <FormControl><Input className="h-8 text-xs" type="number" step="0.01" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`variants.${index}.costPriceUsd`}
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel className="text-[10px] uppercase text-muted-foreground font-semibold">Costo ($)</FormLabel>
                                            <FormControl><Input className="h-8 text-xs" type="number" step="0.01" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name={`variants.${index}.stock`}
                                    render={({ field }) => (
                                        <FormItem className="col-span-2">
                                            <FormLabel className="text-[10px] uppercase text-muted-foreground font-semibold">Stock</FormLabel>
                                            <FormControl><Input className="h-8 text-xs" type="number" step="1" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div className="col-span-2 flex justify-end pt-6 gap-1">
                                     <Button variant="ghost" size="icon" type="button" onClick={() => handleDuplicateVariant(index)} className="text-primary h-8 w-8"><Copy className="h-4 w-4" /></Button>
                                     <Button variant="ghost" size="icon" type="button" onClick={() => remove(index)} className="text-destructive h-8 w-8"><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </div>
                         ))}
                         <Button type="button" variant="outline" size="sm" onClick={() => append({ id: crypto.randomUUID(), name: '', price: batchPrice, stock: batchStock, costPriceUsd: batchCost })} className="w-full border-dashed mt-2">
                            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Variante Manual
                        </Button>
                    </div>
                </CardContent>
            </Card>
        ) : (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="price" render={({ field }) => (
                        <FormItem>
                        <FormLabel>Precio Base {isWeightUnit && <span className="text-muted-foreground font-normal text-xs">(por {unitLabel})</span>}</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                                <Input type="number" step="0.01" className="pl-7" disabled={!canEditPrice} {...field} />
                            </div>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="promotionalPrice" render={({ field }) => (
                        <FormItem>
                        <FormLabel className="flex items-center gap-1.5">
                          Precio Oferta {isWeightUnit && <span className="text-muted-foreground font-normal text-xs">(por {unitLabel})</span>}
                          <HelpTip text="Precio temporal de descuento visible al cliente.\nDeja vacío para mostrar solo el precio base.\nEl precio base aparecerá tachado en la app." />
                        </FormLabel>
                        <FormControl>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                                <Input type="number" step="0.01" className="pl-7" disabled={!canEditPrice} {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))} />
                            </div>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )} />
                </div>
                 <FormField control={form.control} name="currentStock" render={({ field }) => (
                    <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      Stock disponible {isWeightUnit ? `(${unitLabel})` : '(unidades)'}
                      <HelpTip
                        text={isWeightUnit
                          ? `Ingresa el stock en ${unitLabel}. Acepta decimales (ej: 5.500).\nEl POS descontará la cantidad vendida automáticamente.`
                          : "El stock se descuenta automáticamente con cada venta.\nPonlo en 0 si está agotado o desactiva Disponible."}
                      />
                    </FormLabel>
                    <FormControl><Input type="number" step={stockStep} {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />
            </div>
        )}
        
        <div className="space-y-4 border rounded-lg p-4 bg-muted/10">
            <h3 className="font-semibold text-sm">Imagen Específica de Tienda</h3>
            <Tabs defaultValue="url" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="url" className="flex items-center gap-2"><Link className="h-3 w-3"/> URL</TabsTrigger>
                    <TabsTrigger value="upload" className="flex items-center gap-2"><Upload className="h-3 w-3"/> Subir</TabsTrigger>
                </TabsList>
                <TabsContent value="url">
                    <FormField control={form.control} name="storeSpecificImageUrl" render={({ field }) => (
                        <FormItem><FormControl><Input placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </TabsContent>
                <TabsContent value="upload">
                    <FormField control={form.control} name="storeSpecificImage" render={({ field: { onChange, value, ...rest } }) => (
                        <FormItem><FormControl><Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files?.[0])} {...rest} /></FormControl><FormMessage /></FormItem>
                    )} />
                </TabsContent>
            </Tabs>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <FormField control={form.control} name="costPriceUsd" render={({ field }) => (
                <FormItem>
                <FormLabel>Costo de Reposición (USD)</FormLabel>
                <FormDescription className="text-[10px]">Costo base si no usas variantes.</FormDescription>
                <FormControl>
                    <div className="relative">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">$</span>
                        <Input type="number" step="0.01" className="pl-7" {...field} />
                    </div>
                </FormControl>
                </FormItem>
            )} />
        </div>

        <FormField control={form.control} name="description" render={({ field }) => (
            <FormItem><FormLabel>Descripción Personalizada</FormLabel><FormControl><Textarea className="min-h-[100px]" {...field} value={field.value ?? ''} /></FormControl></FormItem>
        )} />
        
        <FormField control={form.control} name="disclaimer" render={({ field }) => (
            <FormItem><FormLabel>Aviso / Garantía</FormLabel><FormControl><Textarea className="min-h-[60px]" {...field} value={field.value ?? ''} /></FormControl></FormItem>
        )} />

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField control={form.control} name="isAvailable" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <FormLabel className="text-sm">Disponible</FormLabel>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />
          <FormField control={form.control} name="casheaEligible" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <FormLabel className="text-sm flex items-center gap-1.5">
                  Cashea
                  <HelpTip text="Marca este producto como elegible para financiamiento por Cashea.\nEl precio debe estar dentro de los límites de la plataforma.\nContacta a Cashea para obtener más información." side="left" />
                </FormLabel>
                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
              </FormItem>
            )} />
        </div>
        
        {form.formState.errors.root?.serverError && <p className="text-sm font-medium text-destructive">{form.formState.errors.root.serverError.message}</p>}

        <Button type="submit" className="w-full py-6" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Guardando..." : "Finalizar y Guardar"}
        </Button>
      </form>
    </Form>
  );
}
