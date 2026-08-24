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
export type BusinessContentType = "service" | "event" | "product";
export type BusinessContentStatus = "draft" | "published";
export type AppNotificationStatus = "draft" | "published";
export type AnalyticsContactType =
  | "address"
  | "instagram"
  | "link"
  | "phone"
  | "route"
  | "website";
export type AnalyticsEventType =
  | "app_open"
  | "business_profile_view"
  | "contact_click"
  | "content_view"
  | "business_submit"
  | "business_update"
  | "content_create"
  | "content_delete"
  | "content_update"
  | "notification_dismiss"
  | "notification_view"
  | "page_view"
  | "search"
  | "search_zero_results"
  | "save_business"
  | "share"
  | "signin"
  | "signup"
  | "unsave_business";
export type AnalyticsPlatform = "mobile" | "server" | "web";
export type MediaCampaignType =
  | "announcement"
  | "guest_call"
  | "interview"
  | "partnership"
  | "social"
  | "other";
export type MediaChannel =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "linkedin"
  | "newsletter"
  | "website"
  | "offline"
  | "other";
export type OutreachProspectStatus =
  | "new"
  | "contacted"
  | "interested"
  | "added"
  | "rejected";
export type OutreachProspectPriority = "low" | "medium" | "high";

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
          keywords: string | null;
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
          keywords?: string | null;
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
          keywords?: string | null;
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
          keywords: string | null;
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
          keywords?: string | null;
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
          keywords?: string | null;
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
          is_available: boolean;
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
          is_available?: boolean;
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
          is_available?: boolean;
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
      business_conversations: {
        Row: {
          id: string;
          business_id: string;
          business_owner_id: string;
          customer_id: string;
          customer_name: string | null;
          customer_email: string | null;
          last_message_preview: string;
          last_message_at: string | null;
          last_sender_id: string | null;
          customer_last_read_at: string | null;
          owner_last_read_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          business_owner_id: string;
          customer_id: string;
          customer_name?: string | null;
          customer_email?: string | null;
          last_message_preview?: string;
          last_message_at?: string | null;
          last_sender_id?: string | null;
          customer_last_read_at?: string | null;
          owner_last_read_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          business_owner_id?: string;
          customer_id?: string;
          customer_name?: string | null;
          customer_email?: string | null;
          last_message_preview?: string;
          last_message_at?: string | null;
          last_sender_id?: string | null;
          customer_last_read_at?: string | null;
          owner_last_read_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      business_messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          body?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      feed_posts: {
        Row: {
          id: string;
          author_id: string;
          business_id: string | null;
          body: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          author_id: string;
          business_id?: string | null;
          body: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          author_id?: string;
          business_id?: string | null;
          body?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      feed_post_likes: {
        Row: {
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          post_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          post_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      feed_post_comments: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          body: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          author_id: string;
          body: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          author_id?: string;
          body?: string;
          created_at?: string;
          updated_at?: string;
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
      analytics_events: {
        Row: {
          id: string;
          event_type: AnalyticsEventType;
          platform: AnalyticsPlatform;
          user_id: string | null;
          anonymous_id: string | null;
          session_id: string | null;
          business_id: string | null;
          business_slug: string | null;
          business_name: string | null;
          content_item_id: string | null;
          content_type: BusinessContentType | null;
          contact_type: AnalyticsContactType | null;
          search_query: string | null;
          city: string | null;
          category_slug: string | null;
          metadata: Json;
          occurred_at: string;
        };
        Insert: {
          id?: string;
          event_type: AnalyticsEventType;
          platform: AnalyticsPlatform;
          user_id?: string | null;
          anonymous_id?: string | null;
          session_id?: string | null;
          business_id?: string | null;
          business_slug?: string | null;
          business_name?: string | null;
          content_item_id?: string | null;
          content_type?: BusinessContentType | null;
          contact_type?: AnalyticsContactType | null;
          search_query?: string | null;
          city?: string | null;
          category_slug?: string | null;
          metadata?: Json;
          occurred_at?: string;
        };
        Update: {
          id?: string;
          event_type?: AnalyticsEventType;
          platform?: AnalyticsPlatform;
          user_id?: string | null;
          anonymous_id?: string | null;
          session_id?: string | null;
          business_id?: string | null;
          business_slug?: string | null;
          business_name?: string | null;
          content_item_id?: string | null;
          content_type?: BusinessContentType | null;
          contact_type?: AnalyticsContactType | null;
          search_query?: string | null;
          city?: string | null;
          category_slug?: string | null;
          metadata?: Json;
          occurred_at?: string;
        };
        Relationships: [];
      };
      media_kpi_snapshots: {
        Row: {
          id: string;
          campaign_name: string;
          campaign_type: MediaCampaignType;
          channel: MediaChannel;
          url: string | null;
          snapshot_date: string;
          followers: number;
          views: number;
          watch_time_minutes: number;
          clicks: number;
          registrations: number;
          business_leads: number;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_name: string;
          campaign_type: MediaCampaignType;
          channel: MediaChannel;
          url?: string | null;
          snapshot_date?: string;
          followers?: number;
          views?: number;
          watch_time_minutes?: number;
          clicks?: number;
          registrations?: number;
          business_leads?: number;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_name?: string;
          campaign_type?: MediaCampaignType;
          channel?: MediaChannel;
          url?: string | null;
          snapshot_date?: string;
          followers?: number;
          views?: number;
          watch_time_minutes?: number;
          clicks?: number;
          registrations?: number;
          business_leads?: number;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      outreach_prospects: {
        Row: {
          id: string;
          business_name: string;
          contact_name: string | null;
          city: string;
          category_slug: string;
          website: string | null;
          instagram: string | null;
          email: string | null;
          phone: string | null;
          status: OutreachProspectStatus;
          priority: OutreachProspectPriority;
          source: string | null;
          notes: string | null;
          next_step: string | null;
          next_follow_up_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_name: string;
          contact_name?: string | null;
          city: string;
          category_slug: string;
          website?: string | null;
          instagram?: string | null;
          email?: string | null;
          phone?: string | null;
          status?: OutreachProspectStatus;
          priority?: OutreachProspectPriority;
          source?: string | null;
          notes?: string | null;
          next_step?: string | null;
          next_follow_up_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_name?: string;
          contact_name?: string | null;
          city?: string;
          category_slug?: string;
          website?: string | null;
          instagram?: string | null;
          email?: string | null;
          phone?: string | null;
          status?: OutreachProspectStatus;
          priority?: OutreachProspectPriority;
          source?: string | null;
          notes?: string | null;
          next_step?: string | null;
          next_follow_up_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
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
      get_business_follower_counts: {
        Args: {
          business_ids: string[];
        };
        Returns: {
          business_id: string;
          follower_count: number;
        }[];
      };
      get_feed_post_stats: {
        Args: {
          post_ids: string[];
        };
        Returns: {
          post_id: string;
          like_count: number;
          comment_count: number;
          liked_by_current_user: boolean;
        }[];
      };
      create_feed_post: {
        Args: {
          body: string;
          target_business_id?: string | null;
        };
        Returns: string;
      };
      update_feed_post: {
        Args: {
          target_post_id: string;
          body: string;
        };
        Returns: boolean;
      };
      delete_feed_post: {
        Args: {
          target_post_id: string;
        };
        Returns: boolean;
      };
      toggle_feed_post_like: {
        Args: {
          target_post_id: string;
          should_like?: boolean;
        };
        Returns: boolean;
      };
      create_feed_comment: {
        Args: {
          target_post_id: string;
          body: string;
        };
        Returns: string;
      };
      get_public_feed_authors: {
        Args: {
          author_ids: string[];
        };
        Returns: {
          author_id: string;
          author_name: string | null;
          author_avatar_url: string | null;
        }[];
      };
      can_access_business_conversation: {
        Args: {
          target_conversation_id: string;
        };
        Returns: boolean;
      };
      start_business_conversation: {
        Args: {
          target_business_id: string;
          customer_name?: string | null;
          customer_email?: string | null;
        };
        Returns: string;
      };
      send_business_message: {
        Args: {
          target_conversation_id: string;
          message_body: string;
        };
        Returns: string;
      };
      send_business_message_to_business: {
        Args: {
          target_business_id: string;
          message_body: string;
          customer_name?: string | null;
          customer_email?: string | null;
        };
        Returns: {
          conversation_id: string;
          message_id: string;
        }[];
      };
      get_my_business_conversations: {
        Args: Record<string, never>;
        Returns: Database["public"]["Tables"]["business_conversations"]["Row"][];
      };
      get_business_conversation_messages: {
        Args: {
          target_conversation_id: string;
        };
        Returns: Database["public"]["Tables"]["business_messages"]["Row"][];
      };
      mark_business_conversation_read: {
        Args: {
          target_conversation_id: string;
        };
        Returns: string;
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
