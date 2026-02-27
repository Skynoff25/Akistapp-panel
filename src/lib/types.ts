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
  hasPos?: boolean;
  hasFinanceModule?: boolean;

  // Plan tracking
  planExpiresAt?: number;
  lastPaymentAmount?: number;
  lastPaymentDate?: number;

  // Reputation and status
  rating: number;
  ratingCount: number;
  isVerified: boolean;
  isBlocked: boolean;
  blockedReason?: string;

  // Exchange rates specific to this store
  tasaParalela?: number;
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

export interface ProductVariant {
  id: string; // SKU or UUID
  name: string; // "Large", "Red", "1L"
  price: number;
  stock: number;
  sku?: string;
}

export interface StoreProduct {
    id: string;
    storeId: string;
    productId: string;
    price: number;
    promotionalPrice?: number;
    currentStock: number; 
    isAvailable: boolean;
    storeSpecificImage?: string;
    description?: string;
    disclaimer?: string;
    costPriceUsd?: number;
    casheaEligible?: boolean;
    name: string;
    brand: string;
    category: string;
    globalImage: string;
    storeName: string;
    storeAddress: string;

    // New variation fields
    hasVariations: boolean;
    variants: ProductVariant[];
    priceRange?: string | null;
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

// Sincronizado con Kotlin data class User
export interface AppUser {
  id: string; // Map to uid in Kotlin
  email: string | null;
  displayName: string;
  photoUrl: string | null;
  cityId: string;
  cityName: string;
  favoriteStoreIds: string[];
  createdAt: number;
  name: string;
  rol: 'admin' | 'store_manager' | 'store_employee' | 'customer';
  storeId?: string | null;
  phoneNumber?: string | null;
  nationalId?: string | null;

  // Verification status
  emailVerified: boolean;
  isPhoneVerified: boolean;
  isIdentityVerified: boolean;

  // Reputation and status
  rating: number;
  ratingCount: number;
  isBlocked: boolean;
  blockedReason?: string | null;

  // For notifications
  fcmTokens: string[];
  
  // Analytics
  lastLoginAt?: number;
}

export interface GlobalRates {
    tasaOficial: number;
    tasaParalela: number;
    updatedAt: number;
}

export interface CartItemSnapshot {
    inventoryId: string; // ID del documento en la colección 'Inventory'
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    image: string;
    costPriceUsd: number;
    // New variation fields
    variantId?: string;
    variantName?: string;
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
