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
  isOpen: boolean;
  maxProducts: number;
  allowReservations: boolean;
  featured: boolean;
  createdAt: number;
  allowPickup: boolean;
  allowDelivery: boolean;
  deliveryType?: 'FIXED' | 'AGREEMENT';
  deliveryFee?: number;
  sponsoredKeywords?: string[];

  // Reputation and status
  rating: number;
  ratingCount: number;
  isVerified: boolean;
  isBlocked: boolean;
  blockedReason?: string;
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
    promotionalPrice?: number;
    isAvailable: boolean;
    currentStock: number;
    storeSpecificImage?: string;
    // New Finance Fields
    costPriceUsd?: number;
    casheaEligible?: boolean;
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
  phoneNumber?: string;
  nationalId?: string;

  // Verification status
  emailVerified: boolean;
  isPhoneVerified: boolean;
  isIdentityVerified: boolean;

  // Reputation and status
  rating: number;
  ratingCount: number;
  isBlocked: boolean;
  blockedReason?: string;

  // For notifications
  fcmTokens: string[];
}

export interface CartItemSnapshot {
    inventoryId: string; // ID del documento en la colección 'Inventory'
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    image: string;
    costPriceUsd: number;
}

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'READY' | 'DELIVERED' | 'CANCELLED';
export type OrderType = 'ONLINE' | 'IN_STORE';

export interface Order {
    id: string;
    userId: string; // Puede ser un ID genérico para ventas en tienda
    storeId: string;
    storeName: string;
    items: CartItemSnapshot[];
    totalAmount: number;
    shippingCost: number;
    status: OrderStatus;
    createdAt: number;
    type: OrderType;
    inventoryDeducted?: boolean;

    // --- Exchange rates at time of sale ---
    tasaOficial?: number;
    tasaParalela?: number;

    // --- Campos Opcionales (principalmente para pedidos ONLINE) ---
    deliveryMethod?: 'PICKUP' | 'DELIVERY';
    deliveryAddress?: string;
    comments?: string;
    userName?: string;
    userEmail?: string;
    userPhoneNumber?: string;
    userNationalId?: string;
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
  expiresAt: number;
}

export type ReportStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';

export interface Report {
  id: string;
  reportedBy: string; // UID of the reporter
  reportedUser?: { id: string; name: string; email: string };
  reportedStore?: { id: string; name: string };
  reason: string;
  comments: string;
  status: ReportStatus;
  createdAt: number;
  // Context
  orderId?: string;
}
