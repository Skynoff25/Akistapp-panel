import type { Timestamp } from "firebase/firestore";

export type SubscriptionPlan = 'BASIC' | 'STANDARD' | 'PREMIUM';

export interface Store {
  id: string;
  name: string;
  city: string;
  zipcode: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  imageUrl: string;
  subscriptionPlan: SubscriptionPlan;
  isActive: boolean;
  isOpen: boolean; // nuevo campo
  maxProducts: number;
  allowReservations: boolean;
  featured: boolean;
  createdAt: number;
  allowPickup: boolean;
  allowDelivery: boolean;
}

export interface Product {
  id: string; // from productId
  name: string;
  normalizedName: string;
  brand: string;
  description: string;
  category: string;
  image: string;
  tags: string[];
}

export interface StoreProduct {
    id: string;
    storeId: string;
    productId: string;
    price: number;
    isAvailable: boolean;
    currentStock: number;
    storeSpecificImage?: string;
    // Combinamos la info del producto global para facilitar la visualización
    name: string;
    brand: string;
    category: string;
    globalImage: string;
    // Info de la tienda denormalizada para búsquedas
    storeName: string;
    storeAddress: string;
}


export interface User {
  id: string; // from uid
  email: string | null;
  displayName: string;
  photoUrl: string | null;
  cityId: string;
  cityName: string;
  favoriteStoreIds: string[];
  createdAt: number;
  name: string;
}

// This represents the user data stored in the 'users' collection,
// which might be different from the Firebase Auth user object.
export interface AppUser {
  id: string; // from uid
  email: string;
  displayName: string;
  photoUrl: string | null;
  cityId: string;
  cityName: string;
  favoriteStoreIds: string[];
  createdAt: number;
  name: string;
  rol: 'admin' | 'store_manager' | 'store_employee' | 'customer';
  storeId?: string;
}

export interface CartItemSnapshot {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    image: string;
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'READY' | 'DELIVERED' | 'CANCELLED';

export interface Order {
    id: string;
    userId: string;
    storeId: string;
    storeName: string;
    items: CartItemSnapshot[];
    totalAmount: number;
    shippingCost: number;
    deliveryMethod: 'PICKUP' | 'DELIVERY';
    deliveryAddress: string;
    comments: string;
    status: OrderStatus;
    createdAt: number;
    // Campos denormalizados del usuario para fácil acceso
    userName?: string;
    userEmail?: string;
}

export interface Promotion {
  id: string;
  title: string;
  content: string;
  imageUrl: string;
  storeId: string;
  storeName: string; // Denormalized
  cityId: string; // Zipcode
  type: string;
  isActive: boolean;
  createdAt: number;
}
