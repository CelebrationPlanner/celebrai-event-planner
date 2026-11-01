
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "conversations": {
                  Row: {
                    "created_at": string,"event_id": string,"id": string,"messages": NonNullable<Json>,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"event_id": string,"id"?: string,"messages"?: NonNullable<Json>,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "created_at"?: string,"event_id"?: string,"id"?: string,"messages"?: NonNullable<Json>,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversations_event_fk"
      columns: ["event_id","user_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"event_plans": {
                  Row: {
                    "created_at": string,"event_id": string,"id": string,"plan": NonNullable<Json>,"user_id": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"event_id": string,"id"?: string,"plan": NonNullable<Json>,"user_id"?: string,"version": number
                  }
                  Update: {
                    "created_at"?: string,"event_id"?: string,"id"?: string,"plan"?: NonNullable<Json>,"user_id"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "event_plans_event_fk"
      columns: ["event_id","user_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"events": {
                  Row: {
                    "additional_instructions": string,"age_group": string,"budget_minor": number,"created_at": string,"currency": string,"dietary_requirements": (string)[],"event_date": string | null,"event_name": string,"guest_count": number | null,"id": string,"invitation_text": string,"invitation_tone": string,"location": string,"occasion": string | null,"status": string,"theme_preferences": (string)[],"updated_at": string,"user_id": string,"venue_preference": string
                  }
                  ComputedFields: never
                  Insert: {
                    "additional_instructions"?: string,"age_group"?: string,"budget_minor": number,"created_at"?: string,"currency"?: string,"dietary_requirements"?: (string)[],"event_date"?: string | null,"event_name": string,"guest_count"?: number | null,"id"?: string,"invitation_text"?: string,"invitation_tone"?: string,"location"?: string,"occasion"?: string | null,"status"?: string,"theme_preferences"?: (string)[],"updated_at"?: string,"user_id"?: string,"venue_preference"?: string
                  }
                  Update: {
                    "additional_instructions"?: string,"age_group"?: string,"budget_minor"?: number,"created_at"?: string,"currency"?: string,"dietary_requirements"?: (string)[],"event_date"?: string | null,"event_name"?: string,"guest_count"?: number | null,"id"?: string,"invitation_text"?: string,"invitation_tone"?: string,"location"?: string,"occasion"?: string | null,"status"?: string,"theme_preferences"?: (string)[],"updated_at"?: string,"user_id"?: string,"venue_preference"?: string
                  }
                  Relationships: [
                    
                  ]
                },"expenses": {
                  Row: {
                    "actual_minor": number | null,"category": string,"created_at": string,"estimated_minor": number,"event_id": string,"id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actual_minor"?: number | null,"category": string,"created_at"?: string,"estimated_minor": number,"event_id": string,"id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "actual_minor"?: number | null,"category"?: string,"created_at"?: string,"estimated_minor"?: number,"event_id"?: string,"id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "expenses_event_fk"
      columns: ["event_id","user_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id","user_id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"default_currency": string,"display_name": string,"id": string,"time_zone": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"default_currency"?: string,"display_name"?: string,"id": string,"time_zone"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"default_currency"?: string,"display_name"?: string,"id"?: string,"time_zone"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"tasks": {
                  Row: {
                    "completed": boolean,"created_at": string,"due_date": string | null,"event_id": string,"id": string,"kind": string,"priority": string,"title": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed"?: boolean,"created_at"?: string,"due_date"?: string | null,"event_id": string,"id"?: string,"kind"?: string,"priority"?: string,"title": string,"updated_at"?: string,"user_id"?: string
                  }
                  Update: {
                    "completed"?: boolean,"created_at"?: string,"due_date"?: string | null,"event_id"?: string,"id"?: string,"kind"?: string,"priority"?: string,"title"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_event_fk"
      columns: ["event_id","user_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id","user_id"]
    }
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

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
