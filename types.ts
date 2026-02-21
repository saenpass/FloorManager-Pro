
export interface Category {
  id: number;
  name: string;
  order_index: number;
  color: string;
}

export interface Position {
  id: number;
  brand: string;
  name: string;
  categoryId: number;
  price: string;
  unit: string;
  quantity: number;
  external_id?: string;
}

export interface WorkCategory {
  id: number;
  name: string;
}

export interface WorkPosition {
  id: number;
  categoryId: number;
  name: string;
  price: string;
  unit: string;
}

export interface Order {
  id: number;
  invoice_number: string | null;
  order_date: string;
  client_name: string;
  client_phone: string;
  prepayment: string;
  delivery_address: string;
  shipping_date: string | null;
  cargo_status_id: number; // This maps to the numeric ID in the provided data
  note: string | null;
  remind: boolean;
  remind_at?: string | null;
  is_completed: boolean;
  is_deleted: boolean;
  created_at?: string;
  updated_at?: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: number;
  orderId: number;
  positionId?: number;
  position_name: string;
  category_name: string;
  quantity: number;
  price: string;
  discount: string;
  total_price: string;
}

export interface CargoStatus {
  id: number;
  name: string;
  order_index: number;
  color: string;
  text_color: string;
}

export interface UserPermissions {
  dashboard: 'view' | 'edit' | 'none';
  orders: 'view' | 'edit' | 'none';
  positions: 'view' | 'edit' | 'none';
  categories: 'view' | 'edit' | 'none';
  debtors: 'view' | 'edit' | 'none';
  analytics: 'view' | 'edit' | 'none';
  settings: 'view' | 'edit' | 'none';
}

export interface User {
  id: number;
  username: string;
  password?: string;
  role: 'admin' | 'user';
  permissions: UserPermissions;
}

export type TabType = 'dashboard' | 'orders' | 'order-create' | 'order-edit' | 'positions' | 'categories' | 'debtors' | 'analytics' | 'calculator' | 'settings';

export interface AppTab {
  id: string;
  type: TabType;
  title: string;
  params?: any;
}
