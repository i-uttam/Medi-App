export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_activity_logs: {
        Row: {
          action: Database["public"]["Enums"]["admin_activity_action"]
          admin_user_id: string | null
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          new_values: Json | null
          old_values: Json | null
        }
        Insert: {
          action: Database["public"]["Enums"]["admin_activity_action"]
          admin_user_id?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
        }
        Update: {
          action?: Database["public"]["Enums"]["admin_activity_action"]
          admin_user_id?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          new_values?: Json | null
          old_values?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_activity_logs_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_permissions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          permission_key: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          permission_key: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          permission_key?: string
        }
        Relationships: []
      }
      admin_role_permissions: {
        Row: {
          created_at: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "admin_permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system_role: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system_role?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system_role?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_user_roles: {
        Row: {
          admin_user_id: string
          created_at: string
          role_id: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          role_id: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_user_roles_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "admin_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string
          id: string
          status: Database["public"]["Enums"]["admin_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["admin_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["admin_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          description: string | null
          is_public: boolean
          key: string
          updated_at: string
          value: string
          value_type: string
        }
        Insert: {
          description?: string | null
          is_public?: boolean
          key: string
          updated_at?: string
          value: string
          value_type?: string
        }
        Update: {
          description?: string | null
          is_public?: boolean
          key?: string
          updated_at?: string
          value?: string
          value_type?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          display_order: number
          ends_at: string | null
          id: string
          image_url: string
          is_active: boolean
          link_type: string
          link_value: string | null
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          ends_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          link_type?: string
          link_value?: string | null
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          ends_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          link_type?: string
          link_value?: string | null
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      coupon_usage: {
        Row: {
          coupon_id: string
          id: string
          order_id: string | null
          used_at: string
          user_id: string
        }
        Insert: {
          coupon_id: string
          id?: string
          order_id?: string | null
          used_at?: string
          user_id: string
        }
        Update: {
          coupon_id?: string
          id?: string
          order_id?: string | null
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_usage_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_coupon_usage_order"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          maximum_discount_paise: number | null
          minimum_order_paise: number
          per_user_usage_limit: number | null
          starts_at: string | null
          total_usage_limit: number | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          maximum_discount_paise?: number | null
          minimum_order_paise?: number
          per_user_usage_limit?: number | null
          starts_at?: string | null
          total_usage_limit?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          maximum_discount_paise?: number | null
          minimum_order_paise?: number
          per_user_usage_limit?: number | null
          starts_at?: string | null
          total_usage_limit?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      inventory: {
        Row: {
          available_quantity: number
          created_at: string
          product_id: string
          reserved_quantity: number
          updated_at: string
        }
        Insert: {
          available_quantity?: number
          created_at?: string
          product_id: string
          reserved_quantity?: number
          updated_at?: string
        }
        Update: {
          available_quantity?: number
          created_at?: string
          product_id?: string
          reserved_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          admin_user_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          order_id: string | null
          product_id: string
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reason: string | null
          transaction_type: Database["public"]["Enums"]["inventory_transaction_type"]
        }
        Insert: {
          admin_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          product_id: string
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reason?: string | null
          transaction_type: Database["public"]["Enums"]["inventory_transaction_type"]
        }
        Update: {
          admin_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          order_id?: string | null
          product_id?: string
          quantity_after?: number
          quantity_before?: number
          quantity_change?: number
          reason?: string | null
          transaction_type?: Database["public"]["Enums"]["inventory_transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "fk_inventory_transactions_order"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturers: {
        Row: {
          address: string | null
          contact: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          created_by_admin_user_id: string | null
          id: string
          message: string
          metadata: Json | null
          notification_type: Database["public"]["Enums"]["notification_type"]
          target_type: Database["public"]["Enums"]["notification_target_type"]
          title: string
        }
        Insert: {
          created_at?: string
          created_by_admin_user_id?: string | null
          id?: string
          message: string
          metadata?: Json | null
          notification_type: Database["public"]["Enums"]["notification_type"]
          target_type: Database["public"]["Enums"]["notification_target_type"]
          title: string
        }
        Update: {
          created_at?: string
          created_by_admin_user_id?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          notification_type?: Database["public"]["Enums"]["notification_type"]
          target_type?: Database["public"]["Enums"]["notification_target_type"]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_created_by_admin_user_id_fkey"
            columns: ["created_by_admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          image_url_snapshot: string | null
          line_discount_paise: number
          line_subtotal_paise: number
          line_total_paise: number
          mrp_paise_snapshot: number
          order_id: string
          pack_size_snapshot: string | null
          product_id: string | null
          product_name_snapshot: string
          quantity: number
          selling_price_paise_snapshot: number
          sku_snapshot: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url_snapshot?: string | null
          line_discount_paise?: number
          line_subtotal_paise: number
          line_total_paise: number
          mrp_paise_snapshot: number
          order_id: string
          pack_size_snapshot?: string | null
          product_id?: string | null
          product_name_snapshot: string
          quantity: number
          selling_price_paise_snapshot: number
          sku_snapshot: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url_snapshot?: string | null
          line_discount_paise?: number
          line_subtotal_paise?: number
          line_total_paise?: number
          mrp_paise_snapshot?: number
          order_id?: string
          pack_size_snapshot?: string | null
          product_id?: string | null
          product_name_snapshot?: string
          quantity?: number
          selling_price_paise_snapshot?: number
          sku_snapshot?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by_admin_user_id: string | null
          changed_by_user_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: string
          order_id: string
          reason: string | null
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Insert: {
          changed_by_admin_user_id?: string | null
          changed_by_user_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          order_id: string
          reason?: string | null
          to_status: Database["public"]["Enums"]["order_status"]
        }
        Update: {
          changed_by_admin_user_id?: string | null
          changed_by_user_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: string
          order_id?: string
          reason?: string | null
          to_status?: Database["public"]["Enums"]["order_status"]
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_changed_by_admin_user_id_fkey"
            columns: ["changed_by_admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_id: string | null
          cancelled_at: string | null
          coupon_discount_paise: number
          coupon_id: string | null
          created_at: string
          customer_note: string | null
          delivered_at: string | null
          delivery_charge_paise: number
          id: string
          idempotency_key: string
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          product_discount_paise: number
          snapshot_address_line_1: string
          snapshot_address_line_2: string | null
          snapshot_address_type: Database["public"]["Enums"]["address_type"]
          snapshot_city: string
          snapshot_country_code: string
          snapshot_full_name: string
          snapshot_landmark: string | null
          snapshot_phone: string
          snapshot_postal_code: string
          snapshot_state: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal_paise: number
          total_paise: number
          updated_at: string
          user_id: string
        }
        Insert: {
          address_id?: string | null
          cancelled_at?: string | null
          coupon_discount_paise?: number
          coupon_id?: string | null
          created_at?: string
          customer_note?: string | null
          delivered_at?: string | null
          delivery_charge_paise?: number
          id?: string
          idempotency_key: string
          order_number: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          product_discount_paise?: number
          snapshot_address_line_1: string
          snapshot_address_line_2?: string | null
          snapshot_address_type?: Database["public"]["Enums"]["address_type"]
          snapshot_city: string
          snapshot_country_code?: string
          snapshot_full_name: string
          snapshot_landmark?: string | null
          snapshot_phone: string
          snapshot_postal_code: string
          snapshot_state: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_paise: number
          total_paise: number
          updated_at?: string
          user_id: string
        }
        Update: {
          address_id?: string | null
          cancelled_at?: string | null
          coupon_discount_paise?: number
          coupon_id?: string | null
          created_at?: string
          customer_note?: string | null
          delivered_at?: string | null
          delivery_charge_paise?: number
          id?: string
          idempotency_key?: string
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          payment_status?: Database["public"]["Enums"]["payment_status"]
          product_discount_paise?: number
          snapshot_address_line_1?: string
          snapshot_address_line_2?: string | null
          snapshot_address_type?: Database["public"]["Enums"]["address_type"]
          snapshot_city?: string
          snapshot_country_code?: string
          snapshot_full_name?: string
          snapshot_landmark?: string | null
          snapshot_phone?: string
          snapshot_postal_code?: string
          snapshot_state?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_paise?: number
          total_paise?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "user_addresses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_paise: number
          created_at: string
          id: string
          metadata: Json | null
          order_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          provider: string | null
          provider_order_id: string | null
          provider_payment_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount_paise: number
          created_at?: string
          id?: string
          metadata?: Json | null
          order_id: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          provider?: string | null
          provider_order_id?: string | null
          provider_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount_paise?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          order_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          provider?: string | null
          provider_order_id?: string | null
          provider_payment_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_compositions: {
        Row: {
          composition_name: string
          created_at: string
          display_order: number
          id: string
          product_id: string
          strength: string | null
        }
        Insert: {
          composition_name: string
          created_at?: string
          display_order?: number
          id?: string
          product_id: string
          strength?: string | null
        }
        Update: {
          composition_name?: string
          created_at?: string
          display_order?: number
          id?: string
          product_id?: string
          strength?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_compositions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string
          display_order: number
          id: string
          image_url: string
          is_primary: boolean
          product_id: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url: string
          is_primary?: boolean
          product_id: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string
          is_primary?: boolean
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          archived_at: string | null
          brand_id: string | null
          category_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_best_seller: boolean
          is_featured: boolean
          low_stock_threshold: number
          manufacturer_id: string | null
          mrp_paise: number
          name: string
          pack_size: string | null
          search_vector: unknown
          selling_price_paise: number
          sku: string
          slug: string
          updated_at: string
          uses: string | null
        }
        Insert: {
          archived_at?: string | null
          brand_id?: string | null
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_best_seller?: boolean
          is_featured?: boolean
          low_stock_threshold?: number
          manufacturer_id?: string | null
          mrp_paise: number
          name: string
          pack_size?: string | null
          search_vector?: unknown
          selling_price_paise: number
          sku: string
          slug: string
          updated_at?: string
          uses?: string | null
        }
        Update: {
          archived_at?: string | null
          brand_id?: string | null
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_best_seller?: boolean
          is_featured?: boolean
          low_stock_threshold?: number
          manufacturer_id?: string | null
          mrp_paise?: number
          name?: string
          pack_size?: string | null
          search_vector?: unknown
          selling_price_paise?: number
          sku?: string
          slug?: string
          updated_at?: string
          uses?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          block_reason: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          block_reason?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          block_reason?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          updated_at?: string
        }
        Relationships: []
      }
      user_addresses: {
        Row: {
          address_line_1: string
          address_line_2: string | null
          address_type: Database["public"]["Enums"]["address_type"]
          city: string
          country_code: string
          created_at: string
          full_name: string
          id: string
          is_default: boolean
          landmark: string | null
          phone: string
          postal_code: string
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line_1: string
          address_line_2?: string | null
          address_type?: Database["public"]["Enums"]["address_type"]
          city: string
          country_code?: string
          created_at?: string
          full_name: string
          id?: string
          is_default?: boolean
          landmark?: string | null
          phone: string
          postal_code: string
          state: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line_1?: string
          address_line_2?: string | null
          address_type?: Database["public"]["Enums"]["address_type"]
          city?: string
          country_code?: string
          created_at?: string
          full_name?: string
          id?: string
          is_default?: boolean
          landmark?: string | null
          phone?: string
          postal_code?: string
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          notification_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          notification_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          notification_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_product_to_my_cart: {
        Args: { p_product_id: string }
        Returns: {
          cart_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "cart_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_adjust_inventory: {
        Args: {
          p_product_id: string
          p_quantity_change: number
          p_reason: string
          p_transaction_type: Database["public"]["Enums"]["inventory_transaction_type"]
        }
        Returns: {
          available_quantity: number
          created_at: string
          product_id: string
          reserved_quantity: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "inventory"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_archive_product: {
        Args: { p_product_id: string; p_reason?: string }
        Returns: {
          archived_at: string | null
          brand_id: string | null
          category_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_best_seller: boolean
          is_featured: boolean
          low_stock_threshold: number
          manufacturer_id: string | null
          mrp_paise: number
          name: string
          pack_size: string | null
          search_vector: unknown
          selling_price_paise: number
          sku: string
          slug: string
          updated_at: string
          uses: string | null
        }
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_block_customer: {
        Args: { p_reason: string; p_user_id: string }
        Returns: {
          avatar_url: string | null
          block_reason: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_cancel_order: {
        Args: { p_order_id: string; p_reason: string }
        Returns: {
          address_id: string | null
          cancelled_at: string | null
          coupon_discount_paise: number
          coupon_id: string | null
          created_at: string
          customer_note: string | null
          delivered_at: string | null
          delivery_charge_paise: number
          id: string
          idempotency_key: string
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          product_discount_paise: number
          snapshot_address_line_1: string
          snapshot_address_line_2: string | null
          snapshot_address_type: Database["public"]["Enums"]["address_type"]
          snapshot_city: string
          snapshot_country_code: string
          snapshot_full_name: string
          snapshot_landmark: string | null
          snapshot_phone: string
          snapshot_postal_code: string
          snapshot_state: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal_paise: number
          total_paise: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_unblock_customer: {
        Args: { p_user_id: string }
        Returns: {
          avatar_url: string | null
          block_reason: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_update_app_setting: {
        Args: { p_description?: string; p_key: string; p_value: string }
        Returns: {
          description: string | null
          is_public: boolean
          key: string
          updated_at: string
          value: string
          value_type: string
        }
        SetofOptions: {
          from: "*"
          to: "app_settings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_update_order_status: {
        Args: {
          p_new_status: Database["public"]["Enums"]["order_status"]
          p_order_id: string
          p_reason?: string
        }
        Returns: {
          address_id: string | null
          cancelled_at: string | null
          coupon_discount_paise: number
          coupon_id: string | null
          created_at: string
          customer_note: string | null
          delivered_at: string | null
          delivery_charge_paise: number
          id: string
          idempotency_key: string
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          product_discount_paise: number
          snapshot_address_line_1: string
          snapshot_address_line_2: string | null
          snapshot_address_type: Database["public"]["Enums"]["address_type"]
          snapshot_city: string
          snapshot_country_code: string
          snapshot_full_name: string
          snapshot_landmark: string | null
          snapshot_phone: string
          snapshot_postal_code: string
          snapshot_state: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal_paise: number
          total_paise: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assert_active_admin: {
        Args: { p_permission_key?: string }
        Returns: undefined
      }
      assert_active_customer: { Args: never; Returns: undefined }
      cancel_my_order: {
        Args: { p_order_id: string; p_reason?: string }
        Returns: {
          address_id: string | null
          cancelled_at: string | null
          coupon_discount_paise: number
          coupon_id: string | null
          created_at: string
          customer_note: string | null
          delivered_at: string | null
          delivery_charge_paise: number
          id: string
          idempotency_key: string
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          payment_status: Database["public"]["Enums"]["payment_status"]
          product_discount_paise: number
          snapshot_address_line_1: string
          snapshot_address_line_2: string | null
          snapshot_address_type: Database["public"]["Enums"]["address_type"]
          snapshot_city: string
          snapshot_country_code: string
          snapshot_full_name: string
          snapshot_landmark: string | null
          snapshot_phone: string
          snapshot_postal_code: string
          snapshot_state: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal_paise: number
          total_paise: number
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      clear_my_cart: { Args: never; Returns: number }
      create_my_address: {
        Args: {
          p_address_line_1: string
          p_address_line_2?: string
          p_address_type?: Database["public"]["Enums"]["address_type"]
          p_city: string
          p_country_code?: string
          p_full_name: string
          p_landmark?: string
          p_phone: string
          p_postal_code: string
          p_state: string
        }
        Returns: {
          address_line_1: string
          address_line_2: string | null
          address_type: Database["public"]["Enums"]["address_type"]
          city: string
          country_code: string
          created_at: string
          full_name: string
          id: string
          is_default: boolean
          landmark: string | null
          phone: string
          postal_code: string
          state: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_addresses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_user_id: { Args: never; Returns: string }
      decrement_my_cart_item: {
        Args: { p_cart_item_id: string }
        Returns: {
          cart_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "cart_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      delete_my_address: { Args: { p_address_id: string }; Returns: boolean }
      get_my_profile: {
        Args: never
        Returns: {
          avatar_url: string | null
          block_reason: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_or_create_my_cart: {
        Args: never
        Returns: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "carts"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_product_availability: {
        Args: { p_product_id: string }
        Returns: {
          available_quantity: number
          is_available: boolean
          is_low_stock: boolean
          product_id: string
        }[]
      }
      has_admin_permission: {
        Args: { p_permission_key: string }
        Returns: boolean
      }
      increment_my_cart_item: {
        Args: { p_cart_item_id: string }
        Returns: {
          cart_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "cart_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_active_admin: { Args: never; Returns: boolean }
      is_active_customer: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_authenticated: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      mark_all_my_notifications_read: { Args: never; Returns: number }
      mark_my_notification_read: {
        Args: { p_user_notification_id: string }
        Returns: {
          created_at: string
          id: string
          is_read: boolean
          notification_id: string
          read_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_notifications"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      remove_my_cart_item: {
        Args: { p_cart_item_id: string }
        Returns: boolean
      }
      set_my_cart_item_quantity: {
        Args: { p_cart_item_id: string; p_quantity: number }
        Returns: {
          cart_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "cart_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_my_default_address: {
        Args: { p_address_id: string }
        Returns: {
          address_line_1: string
          address_line_2: string | null
          address_type: Database["public"]["Enums"]["address_type"]
          city: string
          country_code: string
          created_at: string
          full_name: string
          id: string
          is_default: boolean
          landmark: string | null
          phone: string
          postal_code: string
          state: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_addresses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
      update_my_address: {
        Args: {
          p_address_id: string
          p_address_line_1?: string
          p_address_line_2?: string
          p_address_type?: Database["public"]["Enums"]["address_type"]
          p_city?: string
          p_country_code?: string
          p_full_name?: string
          p_landmark?: string
          p_phone?: string
          p_postal_code?: string
          p_state?: string
        }
        Returns: {
          address_line_1: string
          address_line_2: string | null
          address_type: Database["public"]["Enums"]["address_type"]
          city: string
          country_code: string
          created_at: string
          full_name: string
          id: string
          is_default: boolean
          landmark: string | null
          phone: string
          postal_code: string
          state: string
          updated_at: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "user_addresses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_my_profile: {
        Args: { p_avatar_url?: string; p_email?: string; p_full_name?: string }
        Returns: {
          avatar_url: string | null
          block_reason: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          status: Database["public"]["Enums"]["user_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      validate_my_coupon: {
        Args: { p_coupon_code: string }
        Returns: Database["public"]["CompositeTypes"]["coupon_validation_result"]
        SetofOptions: {
          from: "*"
          to: "coupon_validation_result"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      address_type: "home" | "work" | "other"
      admin_activity_action:
        | "product_created"
        | "product_updated"
        | "product_archived"
        | "category_created"
        | "category_updated"
        | "brand_created"
        | "brand_updated"
        | "manufacturer_created"
        | "manufacturer_updated"
        | "inventory_adjusted"
        | "order_status_updated"
        | "order_cancelled"
        | "customer_blocked"
        | "customer_unblocked"
        | "banner_created"
        | "banner_updated"
        | "coupon_created"
        | "coupon_updated"
        | "app_settings_updated"
        | "admin_user_created"
        | "admin_user_updated"
        | "admin_role_assigned"
        | "admin_role_created"
        | "admin_role_updated"
        | "admin_permission_updated"
        | "notification_sent"
      admin_status: "active" | "inactive" | "suspended"
      discount_type: "percentage" | "fixed"
      inventory_transaction_type:
        | "initial_stock"
        | "admin_addition"
        | "admin_reduction"
        | "admin_correction"
        | "order_placement"
        | "order_cancellation_restore"
        | "return_restore"
      notification_target_type: "all" | "individual"
      notification_type: "order_update" | "promotion" | "system" | "broadcast"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "packed"
        | "shipped"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
      payment_method: "cash_on_delivery"
      payment_status: "pending" | "paid" | "failed" | "refunded" | "cancelled"
      user_status: "active" | "blocked" | "deleted"
    }
    CompositeTypes: {
      coupon_validation_result: {
        is_valid: boolean | null
        error_code: string | null
        coupon_id: string | null
        description: string | null
        discount_type: Database["public"]["Enums"]["discount_type"] | null
        discount_value: number | null
        minimum_order_paise: number | null
        maximum_discount_paise: number | null
      }
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      address_type: ["home", "work", "other"],
      admin_activity_action: [
        "product_created",
        "product_updated",
        "product_archived",
        "category_created",
        "category_updated",
        "brand_created",
        "brand_updated",
        "manufacturer_created",
        "manufacturer_updated",
        "inventory_adjusted",
        "order_status_updated",
        "order_cancelled",
        "customer_blocked",
        "customer_unblocked",
        "banner_created",
        "banner_updated",
        "coupon_created",
        "coupon_updated",
        "app_settings_updated",
        "admin_user_created",
        "admin_user_updated",
        "admin_role_assigned",
        "admin_role_created",
        "admin_role_updated",
        "admin_permission_updated",
        "notification_sent",
      ],
      admin_status: ["active", "inactive", "suspended"],
      discount_type: ["percentage", "fixed"],
      inventory_transaction_type: [
        "initial_stock",
        "admin_addition",
        "admin_reduction",
        "admin_correction",
        "order_placement",
        "order_cancellation_restore",
        "return_restore",
      ],
      notification_target_type: ["all", "individual"],
      notification_type: ["order_update", "promotion", "system", "broadcast"],
      order_status: [
        "pending",
        "confirmed",
        "processing",
        "packed",
        "shipped",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      payment_method: ["cash_on_delivery"],
      payment_status: ["pending", "paid", "failed", "refunded", "cancelled"],
      user_status: ["active", "blocked", "deleted"],
    },
  },
} as const
