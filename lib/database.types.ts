export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      app_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      app_users: {
        Row: {
          avatar_url: string | null
          created_at: string
          crisp_session_token: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          crisp_session_token?: string
          display_name: string
          id?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          crisp_session_token?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      login_accounts: {
        Row: {
          access_token_encrypted: string
          created_at: string
          expires_at: string | null
          id: string
          profile: Json
          provider: Database["public"]["Enums"]["login_provider"]
          provider_account_id: string
          refresh_token_encrypted: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_encrypted: string
          created_at?: string
          expires_at?: string | null
          id?: string
          profile?: Json
          provider: Database["public"]["Enums"]["login_provider"]
          provider_account_id: string
          refresh_token_encrypted?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_encrypted?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          profile?: Json
          provider?: Database["public"]["Enums"]["login_provider"]
          provider_account_id?: string
          refresh_token_encrypted?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "login_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_connections: {
        Row: {
          access_token_encrypted: string | null
          created_at: string
          display_name: string | null
          expires_at: string | null
          external_account_id: string | null
          id: string
          platform: Database["public"]["Enums"]["publish_platform"]
          refresh_token_encrypted: string | null
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_encrypted?: string | null
          created_at?: string
          display_name?: string | null
          expires_at?: string | null
          external_account_id?: string | null
          id?: string
          platform: Database["public"]["Enums"]["publish_platform"]
          refresh_token_encrypted?: string | null
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_encrypted?: string | null
          created_at?: string
          display_name?: string | null
          expires_at?: string | null
          external_account_id?: string | null
          id?: string
          platform?: Database["public"]["Enums"]["publish_platform"]
          refresh_token_encrypted?: string | null
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_feature_flags: {
        Row: {
          enabled: boolean
          platform: Database["public"]["Enums"]["publish_platform"]
        }
        Insert: {
          enabled?: boolean
          platform: Database["public"]["Enums"]["publish_platform"]
        }
        Update: {
          enabled?: boolean
          platform?: Database["public"]["Enums"]["publish_platform"]
        }
        Relationships: []
      }
      post_destinations: {
        Row: {
          created_at: string
          error_message: string | null
          external_post_id: string | null
          external_publish_id: string | null
          external_url: string | null
          id: string
          last_polled_at: string | null
          next_poll_at: string | null
          platform: Database["public"]["Enums"]["publish_platform"]
          poll_attempt_count: number
          post_id: string
          provider_status: string | null
          publicly_available: boolean | null
          publish_options: Json | null
          requires_manual_review: boolean
          status: Database["public"]["Enums"]["destination_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          external_post_id?: string | null
          external_publish_id?: string | null
          external_url?: string | null
          id?: string
          last_polled_at?: string | null
          next_poll_at?: string | null
          platform: Database["public"]["Enums"]["publish_platform"]
          poll_attempt_count?: number
          post_id: string
          provider_status?: string | null
          publicly_available?: boolean | null
          publish_options?: Json | null
          requires_manual_review?: boolean
          status?: Database["public"]["Enums"]["destination_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          external_post_id?: string | null
          external_publish_id?: string | null
          external_url?: string | null
          id?: string
          last_polled_at?: string | null
          next_poll_at?: string | null
          platform?: Database["public"]["Enums"]["publish_platform"]
          poll_attempt_count?: number
          post_id?: string
          provider_status?: string | null
          publicly_available?: boolean | null
          publish_options?: Json | null
          requires_manual_review?: boolean
          status?: Database["public"]["Enums"]["destination_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_destinations_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content_html: string
          content_text: string
          created_at: string
          id: string
          image_metadata: Json
          image_urls: string[]
          published_at: string | null
          status: Database["public"]["Enums"]["post_status"]
          thread_replies: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content_html?: string
          content_text?: string
          created_at?: string
          id?: string
          image_metadata?: Json
          image_urls?: string[]
          published_at?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          thread_replies?: Json
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content_html?: string
          content_text?: string
          created_at?: string
          id?: string
          image_metadata?: Json
          image_urls?: string[]
          published_at?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          thread_replies?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
        ]
      }
      tiktok_webhook_events: {
        Row: {
          created_at: string
          event_key: string
          event_name: string
          id: string
          publish_id: string
        }
        Insert: {
          created_at?: string
          event_key: string
          event_name: string
          id?: string
          publish_id: string
        }
        Update: {
          created_at?: string
          event_key?: string
          event_name?: string
          id?: string
          publish_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_post_for_publishing: {
        Args: {
          p_content_html: string
          p_content_text: string
          p_destinations: Database["public"]["Enums"]["publish_platform"][]
          p_enforce_x_daily_limit: boolean
          p_image_metadata: Json
          p_image_urls: string[]
          p_thread_replies: Json
          p_tiktok_publish_options: Json
          p_title: string
          p_user_id: string
        }
        Returns: string
      }
      finalize_post_status: { Args: { p_post_id: string }; Returns: undefined }
      get_dashboard_initial_data: {
        Args: { p_limit?: number; p_now: string; p_token_hash: string }
        Returns: Json
      }
      reconcile_tiktok_publish_status: {
        Args: {
          p_destination_status: Database["public"]["Enums"]["destination_status"]
          p_event_key: string
          p_event_name: string
          p_fail_reason: string
          p_next_poll_at: string
          p_provider_status: string
          p_public_post_id: string
          p_publicly_available: boolean
          p_publish_id: string
        }
        Returns: string
      }
    }
    Enums: {
      destination_status:
        | "pending"
        | "publishing"
        | "published"
        | "failed"
        | "processing"
      login_provider: "chzzk" | "soop" | "cime"
      post_status: "draft" | "publishing" | "published" | "partial" | "failed"
      publish_platform:
        | "threads"
        | "x"
        | "discord"
        | "naver_cafe"
        | "soop"
        | "tiktok"
    }
    CompositeTypes: {
      [_ in never]: never
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
      destination_status: [
        "pending",
        "publishing",
        "published",
        "failed",
        "processing",
      ],
      login_provider: ["chzzk", "soop", "cime"],
      post_status: ["draft", "publishing", "published", "partial", "failed"],
      publish_platform: [
        "threads",
        "x",
        "discord",
        "naver_cafe",
        "soop",
        "tiktok",
      ],
    },
  },
} as const

