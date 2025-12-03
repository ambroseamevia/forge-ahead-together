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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      application_tracking: {
        Row: {
          application_id: string
          created_at: string | null
          id: string
          notes: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          application_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          status: string
          updated_at?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_tracking_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          application_date: string | null
          cover_letter: string | null
          created_at: string | null
          custom_cv: string | null
          follow_up_date: string | null
          id: string
          job_id: string
          notes: string | null
          status: Database["public"]["Enums"]["application_status"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          application_date?: string | null
          cover_letter?: string | null
          created_at?: string | null
          custom_cv?: string | null
          follow_up_date?: string | null
          id?: string
          job_id: string
          notes?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          application_date?: string | null
          cover_letter?: string | null
          created_at?: string | null
          custom_cv?: string | null
          follow_up_date?: string | null
          id?: string
          job_id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["application_status"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cvs: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_type: string
          id: string
          is_active: boolean | null
          parsed_data: Json | null
          upload_date: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_type: string
          id?: string
          is_active?: boolean | null
          parsed_data?: Json | null
          upload_date?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_type?: string
          id?: string
          is_active?: boolean | null
          parsed_data?: Json | null
          upload_date?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cvs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      education: {
        Row: {
          certifications: string[] | null
          created_at: string | null
          degree: string
          field_of_study: string | null
          graduation_date: string | null
          id: string
          institution: string
          user_id: string
        }
        Insert: {
          certifications?: string[] | null
          created_at?: string | null
          degree: string
          field_of_study?: string | null
          graduation_date?: string | null
          id?: string
          institution: string
          user_id: string
        }
        Update: {
          certifications?: string[] | null
          created_at?: string | null
          degree?: string
          field_of_study?: string | null
          graduation_date?: string | null
          id?: string
          institution?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "education_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_matches: {
        Row: {
          created_at: string | null
          experience_match_score: number | null
          id: string
          job_id: string
          location_match_score: number | null
          match_score: number | null
          matched_at: string | null
          salary_match_score: number | null
          skills_match_score: number | null
          status: Database["public"]["Enums"]["job_match_status"] | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          experience_match_score?: number | null
          id?: string
          job_id: string
          location_match_score?: number | null
          match_score?: number | null
          matched_at?: string | null
          salary_match_score?: number | null
          skills_match_score?: number | null
          status?: Database["public"]["Enums"]["job_match_status"] | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          experience_match_score?: number | null
          id?: string
          job_id?: string
          location_match_score?: number | null
          match_score?: number | null
          matched_at?: string | null
          salary_match_score?: number | null
          skills_match_score?: number | null
          status?: Database["public"]["Enums"]["job_match_status"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_matches_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_matches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          company: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          job_type: string | null
          location: string | null
          posted_date: string | null
          remote_option: boolean | null
          requirements: string | null
          salary_range: string | null
          scraped_at: string | null
          source_platform: string | null
          source_url: string | null
          title: string
          visa_sponsorship: boolean | null
        }
        Insert: {
          company: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          job_type?: string | null
          location?: string | null
          posted_date?: string | null
          remote_option?: boolean | null
          requirements?: string | null
          salary_range?: string | null
          scraped_at?: string | null
          source_platform?: string | null
          source_url?: string | null
          title: string
          visa_sponsorship?: boolean | null
        }
        Update: {
          company?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          job_type?: string | null
          location?: string | null
          posted_date?: string | null
          remote_option?: boolean | null
          requirements?: string | null
          salary_range?: string | null
          scraped_at?: string | null
          source_platform?: string | null
          source_url?: string | null
          title?: string
          visa_sponsorship?: boolean | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          career_level: Database["public"]["Enums"]["career_level"] | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          job_types: string[] | null
          location: string | null
          location_preferences: string[] | null
          phone: string | null
          preferred_industries: string[] | null
          salary_max: number | null
          salary_min: number | null
          updated_at: string | null
        }
        Insert: {
          career_level?: Database["public"]["Enums"]["career_level"] | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          job_types?: string[] | null
          location?: string | null
          location_preferences?: string[] | null
          phone?: string | null
          preferred_industries?: string[] | null
          salary_max?: number | null
          salary_min?: number | null
          updated_at?: string | null
        }
        Update: {
          career_level?: Database["public"]["Enums"]["career_level"] | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          job_types?: string[] | null
          location?: string | null
          location_preferences?: string[] | null
          phone?: string | null
          preferred_industries?: string[] | null
          salary_max?: number | null
          salary_min?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      skills: {
        Row: {
          created_at: string | null
          id: string
          proficiency_level: string | null
          skill_name: string
          skill_type: Database["public"]["Enums"]["skill_type"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          proficiency_level?: string | null
          skill_name: string
          skill_type: Database["public"]["Enums"]["skill_type"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          proficiency_level?: string | null
          skill_name?: string
          skill_type?: Database["public"]["Enums"]["skill_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "skills_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      work_experience: {
        Row: {
          achievements: string[] | null
          company: string
          created_at: string | null
          description: string | null
          end_date: string | null
          id: string
          job_title: string
          start_date: string
          user_id: string
        }
        Insert: {
          achievements?: string[] | null
          company: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          job_title: string
          start_date: string
          user_id: string
        }
        Update: {
          achievements?: string[] | null
          company?: string
          created_at?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          job_title?: string
          start_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_experience_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      application_status:
        | "draft"
        | "submitted"
        | "in_review"
        | "interview"
        | "offer"
        | "rejected"
      career_level: "entry" | "mid" | "senior" | "executive"
      job_match_status: "new" | "viewed" | "saved" | "applied" | "rejected"
      skill_type: "technical" | "soft" | "language"
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
      app_role: ["admin", "user"],
      application_status: [
        "draft",
        "submitted",
        "in_review",
        "interview",
        "offer",
        "rejected",
      ],
      career_level: ["entry", "mid", "senior", "executive"],
      job_match_status: ["new", "viewed", "saved", "applied", "rejected"],
      skill_type: ["technical", "soft", "language"],
    },
  },
} as const
