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
  public: {
    Tables: {
      achievement_dedication_events: {
        Row: {
          achievement_id: string
          created_at: string
          id: string
          recipient_user_id: string
          sender_user_id: string
        }
        Insert: {
          achievement_id: string
          created_at?: string
          id?: string
          recipient_user_id: string
          sender_user_id: string
        }
        Update: {
          achievement_id?: string
          created_at?: string
          id?: string
          recipient_user_id?: string
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievement_dedication_events_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: true
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      achievement_impression_events: {
        Row: {
          achievement_id: string
          actor_user_id: string
          created_at: string
          id: string
          owner_user_id: string
        }
        Insert: {
          achievement_id: string
          actor_user_id: string
          created_at?: string
          id?: string
          owner_user_id: string
        }
        Update: {
          achievement_id?: string
          actor_user_id?: string
          created_at?: string
          id?: string
          owner_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievement_impression_events_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      achievement_share_invites: {
        Row: {
          achieved_at: string | null
          badge_assets_pinned_at: string | null
          category: string | null
          claimed_achievement_id: string | null
          claimed_at: string | null
          claimed_by_user_id: string | null
          created_at: string
          description: string | null
          expires_at: string | null
          icon: string
          icon_asset_kind: string
          icon_asset_path: string | null
          icon_cc_attribution: string | null
          icon_file_id: string | null
          icon_model_pitch: number
          icon_model_yaw: number
          icon_url: string
          id: string
          revoked_at: string | null
          sender_user_id: string
          share_kind: string
          source_achievement_id: string | null
          status: string
          title: string | null
          token_hash: string
          tone: string | null
          updated_at: string
        }
        Insert: {
          achieved_at?: string | null
          badge_assets_pinned_at?: string | null
          category?: string | null
          claimed_achievement_id?: string | null
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          icon?: string
          icon_asset_kind?: string
          icon_asset_path?: string | null
          icon_cc_attribution?: string | null
          icon_file_id?: string | null
          icon_model_pitch?: number
          icon_model_yaw?: number
          icon_url: string
          id?: string
          revoked_at?: string | null
          sender_user_id: string
          share_kind?: string
          source_achievement_id?: string | null
          status?: string
          title?: string | null
          token_hash: string
          tone?: string | null
          updated_at?: string
        }
        Update: {
          achieved_at?: string | null
          badge_assets_pinned_at?: string | null
          category?: string | null
          claimed_achievement_id?: string | null
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          icon?: string
          icon_asset_kind?: string
          icon_asset_path?: string | null
          icon_cc_attribution?: string | null
          icon_file_id?: string | null
          icon_model_pitch?: number
          icon_model_yaw?: number
          icon_url?: string
          id?: string
          revoked_at?: string | null
          sender_user_id?: string
          share_kind?: string
          source_achievement_id?: string | null
          status?: string
          title?: string | null
          token_hash?: string
          tone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievement_share_invites_claimed_achievement_id_fkey"
            columns: ["claimed_achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "achievement_share_invites_source_achievement_id_fkey"
            columns: ["source_achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      achievement_unlock_events: {
        Row: {
          achievement_id: string
          created_at: string
          id: string
          owner_user_id: string
        }
        Insert: {
          achievement_id: string
          created_at?: string
          id?: string
          owner_user_id: string
        }
        Update: {
          achievement_id?: string
          created_at?: string
          id?: string
          owner_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "achievement_unlock_events_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: true
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      achievements: {
        Row: {
          achieved_at: string | null
          category: string | null
          created_at: string
          dedicated_by_user_id: string | null
          dedication_status: string | null
          description: string | null
          icon: string
          icon_asset_kind: string
          icon_asset_path: string | null
          icon_cc_attribution: string | null
          icon_file_id: string | null
          icon_model_animation_play: boolean
          icon_model_animation_speed: number
          icon_model_pitch: number
          icon_model_yaw: number
          icon_url: string | null
          id: string
          is_locked: boolean
          title: string | null
          tone: string | null
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          achieved_at?: string | null
          category?: string | null
          created_at?: string
          dedicated_by_user_id?: string | null
          dedication_status?: string | null
          description?: string | null
          icon?: string
          icon_asset_kind?: string
          icon_asset_path?: string | null
          icon_cc_attribution?: string | null
          icon_file_id?: string | null
          icon_model_animation_play?: boolean
          icon_model_animation_speed?: number
          icon_model_pitch?: number
          icon_model_yaw?: number
          icon_url?: string | null
          id?: string
          is_locked?: boolean
          title?: string | null
          tone?: string | null
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Update: {
          achieved_at?: string | null
          category?: string | null
          created_at?: string
          dedicated_by_user_id?: string | null
          dedication_status?: string | null
          description?: string | null
          icon?: string
          icon_asset_kind?: string
          icon_asset_path?: string | null
          icon_cc_attribution?: string | null
          icon_file_id?: string | null
          icon_model_animation_play?: boolean
          icon_model_animation_speed?: number
          icon_model_pitch?: number
          icon_model_yaw?: number
          icon_url?: string | null
          id?: string
          is_locked?: boolean
          title?: string | null
          tone?: string | null
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      profile: {
        Row: {
          avatar_file_id: string | null
          avatar_url: string | null
          created_at: string
          display_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_file_id?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_file_id?: string | null
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_follow: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_follow_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "profile_follow_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["user_id"]
          },
        ]
      }
      push_notification_tokens: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          platform: string
          token: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          platform?: string
          token: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          platform?: string
          token?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      achievement_impression_counts: {
        Args: { p_achievement_ids: string[] }
        Returns: {
          achievement_id: string
          impression_count: number
        }[]
      }
      append_achievement_impression: {
        Args: { p_achievement_id: string }
        Returns: Json
      }
      auth_user_exists: { Args: { target_user_id: string }; Returns: boolean }
      claim_push_notification_token: {
        Args: { p_platform?: string; p_token: string; p_user_agent?: string }
        Returns: undefined
      }
      following_unlock_feed: {
        Args: {
          p_cursor_id?: string
          p_cursor_updated_at?: string
          p_limit?: number
        }
        Returns: {
          achieved_at: string
          achievement_id: string
          actor_avatar_url: string
          actor_display_name: string
          actor_user_id: string
          category: string
          created_at: string
          description: string
          event_at: string
          event_id: string
          event_type: string
          icon: string
          icon_asset_kind: string
          icon_file_id: string
          icon_url: string
          is_dedicated: boolean
          title: string
          tone: string
          updated_at: string
          user_id: string
        }[]
      }
      public_user_display_name: {
        Args: { target_user_id: string }
        Returns: string
      }
      public_user_display_names_for_ids: {
        Args: { p_user_ids: string[] }
        Returns: {
          display_name: string
          user_id: string
        }[]
      }
      search_profiles: {
        Args: { p_exclude_user_id: string; p_max?: number; p_search: string }
        Returns: {
          display_name: string
          user_id: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
