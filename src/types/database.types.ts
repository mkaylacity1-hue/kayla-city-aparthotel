export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type StaffRole = "owner" | "manager" | "receptionist" | "housekeeping" | "security";
export type TaskStatus = "pending" | "in_progress" | "done" | "cancelled";
export type RoomStatus = "available" | "occupied" | "cleaning" | "cleaned" | "maintenance";
export type BookingStatus = "reserved" | "checked_in" | "checked_out" | "cancelled";
export type Shift = "morning" | "afternoon" | "night";

export interface Database {
  public: {
    Tables: {
      properties: {
        Row: { id: string; name: string; created_at: string };
        Insert: { id?: string; name: string; created_at?: string };
        Update: { id?: string; name?: string };
      };
      staff: {
        Row: { id: string; property_id: string | null; full_name: string; role: StaffRole; is_active: boolean; created_at: string };
        Insert: { id: string; property_id?: string | null; full_name: string; role: StaffRole; is_active?: boolean; created_at?: string };
        Update: { property_id?: string | null; full_name?: string; role?: StaffRole; is_active?: boolean };
      };
      unit_types: {
        Row: { id: string; property_id: string; name: string; base_price_per_night: number; base_price_ghs: number; base_price_usd: number; created_at: string };
        Insert: { id?: string; property_id: string; name: string; base_price_ghs: number; base_price_usd: number; created_at?: string };
        Update: { name?: string; base_price_ghs?: number; base_price_usd?: number };
      };
      units: {
        Row: { id: string; property_id: string; unit_type_id: string; unit_number: string; status: RoomStatus; floor: string | null; notes: string | null; price_override: number | null; price_override_ghs: number | null; price_override_usd: number | null; created_at: string };
        Insert: { id?: string; property_id: string; unit_type_id: string; unit_number: string; status?: RoomStatus; floor?: string | null; notes?: string | null; price_override_ghs?: number | null; price_override_usd?: number | null };
        Update: { unit_number?: string; unit_type_id?: string; status?: RoomStatus; floor?: string | null; notes?: string | null; price_override_ghs?: number | null; price_override_usd?: number | null };
      };
      seasonal_rates: {
        Row: { id: string; unit_type_id: string; label: string; start_date: string; end_date: string; price_ghs: number; price_usd: number; created_at: string };
        Insert: { id?: string; unit_type_id: string; label: string; start_date: string; end_date: string; price_ghs: number; price_usd: number };
        Update: { label?: string; start_date?: string; end_date?: string; price_ghs?: number; price_usd?: number };
      };
      guests: {
        Row: { id: string; property_id: string; full_name: string; phone: string | null; email: string | null; id_document_type: string | null; id_document_number: string | null; notes: string | null; created_at: string };
        Insert: { id?: string; property_id: string; full_name: string; phone?: string | null; email?: string | null; id_document_type?: string | null; id_document_number?: string | null; notes?: string | null };
        Update: { full_name?: string; phone?: string | null; email?: string | null; id_document_type?: string | null; id_document_number?: string | null; notes?: string | null };
      };
      reservations: {
        Row: { id: string; property_id: string; unit_id: string; guest_id: string; check_in_date: string; check_out_date: string; check_in_time: string | null; check_out_time: string | null; rate_ghs: number | null; rate_usd: number | null; currency: string; total_amount: number | null; status: BookingStatus; is_walk_in: boolean; invoice_sent: boolean; checkout_notif_sent: boolean; created_by: string | null; notes: string | null; created_at: string };
        Insert: { id?: string; property_id: string; unit_id: string; guest_id: string; check_in_date: string; check_out_date: string; rate_ghs?: number | null; rate_usd?: number | null; currency?: string; total_amount?: number | null; status?: BookingStatus; is_walk_in?: boolean; invoice_sent?: boolean; checkout_notif_sent?: boolean; created_by?: string | null; notes?: string | null };
        Update: { status?: BookingStatus; check_in_time?: string | null; check_out_time?: string | null; invoice_sent?: boolean; checkout_notif_sent?: boolean };
      };
      signatures: {
        Row: { id: string; reservation_id: string; file_path: string; signed_at: string; captured_by: string | null };
        Insert: { id?: string; reservation_id: string; file_path: string; signed_at?: string; captured_by?: string | null };
        Update: { file_path?: string };
      };
      tasks: {
        Row: { id: string; property_id: string; title: string; description: string | null; assigned_to: string | null; assigned_by: string | null; reassigned_from: string | null; is_urgent: boolean; deadline: string | null; status: TaskStatus; created_at: string; updated_at: string };
        Insert: { id?: string; property_id: string; title: string; description?: string | null; assigned_to?: string | null; assigned_by?: string | null; reassigned_from?: string | null; is_urgent?: boolean; deadline?: string | null; status?: TaskStatus };
        Update: { status?: TaskStatus; assigned_to?: string | null; reassigned_from?: string | null; updated_at?: string };
      };
      notifications: {
        Row: { id: string; recipient_id: string; title: string; body: string; is_read: boolean; link: string | null; created_at: string };
        Insert: { id?: string; recipient_id: string; title: string; body: string; is_read?: boolean; link?: string | null };
        Update: { is_read?: boolean };
      };
      gate_log_vehicles: {
        Row: { id: string; property_id: string; plate_number: string; vehicle_type: string | null; driver_name: string | null; purpose: string | null; time_in: string; time_out: string | null; logged_by: string | null; notes: string | null };
        Insert: { id?: string; property_id: string; plate_number: string; vehicle_type?: string | null; driver_name?: string | null; purpose?: string | null; time_in?: string; time_out?: string | null; logged_by?: string | null; notes?: string | null };
        Update: { time_out?: string | null; notes?: string | null };
      };
      gate_log_visitors: {
        Row: { id: string; property_id: string; full_name: string; purpose: string | null; host_name: string | null; time_in: string; time_out: string | null; logged_by: string | null; notes: string | null };
        Insert: { id?: string; property_id: string; full_name: string; purpose?: string | null; host_name?: string | null; time_in?: string; time_out?: string | null; logged_by?: string | null; notes?: string | null };
        Update: { time_out?: string | null; notes?: string | null };
      };
      shift_reports: {
        Row: { id: string; property_id: string; staff_id: string; shift: Shift; report_date: string; notes: string; submitted_at: string };
        Insert: { id?: string; property_id: string; staff_id: string; shift: Shift; report_date?: string; notes: string; submitted_at?: string };
        Update: { notes?: string };
      };
      housekeeping_tasks: {
        Row: { id: string; property_id: string; unit_id: string; assigned_to: string | null; status: TaskStatus; notes: string | null; due_date: string | null; created_at: string };
        Insert: { id?: string; property_id: string; unit_id: string; assigned_to?: string | null; status?: TaskStatus; notes?: string | null; due_date?: string | null };
        Update: { status?: TaskStatus; assigned_to?: string | null; notes?: string | null; due_date?: string | null };
      };
      voice_messages: {
        Row: { id: string; property_id: string; sender_id: string; recipient_id: string | null; shift_report_id: string | null; file_path: string; duration_seconds: number | null; message_type: string; is_listened: boolean; created_at: string };
        Insert: { id?: string; property_id: string; sender_id: string; recipient_id?: string | null; shift_report_id?: string | null; file_path: string; duration_seconds?: number | null; message_type?: string; is_listened?: boolean };
        Update: { is_listened?: boolean };
      };
      breakfast_categories: {
        Row: { id: string; property_id: string; name: string; description: string | null; display_order: number; is_active: boolean; created_at: string };
        Insert: { id?: string; property_id: string; name: string; description?: string | null; display_order?: number; is_active?: boolean };
        Update: { name?: string; description?: string | null; display_order?: number; is_active?: boolean };
      };
      breakfast_items: {
        Row: { id: string; category_id: string; name: string; description: string | null; is_active: boolean; display_order: number; created_at: string };
        Insert: { id?: string; category_id: string; name: string; description?: string | null; is_active?: boolean; display_order?: number };
        Update: { name?: string; description?: string | null; is_active?: boolean; display_order?: number };
      };
      breakfast_special_config: {
        Row: { id: string; property_id: string; fee_ghs: number; fee_usd: number; description: string | null; updated_at: string };
        Insert: { id?: string; property_id: string; fee_ghs?: number; fee_usd?: number; description?: string | null };
        Update: { fee_ghs?: number; fee_usd?: number; description?: string | null; updated_at?: string };
      };
      breakfast_orders: {
        Row: { id: string; reservation_id: string; unit_id: string; for_date: string; category_id: string | null; is_special: boolean; special_request: string | null; number_of_guests: number; total_fee_ghs: number; total_fee_usd: number; status: string; submitted_at: string; notes: string | null };
        Insert: { id?: string; reservation_id: string; unit_id: string; for_date: string; category_id?: string | null; is_special?: boolean; special_request?: string | null; number_of_guests?: number; total_fee_ghs?: number; total_fee_usd?: number; status?: string; notes?: string | null };
        Update: { status?: string; notes?: string | null };
      };
      inventory_categories: {
        Row: { id: string; property_id: string; name: string; group_name: string; display_order: number; created_at: string };
        Insert: { id?: string; property_id: string; name: string; group_name: string; display_order?: number };
        Update: { name?: string; group_name?: string; display_order?: number };
      };
      inventory_items: {
        Row: { id: string; property_id: string; category_id: string; name: string; unit: string; current_stock: number; minimum_stock: number; cost_price: number; selling_price: number | null; supplier: string | null; status: string; created_at: string };
        Insert: { id?: string; property_id: string; category_id: string; name: string; unit: string; current_stock?: number; minimum_stock?: number; cost_price?: number; selling_price?: number | null; supplier?: string | null; status?: string };
        Update: { name?: string; category_id?: string; unit?: string; current_stock?: number; minimum_stock?: number; cost_price?: number; selling_price?: number | null; supplier?: string | null; status?: string };
      };
      stock_movements: {
        Row: { id: string; property_id: string; item_id: string; movement_type: string; reason: string; quantity: number; stock_before: number; stock_after: number; reference_id: string | null; notes: string | null; recorded_by: string | null; created_at: string };
        Insert: { id?: string; property_id: string; item_id: string; movement_type: string; reason: string; quantity: number; stock_before: number; stock_after: number; reference_id?: string | null; notes?: string | null; recorded_by?: string | null };
        Update: { notes?: string | null };
      };
      bar_categories: {
        Row: { id: string; property_id: string; name: string; display_order: number; is_active: boolean; created_at: string };
        Insert: { id?: string; property_id: string; name: string; display_order?: number; is_active?: boolean };
        Update: { name?: string; display_order?: number; is_active?: boolean };
      };
      bar_items: {
        Row: { id: string; property_id: string; category_id: string; name: string; description: string | null; price_ghs: number; price_usd: number; is_available: boolean; display_order: number; created_at: string };
        Insert: { id?: string; property_id: string; category_id: string; name: string; description?: string | null; price_ghs?: number; price_usd?: number; is_available?: boolean; display_order?: number };
        Update: { name?: string; description?: string | null; price_ghs?: number; price_usd?: number; is_available?: boolean; display_order?: number };
      };
      bar_orders: {
        Row: { id: string; property_id: string; reservation_id: string | null; unit_id: string | null; bar_item_id: string; quantity: number; unit_price_ghs: number; unit_price_usd: number; currency: string; total_ghs: number; total_usd: number; status: string; recorded_by: string | null; is_qr_order: boolean; notes: string | null; ordered_at: string };
        Insert: { id?: string; property_id: string; reservation_id?: string | null; unit_id?: string | null; bar_item_id: string; quantity?: number; unit_price_ghs: number; unit_price_usd: number; currency?: string; total_ghs: number; total_usd: number; status?: string; recorded_by?: string | null; is_qr_order?: boolean; notes?: string | null };
        Update: { status?: string; notes?: string | null };
      };
      breakfast_ingredients: {
        Row: { id: string; breakfast_category_id: string; inventory_item_id: string; quantity_per_serving: number; created_at: string };
        Insert: { id?: string; breakfast_category_id: string; inventory_item_id: string; quantity_per_serving?: number };
        Update: { quantity_per_serving?: number };
      };
      bar_item_inventory: {
        Row: { id: string; bar_item_id: string; inventory_item_id: string; quantity_per_unit: number };
        Insert: { id?: string; bar_item_id: string; inventory_item_id: string; quantity_per_unit?: number };
        Update: { quantity_per_unit?: number };
      };
    };
  };
}