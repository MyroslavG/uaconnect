export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type AppRole = "user" | "admin";
export type BusinessRegistrationStatus = "pending" | "approved" | "rejected";
export type BusinessStatus = "published" | "hidden";
export type BusinessContentType = "service" | "event";
export type BusinessContentStatus = "draft" | "published";
export type AppNotificationStatus = "draft" | "published";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          contact_email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          role: AppRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          contact_email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: AppRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          contact_email?: string | null;
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
          logo_url: string | null;
          serves_all_canada: boolean;
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
          logo_url?: string | null;
          serves_all_canada?: boolean;
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
          logo_url?: string | null;
          serves_all_canada?: boolean;
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
          logo_url: string | null;
          serves_all_canada: boolean;
          description: string;
          status: BusinessStatus;
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
          logo_url?: string | null;
          serves_all_canada?: boolean;
          description: string;
          status?: BusinessStatus;
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
          logo_url?: string | null;
          serves_all_canada?: boolean;
          description?: string;
          status?: BusinessStatus;
          verified_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      business_claim_invites: {
        Row: {
          id: string;
          business_id: string;
          token: string | null;
          token_hash: string;
          invited_email: string | null;
          expires_at: string;
          used_at: string | null;
          claimed_by: string | null;
          created_by: string | null;
          revoked_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          token?: string | null;
          token_hash: string;
          invited_email?: string | null;
          expires_at?: string;
          used_at?: string | null;
          claimed_by?: string | null;
          created_by?: string | null;
          revoked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          token?: string | null;
          token_hash?: string;
          invited_email?: string | null;
          expires_at?: string;
          used_at?: string | null;
          claimed_by?: string | null;
          created_by?: string | null;
          revoked_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      business_content_items: {
        Row: {
          id: string;
          registration_id: string;
          owner_id: string;
          content_type: BusinessContentType;
          title: string;
          description: string;
          image_url: string | null;
          image_urls: string[] | null;
          is_free: boolean;
          is_online: boolean;
          price: string | null;
          starts_at: string | null;
          location: string | null;
          link_url: string | null;
          status: BusinessContentStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          registration_id: string;
          owner_id: string;
          content_type: BusinessContentType;
          title: string;
          description: string;
          image_url?: string | null;
          image_urls?: string[] | null;
          is_free?: boolean;
          is_online?: boolean;
          price?: string | null;
          starts_at?: string | null;
          location?: string | null;
          link_url?: string | null;
          status?: BusinessContentStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          registration_id?: string;
          owner_id?: string;
          content_type?: BusinessContentType;
          title?: string;
          description?: string;
          image_url?: string | null;
          image_urls?: string[] | null;
          is_free?: boolean;
          is_online?: boolean;
          price?: string | null;
          starts_at?: string | null;
          location?: string | null;
          link_url?: string | null;
          status?: BusinessContentStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      saved_businesses: {
        Row: {
          user_id: string;
          business_id: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          business_id: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          business_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      app_notifications: {
        Row: {
          id: string;
          badge_uk: string;
          badge_en: string;
          title_uk: string;
          title_en: string;
          body_uk: string;
          body_en: string;
          href: string | null;
          cta_uk: string | null;
          cta_en: string | null;
          status: AppNotificationStatus;
          created_by: string | null;
          published_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          badge_uk?: string;
          badge_en?: string;
          title_uk: string;
          title_en: string;
          body_uk: string;
          body_en: string;
          href?: string | null;
          cta_uk?: string | null;
          cta_en?: string | null;
          status?: AppNotificationStatus;
          created_by?: string | null;
          published_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          badge_uk?: string;
          badge_en?: string;
          title_uk?: string;
          title_en?: string;
          body_uk?: string;
          body_en?: string;
          href?: string | null;
          cta_uk?: string | null;
          cta_en?: string | null;
          status?: AppNotificationStatus;
          created_by?: string | null;
          published_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notification_dismissals: {
        Row: {
          notification_id: string;
          user_id: string;
          dismissed_at: string;
        };
        Insert: {
          notification_id: string;
          user_id: string;
          dismissed_at?: string;
        };
        Update: {
          notification_id?: string;
          user_id?: string;
          dismissed_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      claim_business_with_token: {
        Args: {
          invite_token: string;
        };
        Returns: string;
      };
      get_business_claim_invite: {
        Args: {
          invite_token: string;
        };
        Returns: {
          business_id: string;
          business_slug: string;
          business_name: string;
          city: string;
          category_slug: string;
          invited_email: string | null;
          expires_at: string;
        }[];
      };
      get_public_business_owners: {
        Args: {
          owner_ids: string[];
        };
        Returns: {
          owner_id: string;
          owner_name: string | null;
          owner_avatar_url: string | null;
        }[];
      };
      delete_current_user_account: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      is_admin: {
        Args: {
          user_id?: string;
        };
        Returns: boolean;
      };
      sync_owned_business_from_registration: {
        Args: {
          target_registration_id: string;
        };
        Returns: string;
      };
    };
    Enums: {
      app_role: AppRole;
      business_registration_status: BusinessRegistrationStatus;
      business_content_type: BusinessContentType;
      app_notification_status: AppNotificationStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
