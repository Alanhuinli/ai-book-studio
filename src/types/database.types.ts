export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '17.1';
  };
  public: {
    Tables: {
      book_chapters: {
        Row: {
          book_version_id: string;
          chapter_number: number;
          created_at: string;
          estimated_minutes: number;
          id: string;
          is_free_preview: boolean;
          preview_excerpt: string;
          title: string;
        };
        Insert: {
          book_version_id: string;
          chapter_number: number;
          created_at?: string;
          estimated_minutes?: number;
          id?: string;
          is_free_preview?: boolean;
          preview_excerpt?: string;
          title: string;
        };
        Update: {
          book_version_id?: string;
          chapter_number?: number;
          created_at?: string;
          estimated_minutes?: number;
          id?: string;
          is_free_preview?: boolean;
          preview_excerpt?: string;
          title?: string;
        };
        Relationships: [];
      };
      book_versions: {
        Row: {
          book_id: string;
          created_at: string;
          id: string;
          is_latest: boolean;
          list_price_twd: number;
          page_count: number;
          pdf_storage_path: string | null;
          published_at: string;
          release_notes: string;
          version_code: string;
          version_number: number;
        };
        Insert: {
          book_id: string;
          created_at?: string;
          id?: string;
          is_latest?: boolean;
          list_price_twd: number;
          page_count?: number;
          pdf_storage_path?: string | null;
          published_at?: string;
          release_notes?: string;
          version_code: string;
          version_number: number;
        };
        Update: {
          book_id?: string;
          created_at?: string;
          id?: string;
          is_latest?: boolean;
          list_price_twd?: number;
          page_count?: number;
          pdf_storage_path?: string | null;
          published_at?: string;
          release_notes?: string;
          version_code?: string;
          version_number?: number;
        };
        Relationships: [];
      };
      books: {
        Row: {
          author_name: string;
          category: string;
          cover_badge: string;
          cover_gradient: string;
          cover_image_url: string | null;
          created_at: string;
          current_version_id: string | null;
          description: string;
          highlights: string[];
          id: string;
          is_free_full_book: boolean;
          is_published: boolean;
          slug: string;
          sort_order: number;
          subtitle: string;
          summary: string;
          target_audience: string[];
          title: string;
          updated_at: string;
        };
        Insert: {
          author_name?: string;
          category?: string;
          cover_badge?: string;
          cover_gradient?: string;
          cover_image_url?: string | null;
          created_at?: string;
          current_version_id?: string | null;
          description: string;
          highlights?: string[];
          id?: string;
          is_free_full_book?: boolean;
          is_published?: boolean;
          slug: string;
          sort_order?: number;
          subtitle?: string;
          summary: string;
          target_audience?: string[];
          title: string;
          updated_at?: string;
        };
        Update: {
          author_name?: string;
          category?: string;
          cover_badge?: string;
          cover_gradient?: string;
          cover_image_url?: string | null;
          created_at?: string;
          current_version_id?: string | null;
          description?: string;
          highlights?: string[];
          id?: string;
          is_free_full_book?: boolean;
          is_published?: boolean;
          slug?: string;
          sort_order?: number;
          subtitle?: string;
          summary?: string;
          target_audience?: string[];
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      chapter_contents: {
        Row: {
          chapter_id: string;
          content_markdown: string;
          updated_at: string;
        };
        Insert: {
          chapter_id: string;
          content_markdown: string;
          updated_at?: string;
        };
        Update: {
          chapter_id?: string;
          content_markdown?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          amount_twd: number;
          atm_bank_code: string | null;
          atm_expire_at: string | null;
          atm_virtual_account: string | null;
          base_paid_amount_twd: number | null;
          base_version_id: string | null;
          book_id: string;
          book_version_id: string;
          company_tax_id: string | null;
          company_title: string | null;
          consent_at: string;
          consent_no_refund_digital: boolean;
          created_at: string;
          currency: string;
          id: string;
          invoice_carrier_code: string | null;
          invoice_type: string;
          merchant_order_no: string;
          paid_at: string | null;
          payment_method: string;
          payment_provider: string;
          pricing_tier: string;
          provider_trade_no: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount_twd: number;
          atm_bank_code?: string | null;
          atm_expire_at?: string | null;
          atm_virtual_account?: string | null;
          base_paid_amount_twd?: number | null;
          base_version_id?: string | null;
          book_id: string;
          book_version_id: string;
          company_tax_id?: string | null;
          company_title?: string | null;
          consent_at?: string;
          consent_no_refund_digital?: boolean;
          created_at?: string;
          currency?: string;
          id?: string;
          invoice_carrier_code?: string | null;
          invoice_type?: string;
          merchant_order_no: string;
          paid_at?: string | null;
          payment_method?: string;
          payment_provider?: string;
          pricing_tier?: string;
          provider_trade_no?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount_twd?: number;
          atm_bank_code?: string | null;
          atm_expire_at?: string | null;
          atm_virtual_account?: string | null;
          base_paid_amount_twd?: number | null;
          base_version_id?: string | null;
          book_id?: string;
          book_version_id?: string;
          company_tax_id?: string | null;
          company_title?: string | null;
          consent_at?: string;
          consent_no_refund_digital?: boolean;
          created_at?: string;
          currency?: string;
          id?: string;
          invoice_carrier_code?: string | null;
          invoice_type?: string;
          merchant_order_no?: string;
          paid_at?: string | null;
          payment_method?: string;
          payment_provider?: string;
          pricing_tier?: string;
          provider_trade_no?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          email: string;
          id: string;
          role: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string;
          email: string;
          id: string;
          role?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          email?: string;
          id?: string;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          business_address: string;
          business_entity: string;
          id: number;
          payment_mode: string;
          service_hours: string;
          site_name: string;
          site_subtitle: string;
          support_email: string;
          support_phone: string;
          updated_at: string;
        };
        Insert: {
          business_address?: string;
          business_entity?: string;
          id?: number;
          payment_mode?: string;
          service_hours?: string;
          site_name?: string;
          site_subtitle?: string;
          support_email?: string;
          support_phone?: string;
          updated_at?: string;
        };
        Update: {
          business_address?: string;
          business_entity?: string;
          id?: number;
          payment_mode?: string;
          service_hours?: string;
          site_name?: string;
          site_subtitle?: string;
          support_email?: string;
          support_phone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_entitlements: {
        Row: {
          book_id: string;
          book_version_id: string;
          granted_at: string;
          granted_by: string;
          id: string;
          is_upgrade: boolean;
          paid_amount_twd: number;
          source_order_id: string | null;
          status: string;
          user_id: string;
        };
        Insert: {
          book_id: string;
          book_version_id: string;
          granted_at?: string;
          granted_by?: string;
          id?: string;
          is_upgrade?: boolean;
          paid_amount_twd?: number;
          source_order_id?: string | null;
          status?: string;
          user_id: string;
        };
        Update: {
          book_id?: string;
          book_version_id?: string;
          granted_at?: string;
          granted_by?: string;
          id?: string;
          is_upgrade?: boolean;
          paid_amount_twd?: number;
          source_order_id?: string | null;
          status?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      watermark_downloads: {
        Row: {
          book_version_id: string;
          downloaded_at: string;
          entitlement_id: string | null;
          id: string;
          user_id: string;
          watermark_fingerprint: string;
        };
        Insert: {
          book_version_id: string;
          downloaded_at?: string;
          entitlement_id?: string | null;
          id?: string;
          user_id: string;
          watermark_fingerprint: string;
        };
        Update: {
          book_version_id?: string;
          downloaded_at?: string;
          entitlement_id?: string | null;
          id?: string;
          user_id?: string;
          watermark_fingerprint?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      calculate_checkout_quote: {
        Args: { p_book_id: string; p_target_version_id: string };
        Returns: Json;
      };
      complete_sandbox_order: {
        Args: { p_order_id: string };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

export interface CheckoutQuote {
  already_owned: boolean;
  is_upgrade: boolean;
  pricing_tier: 'standard' | 'upgrade_10pct';
  list_price_twd: number;
  final_price_twd: number;
  base_version_id: string | null;
  base_version_code: string | null;
  base_paid_amount_twd: number | null;
}
