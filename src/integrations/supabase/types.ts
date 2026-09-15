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
      author_directions: {
        Row: {
          body: string
          chapter_id: string | null
          confirmed: boolean
          created_at: string
          id: string
          is_inferred: boolean
          kind: string
          project_id: string
          scene_id: string | null
          scope: string
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          body: string
          chapter_id?: string | null
          confirmed?: boolean
          created_at?: string
          id?: string
          is_inferred?: boolean
          kind?: string
          project_id: string
          scene_id?: string | null
          scope?: string
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          body?: string
          chapter_id?: string | null
          confirmed?: boolean
          created_at?: string
          id?: string
          is_inferred?: boolean
          kind?: string
          project_id?: string
          scene_id?: string | null
          scope?: string
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "author_directions_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "author_directions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "author_directions_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          position: number
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          position?: number
          project_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          position?: number
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      observations: {
        Row: {
          body: string
          created_at: string
          evidence: Json
          id: string
          origin: string
          project_id: string
          scene_id: string | null
          status: string
          title: string
          uncertainty: string | null
          updated_at: string
          why_it_matters: string | null
        }
        Insert: {
          body: string
          created_at?: string
          evidence?: Json
          id?: string
          origin?: string
          project_id: string
          scene_id?: string | null
          status?: string
          title: string
          uncertainty?: string | null
          updated_at?: string
          why_it_matters?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          evidence?: Json
          id?: string
          origin?: string
          project_id?: string
          scene_id?: string | null
          status?: string
          title?: string
          uncertainty?: string | null
          updated_at?: string
          why_it_matters?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "observations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "observations_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      outline_beats: {
        Row: {
          author_confirmed: boolean
          chapter_id: string | null
          created_at: string
          id: string
          intent: string | null
          kind: string
          link_basis: string
          link_note: string | null
          position: number
          project_id: string
          scene_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_confirmed?: boolean
          chapter_id?: string | null
          created_at?: string
          id?: string
          intent?: string | null
          kind?: string
          link_basis?: string
          link_note?: string | null
          position?: number
          project_id: string
          scene_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_confirmed?: boolean
          chapter_id?: string | null
          created_at?: string
          id?: string
          intent?: string | null
          kind?: string
          link_basis?: string
          link_note?: string | null
          position?: number
          project_id?: string
          scene_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "outline_beats_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outline_beats_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "outline_beats_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          creative_direction: string | null
          deleted_at: string | null
          genre: string | null
          id: string
          is_sample: boolean
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          creative_direction?: string | null
          deleted_at?: string | null
          genre?: string | null
          id?: string
          is_sample?: boolean
          owner_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          creative_direction?: string | null
          deleted_at?: string | null
          genre?: string | null
          id?: string
          is_sample?: boolean
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      scene_revisions: {
        Row: {
          content: Json | null
          created_at: string
          id: string
          label: string | null
          plain_text: string
          project_id: string
          scene_id: string
          source: string
          word_count: number
        }
        Insert: {
          content?: Json | null
          created_at?: string
          id?: string
          label?: string | null
          plain_text?: string
          project_id: string
          scene_id: string
          source?: string
          word_count?: number
        }
        Update: {
          content?: Json | null
          created_at?: string
          id?: string
          label?: string | null
          plain_text?: string
          project_id?: string
          scene_id?: string
          source?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "scene_revisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scene_revisions_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      scenes: {
        Row: {
          chapter_id: string
          content: Json | null
          created_at: string
          deleted_at: string | null
          id: string
          location: string | null
          plain_text: string
          position: number
          pov: string | null
          project_id: string
          story_time: string | null
          summary: string | null
          title: string
          updated_at: string
          word_count: number
        }
        Insert: {
          chapter_id: string
          content?: Json | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          location?: string | null
          plain_text?: string
          position?: number
          pov?: string | null
          project_id: string
          story_time?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
          word_count?: number
        }
        Update: {
          chapter_id?: string
          content?: Json | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          location?: string | null
          plain_text?: string
          position?: number
          pov?: string | null
          project_id?: string
          story_time?: string | null
          summary?: string | null
          title?: string
          updated_at?: string
          word_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "scenes_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scenes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      story_claims: {
        Row: {
          assertion: string
          author_confirmed: boolean
          basis: string
          claim_kind: string
          created_at: string
          entity_id: string | null
          evidence: Json
          id: string
          knowledge_holder: string | null
          knowledge_state: string | null
          project_id: string
          revision_id: string | null
          scene_id: string | null
          story_position: number | null
          subject: string
          truth_type: string
          updated_at: string
          validity: string
        }
        Insert: {
          assertion: string
          author_confirmed?: boolean
          basis?: string
          claim_kind?: string
          created_at?: string
          entity_id?: string | null
          evidence?: Json
          id?: string
          knowledge_holder?: string | null
          knowledge_state?: string | null
          project_id: string
          revision_id?: string | null
          scene_id?: string | null
          story_position?: number | null
          subject: string
          truth_type?: string
          updated_at?: string
          validity?: string
        }
        Update: {
          assertion?: string
          author_confirmed?: boolean
          basis?: string
          claim_kind?: string
          created_at?: string
          entity_id?: string | null
          evidence?: Json
          id?: string
          knowledge_holder?: string | null
          knowledge_state?: string | null
          project_id?: string
          revision_id?: string | null
          scene_id?: string | null
          story_position?: number | null
          subject?: string
          truth_type?: string
          updated_at?: string
          validity?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_claims_entity_id_fkey"
            columns: ["entity_id"]
            isOneToOne: false
            referencedRelation: "story_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_claims_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_claims_revision_id_fkey"
            columns: ["revision_id"]
            isOneToOne: false
            referencedRelation: "scene_revisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_claims_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      story_entities: {
        Row: {
          aliases: string[]
          author_confirmed: boolean
          created_at: string
          current_state: string | null
          first_scene_id: string | null
          id: string
          identity: string | null
          kind: string
          name: string
          notes: string | null
          project_id: string
          truth_type: string
          updated_at: string
        }
        Insert: {
          aliases?: string[]
          author_confirmed?: boolean
          created_at?: string
          current_state?: string | null
          first_scene_id?: string | null
          id?: string
          identity?: string | null
          kind?: string
          name: string
          notes?: string | null
          project_id: string
          truth_type?: string
          updated_at?: string
        }
        Update: {
          aliases?: string[]
          author_confirmed?: boolean
          created_at?: string
          current_state?: string | null
          first_scene_id?: string | null
          id?: string
          identity?: string | null
          kind?: string
          name?: string
          notes?: string | null
          project_id?: string
          truth_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_entities_first_scene_id_fkey"
            columns: ["first_scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_entities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
