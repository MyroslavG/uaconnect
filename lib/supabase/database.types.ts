export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = "user" | "admin";
export type BusinessRegistrationStatus = "pending" | "approved" | "rejected";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          role: AppRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: AppRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: AppRole;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      business_registrations: {
        Row: {
          id: string;
          owner_id: string;
          business_name: string;
          category_slug: string;
          city: string;
          address: string | null;
          phone: string | null;
          website: string | null;
          instagram: string | null;
          description: string;
          status: BusinessRegistrationStatus;
          reviewer_id: string | null;
          review_note: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          business_name: string;
          category_slug: string;
          city: string;
          address?: string | null;
          phone?: string | null;
          website?: string | null;
          instagram?: string | null;
          description: string;
          status?: BusinessRegistrationStatus;
          reviewer_id?: string | null;
          review_note?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          business_name?: string;
          category_slug?: string;
          city?: string;
          address?: string | null;
          phone?: string | null;
          website?: string | null;
          instagram?: string | null;
          description?: string;
          status?: BusinessRegistrationStatus;
          reviewer_id?: string | null;
          review_note?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      businesses: {
        Row: {
          id: string;
          registration_id: string | null;
          owner_id: string | null;
          slug: string;
          name: string;
          category_slug: string;
          city: string;
          address: string;
          phone: string | null;
          website: string | null;
          instagram: string | null;
          description: string;
          status: "published" | "hidden";
          verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          registration_id?: string | null;
          owner_id?: string | null;
          slug: string;
          name: string;
          category_slug: string;
          city: string;
          address: string;
          phone?: string | null;
          website?: string | null;
          instagram?: string | null;
          description: string;
          status?: "published" | "hidden";
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          registration_id?: string | null;
          owner_id?: string | null;
          slug?: string;
          name?: string;
          category_slug?: string;
          city?: string;
          address?: string;
          phone?: string | null;
          website?: string | null;
          instagram?: string | null;
          description?: string;
          status?: "published" | "hidden";
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: {
          user_id?: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: AppRole;
      business_registration_status: BusinessRegistrationStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
