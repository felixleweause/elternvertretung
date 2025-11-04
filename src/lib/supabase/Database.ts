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
      announcements: {
        Row: {
          allow_comments: boolean
          attachments: Json
          body: string
          created_at: string
          created_by: string
          id: string
          pinned: boolean
          requires_ack: boolean
          school_id: string
          scope_id: string
          scope_type: Database["public"]["Enums"]["scope_type"]
          title: string
          updated_at: string
        }
        Insert: {
          allow_comments?: boolean
          attachments?: Json
          body: string
          created_at?: string
          created_by: string
          id?: string
          pinned?: boolean
          requires_ack?: boolean
          school_id: string
          scope_id: string
          scope_type: Database["public"]["Enums"]["scope_type"]
          title: string
          updated_at?: string
        }
        Update: {
          allow_comments?: boolean
          attachments?: Json
          body?: string
          created_at?: string
          created_by?: string
          id?: string
          pinned?: boolean
          requires_ack?: boolean
          school_id?: string
          scope_id?: string
          scope_type?: Database["public"]["Enums"]["scope_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          meta: Json
          school_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          meta?: Json
          school_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          meta?: Json
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      class_codes: {
        Row: {
          classroom_id: string
          code: string
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          school_id: string
          uses_remaining: number | null
        }
        Insert: {
          classroom_id: string
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          school_id: string
          uses_remaining?: number | null
        }
        Update: {
          classroom_id?: string
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          school_id?: string
          uses_remaining?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "class_codes_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_codes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      classrooms: {
        Row: {
          created_at: string
          id: string
          name: string
          school_id: string
          updated_at: string
          year: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          school_id: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          school_id?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "classrooms_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          child_initials: string | null
          classroom_id: string
          created_at: string
          id: string
          school_id: string
          user_id: string
        }
        Insert: {
          child_initials?: string | null
          classroom_id: string
          created_at?: string
          id?: string
          school_id: string
          user_id: string
        }
        Update: {
          child_initials?: string | null
          classroom_id?: string
          created_at?: string
          id?: string
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          agenda: Json
          created_at: string
          created_by: string | null
          description: string | null
          end_at: string | null
          id: string
          location: string | null
          minutes: Json
          remind_24h: boolean
          remind_2h: boolean
          school_id: string
          scope_id: string
          scope_type: Database["public"]["Enums"]["scope_type"]
          start_at: string
          title: string
          updated_at: string
        }
        Insert: {
          agenda?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          id?: string
          location?: string | null
          minutes?: Json
          remind_24h?: boolean
          remind_2h?: boolean
          school_id?: string
          scope_id: string
          scope_type: Database["public"]["Enums"]["scope_type"]
          start_at: string
          title: string
          updated_at?: string
        }
        Update: {
          agenda?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_at?: string | null
          id?: string
          location?: string | null
          minutes?: Json
          remind_24h?: boolean
          remind_2h?: boolean
          school_id?: string
          scope_id?: string
          scope_type?: Database["public"]["Enums"]["scope_type"]
          start_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      mandates: {
        Row: {
          created_at: string
          created_by: string | null
          end_at: string | null
          id: string
          role: Database["public"]["Enums"]["mandate_role"]
          school_id: string
          scope_id: string
          scope_type: Database["public"]["Enums"]["scope_type"]
          start_at: string
          status: Database["public"]["Enums"]["mandate_status"]
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["mandate_role"]
          school_id: string
          scope_id: string
          scope_type: Database["public"]["Enums"]["scope_type"]
          start_at?: string
          status?: Database["public"]["Enums"]["mandate_status"]
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["mandate_role"]
          school_id?: string
          scope_id?: string
          scope_type?: Database["public"]["Enums"]["scope_type"]
          start_at?: string
          status?: Database["public"]["Enums"]["mandate_status"]
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mandates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mandates_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mandates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mandates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          allow_abstain: boolean
          closed_at: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          description: string | null
          id: string
          kind: Database["public"]["Enums"]["poll_kind"]
          mandate_rule: string | null
          options: Json
          quorum: number | null
          seats: number
          school_id: string
          scope_id: string
          scope_type: Database["public"]["Enums"]["scope_type"]
          status: Database["public"]["Enums"]["poll_status"]
          title: string
          type: Database["public"]["Enums"]["poll_type"]
          updated_at: string
        }
        Insert: {
          allow_abstain?: boolean
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["poll_kind"]
          mandate_rule?: string | null
          options?: Json
          quorum?: number | null
          seats?: number
          school_id: string
          scope_id: string
          scope_type: Database["public"]["Enums"]["scope_type"]
          status?: Database["public"]["Enums"]["poll_status"]
          title: string
          type: Database["public"]["Enums"]["poll_type"]
          updated_at?: string
        }
        Update: {
          allow_abstain?: boolean
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["poll_kind"]
          mandate_rule?: string | null
          options?: Json
          quorum?: number | null
          seats?: number
          school_id?: string
          scope_id?: string
          scope_type?: Database["public"]["Enums"]["scope_type"]
          status?: Database["public"]["Enums"]["poll_status"]
          title?: string
          type?: Database["public"]["Enums"]["poll_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polls_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_candidates: {
        Row: {
          claimed_at: string | null
          classroom_id: string | null
          claim_code: string
          created_at: string
          created_by: string | null
          display_name: string
          expires_at: string
          id: string
          office: "class_rep" | "class_rep_deputy"
          poll_id: string
          school_id: string
          status: Database["public"]["Enums"]["poll_candidate_status"]
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          claimed_at?: string | null
          classroom_id?: string | null
          claim_code: string
          created_at?: string
          created_by?: string | null
          display_name: string
          expires_at?: string
          id?: string
          office: "class_rep" | "class_rep_deputy"
          poll_id: string
          school_id: string
          status?: Database["public"]["Enums"]["poll_candidate_status"]
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          claimed_at?: string | null
          classroom_id?: string | null
          claim_code?: string
          created_at?: string
          created_by?: string | null
          display_name?: string
          expires_at?: string
          id?: string
          office?: "class_rep" | "class_rep_deputy"
          poll_id?: string
          school_id?: string
          status?: Database["public"]["Enums"]["poll_candidate_status"]
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_candidates_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_candidates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_candidates_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_candidates_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_candidates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_candidates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          locale: string
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          locale?: string
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          locale?: string
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      read_receipts: {
        Row: {
          announcement_id: string
          id: string
          read_at: string
          school_id: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string
          school_id: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string
          school_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "read_receipts_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "read_receipts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "read_receipts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvps: {
        Row: {
          event_id: string
          id: string
          responded_at: string
          school_id: string
          status: Database["public"]["Enums"]["event_rsvp_status"]
          user_id: string
        }
        Insert: {
          event_id: string
          id?: string
          responded_at?: string
          school_id: string
          status: Database["public"]["Enums"]["event_rsvp_status"]
          user_id: string
        }
        Update: {
          event_id?: string
          id?: string
          responded_at?: string
          school_id?: string
          status?: Database["public"]["Enums"]["event_rsvp_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvps_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rsvps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string
          id: string
          name: string
          school_year_end_at: string
          subdomain: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          school_year_end_at: string
          subdomain: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          school_year_end_at?: string
          subdomain?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          created_by: string | null
          due_at: string | null
          event_id: string | null
          id: string
          school_id: string
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          event_id?: string | null
          id?: string
          school_id: string
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          created_by?: string | null
          due_at?: string | null
          event_id?: string | null
          id?: string
          school_id?: string
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          key: string
          school_id: string
          version: number
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          key: string
          school_id: string
          version: number
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          key?: string
          school_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          cast_at: string
          choice: string
          class_weight: number
          id: string
          poll_id: string
          school_id: string
          voter_id: string
        }
        Insert: {
          cast_at?: string
          choice: string
          class_weight?: number
          id?: string
          poll_id: string
          school_id: string
          voter_id: string
        }
        Update: {
          cast_at?: string
          choice?: string
          class_weight?: number
          id?: string
          poll_id?: string
          school_id?: string
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "mandates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_event: { Args: { p_event_id: string }; Returns: boolean }
      can_access_poll: { Args: { p_poll_id: string }; Returns: boolean }
      can_manage_event: { Args: { p_event_id: string }; Returns: boolean }
      can_manage_poll: { Args: { p_poll_id: string }; Returns: boolean }
      class_belongs_to_school: {
        Args: { class_id: string; target_school: string }
        Returns: boolean
      }
      enroll_with_class_code: {
        Args: { p_child_initials?: string; p_code: string }
        Returns: Json
      }
      get_user_school_id: { Args: never; Returns: string }
      is_class_member: { Args: { p_classroom_id: string }; Returns: boolean }
      is_class_representative: {
        Args: { p_classroom_id: string }
        Returns: boolean
      }
      is_school_admin: { Args: { target_school: string }; Returns: boolean }
      is_school_gev: { Args: { target_school: string }; Returns: boolean }
      mark_announcement_read: {
        Args: { p_announcement_id: string }
        Returns: string
      }
      poll_vote_allowed: {
        Args: { p_poll_id: string; p_voter_id: string }
        Returns: boolean
      }
      poll_vote_summary: {
        Args: { p_poll_id: string }
        Returns: {
          choice: string
          votes: number
        }[]
      }
      storage_docs_event_id: { Args: { object_name: string }; Returns: string }
    }
    Enums: {
      event_rsvp_status: "yes" | "no" | "maybe"
      mandate_role: "class_rep" | "class_rep_deputy" | "gev" | "admin"
      mandate_status: "active" | "scheduled" | "ended"
      poll_candidate_status:
        | "created"
        | "claimed"
        | "pending_assignment"
        | "assigned"
        | "expired"
      poll_kind: "general" | "election"
      poll_status: "draft" | "open" | "closed"
      poll_type: "open" | "secret"
      scope_type: "class" | "school"
      task_status: "pending" | "in_progress" | "done"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
      event_rsvp_status: ["yes", "no", "maybe"],
      mandate_role: ["class_rep", "class_rep_deputy", "gev", "admin"],
      mandate_status: ["active", "scheduled", "ended"],
      poll_candidate_status: [
        "created",
        "claimed",
        "pending_assignment",
        "assigned",
        "expired",
      ],
      poll_kind: ["general", "election"],
      poll_status: ["draft", "open", "closed"],
      poll_type: ["open", "secret"],
      scope_type: ["class", "school"],
      task_status: ["pending", "in_progress", "done"],
    },
  },
} as const
