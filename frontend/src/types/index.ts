export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  created_at: string;
}

export interface Category {
  id: number;
  name: string;
  description?: string;
}

export interface Rack {
  id: number;
  rack_code: string;
  name: string;
  description?: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
}

export interface RFIDTag {
  id: number;
  uid: string;
  product_id?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'UNASSIGNED';
  assigned_at?: string;
  unassigned_at?: string;
  product_name?: string;
  product_code?: string;
}

export interface Product {
  id: number;
  product_id: string;
  name: string;
  category_id?: number;
  category?: Category;
  description?: string;
  supplier?: string;
  unit: string;
  minimum_stock: number;
  image_url?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  current_quantity: number;
  rack_code: string;
  rfid_uid?: string;
  stock_status: 'OK' | 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK';
  last_detected?: string;
  rfid_tags?: RFIDTag[];
}

export interface InventoryItem {
  id: number;
  product_id: number;
  product_code: string;
  product_name: string;
  category_name?: string;
  rfid_uid?: string;
  rack_id: number;
  rack_code: string;
  quantity: number;
  minimum_stock: number;
  stock_status: 'OK' | 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK';
  last_detected?: string;
  updated_at: string;
}

export type TransactionType =
  | 'RECEIVE'
  | 'ADD'
  | 'REMOVE'
  | 'DISPATCH'
  | 'RETURN'
  | 'DAMAGE'
  | 'ADJUSTMENT';

export interface InventoryTransaction {
  id: number;
  product_id: number;
  product_code: string;
  product_name: string;
  rfid_uid?: string;
  rack_id: number;
  rack_code: string;
  type: TransactionType;
  quantity_change: number;
  previous_quantity: number;
  new_quantity: number;
  reason?: string;
  user_id?: number;
  user_name?: string;
  created_at: string;
}

export interface RFIDEvent {
  id: number;
  uid: string;
  product_id?: number;
  product_code?: string;
  product_name?: string;
  reader_id: string;
  device_id: string;
  rack_id?: number;
  rack_code?: string;
  event_type: 'DETECTED' | 'UNKNOWN' | 'REGISTER';
  source: string;
  timestamp: string;
}

export interface Reader {
  id: number;
  reader_id: string;
  device_id: string;
  rack_id: number;
  rack_code?: string;
  status: 'CONNECTED' | 'DISCONNECTED';
  last_seen?: string;
}

export interface Device {
  id: number;
  device_id: string;
  type: string;
  status: 'ONLINE' | 'OFFLINE';
  ip_address?: string;
  last_heartbeat?: string;
  firmware_version: string;
  uptime_seconds: number;
  readers: Reader[];
}

export interface Alert {
  id: number;
  type: 'LOW_STOCK' | 'CRITICAL_STOCK' | 'UNKNOWN_RFID' | 'DEVICE_OFFLINE' | 'READER_OFFLINE' | 'INVALID_EVENT';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  message: string;
  related_product_id?: number;
  product_name?: string;
  related_device_id?: string;
  status: 'UNRESOLVED' | 'RESOLVED';
  created_at: string;
  resolved_at?: string;
  resolved_by?: number;
  resolver_name?: string;
}

export interface CategoryStockSummary {
  category: string;
  product_count: number;
  total_quantity: number;
}

export interface DailyStockChange {
  date: string;
  received: number;
  dispatched: number;
  net_change: number;
}

export interface TopActiveProduct {
  product_id: string;
  name: string;
  total_events: number;
  current_stock: number;
}

export interface DemandForecastItem {
  product_id: string;
  name: string;
  current_stock: number;
  avg_daily_usage: number;
  estimated_stockout_days?: number;
  recommended_reorder: number;
  has_sufficient_data: boolean;
  status_message: string;
}

export interface AnalyticsSummary {
  total_products: number;
  total_quantity: number;
  low_stock_count: number;
  critical_stock_count: number;
  active_rfid_tags: number;
  today_transactions_count: number;
  today_rfid_scans_count: number;
  unresolved_alerts_count: number;
  category_breakdown: CategoryStockSummary[];
  daily_trends: DailyStockChange[];
  active_products: TopActiveProduct[];
  demand_forecasts: DemandForecastItem[];
}
