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
      activities: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          opportunity_id: string | null
          owner_id: string
          status: Database["public"]["Enums"]["activity_status"]
          title: string
          type: Database["public"]["Enums"]["activity_type"]
          updated_at: string
          outcome: string | null
          sentiment: string | null
          next_action_type: Database["public"]["Enums"]["activity_type"] | null
          next_action_title: string | null
          next_action_due: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          opportunity_id?: string | null
          owner_id: string
          status?: Database["public"]["Enums"]["activity_status"]
          title: string
          type?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
          outcome?: string | null
          sentiment?: string | null
          next_action_type?: Database["public"]["Enums"]["activity_type"] | null
          next_action_title?: string | null
          next_action_due?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          opportunity_id?: string | null
          owner_id?: string
          status?: Database["public"]["Enums"]["activity_status"]
          title?: string
          type?: Database["public"]["Enums"]["activity_type"]
          updated_at?: string
          outcome?: string | null
          sentiment?: string | null
          next_action_type?: Database["public"]["Enums"]["activity_type"] | null
          next_action_title?: string | null
          next_action_due?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          value: Json
          updated_at: string
        }
        Insert: {
          key: string
          value: Json
          updated_at?: string
        }
        Update: {
          key?: string
          value?: Json
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          data: Json | null
          entity: string
          entity_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          data?: Json | null
          entity: string
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          data?: Json | null
          entity?: string
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      badges: {
        Row: {
          badge_type: string
          description: string | null
          earned_at: string
          icon: string | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          badge_type: string
          description?: string | null
          earned_at?: string
          icon?: string | null
          id?: string
          title: string
          user_id: string
        }
        Update: {
          badge_type?: string
          description?: string | null
          earned_at?: string
          icon?: string | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      commissions: {
        Row: {
          base_amount: number
          created_at: string
          final_amount: number
          id: string
          month: number
          opportunity_id: string | null
          percentage: number
          user_id: string
          year: number
        }
        Insert: {
          base_amount?: number
          created_at?: string
          final_amount?: number
          id?: string
          month: number
          opportunity_id?: string | null
          percentage?: number
          user_id: string
          year: number
        }
        Update: {
          base_amount?: number
          created_at?: string
          final_amount?: number
          id?: string
          month?: number
          opportunity_id?: string | null
          percentage?: number
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "commissions_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          id: string
          owner_id: string
          name: string
          company: string | null
          email: string | null
          phone: string | null
          document: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          company?: string | null
          email?: string | null
          phone?: string | null
          document?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          company?: string | null
          email?: string | null
          phone?: string | null
          document?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          created_at: string
          id: string
          month: number
          target_amount: number
          user_id: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          month: number
          target_amount?: number
          user_id: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          month?: number
          target_amount?: number
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      meetings: {
        Row: {
          client_name: string
          created_at: string
          id: string
          notes: string | null
          opportunity_id: string | null
          owner_id: string
          scheduled_at: string
        }
        Insert: {
          client_name: string
          created_at?: string
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          owner_id: string
          scheduled_at: string
        }
        Update: {
          client_name?: string
          created_at?: string
          id?: string
          notes?: string | null
          opportunity_id?: string | null
          owner_id?: string
          scheduled_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          client_name: string
          closed_at: string | null
          created_at: string
          expected_close_date: string | null
          id: string
          notes: string | null
          owner_id: string
          probability: number
          stage: Database["public"]["Enums"]["opp_stage"]
          title: string
          updated_at: string
          value: number
          customer_id: string | null
        }
        Insert: {
          client_name: string
          closed_at?: string | null
          created_at?: string
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          owner_id: string
          probability?: number
          stage?: Database["public"]["Enums"]["opp_stage"]
          title: string
          updated_at?: string
          value?: number
          customer_id?: string | null
        }
        Update: {
          client_name?: string
          closed_at?: string | null
          created_at?: string
          expected_close_date?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          probability?: number
          stage?: Database["public"]["Enums"]["opp_stage"]
          title?: string
          updated_at?: string
          value?: number
          customer_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          points: number
          team_id: string | null
          updated_at: string
          bio: string | null
          tags: string[] | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
          points?: number
          team_id?: string | null
          updated_at?: string
          bio?: string | null
          tags?: string[] | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          points?: number
          team_id?: string | null
          updated_at?: string
          bio?: string | null
          tags?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          id: string
          name: string
          description: string | null
          price: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price?: number
          created_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          color: string
          created_at: string
          id: string
          monthly_goal: number
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          monthly_goal?: number
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          monthly_goal?: number
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_ranking: {
        Args: Record<PropertyKey, never>
        Returns: {
          user_id: string
          full_name: string
          avatar_url: string
          points: number
          closed_value: number
          rank: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_manager_or_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      activity_status: "pendente" | "concluida" | "atrasada"
      activity_type: "ligacao" | "email" | "reuniao" | "tarefa" | "visita" | "followup" | "whatsapp"
      app_role: "admin" | "gestor" | "vendedor" | "viewer"
      opp_stage:
        | "leads_exact"
        | "prospect"
        | "qualificado"
        | "proposta"
        | "negociacao"
        | "ganho"
        | "perdido"
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
    Enums: {
      activity_status: ["pendente", "concluida", "atrasada"],
      activity_type: ["ligacao", "email", "reuniao", "tarefa", "visita", "followup", "whatsapp"],
      app_role: ["admin", "gestor", "vendedor", "viewer"],
      opp_stage: [
        "leads_exact",
        "prospect",
        "qualificado",
        "proposta",
        "negociacao",
        "ganho",
        "perdido",
      ],
    },
  },
} as const
