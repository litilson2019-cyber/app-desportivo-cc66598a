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
      admin_logs: {
        Row: {
          acao: string
          admin_id: string
          created_at: string | null
          detalhes: Json | null
          id: string
          ip_address: string | null
        }
        Insert: {
          acao: string
          admin_id: string
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          ip_address?: string | null
        }
        Update: {
          acao?: string
          admin_id?: string
          created_at?: string | null
          detalhes?: Json | null
          id?: string
          ip_address?: string | null
        }
        Relationships: []
      }
      ajustes_saldo: {
        Row: {
          admin_id: string
          created_at: string | null
          id: string
          motivo: string | null
          saldo_anterior: number
          saldo_novo: number
          tipo: string
          user_id: string
          valor: number
        }
        Insert: {
          admin_id: string
          created_at?: string | null
          id?: string
          motivo?: string | null
          saldo_anterior: number
          saldo_novo: number
          tipo: string
          user_id: string
          valor: number
        }
        Update: {
          admin_id?: string
          created_at?: string | null
          id?: string
          motivo?: string | null
          saldo_anterior?: number
          saldo_novo?: number
          tipo?: string
          user_id?: string
          valor?: number
        }
        Relationships: []
      }
      banners: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          duracao_segundos: number | null
          id: string
          imagem_url: string
          link: string | null
          ordem: number | null
          titulo: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          duracao_segundos?: number | null
          id?: string
          imagem_url: string
          link?: string | null
          ordem?: number | null
          titulo?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          duracao_segundos?: number | null
          id?: string
          imagem_url?: string
          link?: string | null
          ordem?: number | null
          titulo?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bilhetes: {
        Row: {
          analise_ia: string | null
          created_at: string | null
          id: string
          jogos: Json
          mercados_recomendados: Json | null
          modo: string | null
          odds_totais: number | null
          probabilidade_estimada: number | null
          status: string | null
          user_id: string
        }
        Insert: {
          analise_ia?: string | null
          created_at?: string | null
          id?: string
          jogos: Json
          mercados_recomendados?: Json | null
          modo?: string | null
          odds_totais?: number | null
          probabilidade_estimada?: number | null
          status?: string | null
          user_id: string
        }
        Update: {
          analise_ia?: string | null
          created_at?: string | null
          id?: string
          jogos?: Json
          mercados_recomendados?: Json | null
          modo?: string | null
          odds_totais?: number | null
          probabilidade_estimada?: number | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bilhetes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bonus_convite_historico: {
        Row: {
          created_at: string | null
          id: string
          invited_user_id: string
          referrer_id: string
          tipo_bonus: string
          transacao_deposito_id: string
          valor_bonus: number
          valor_deposito: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_user_id: string
          referrer_id: string
          tipo_bonus: string
          transacao_deposito_id: string
          valor_bonus: number
          valor_deposito: number
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_user_id?: string
          referrer_id?: string
          tipo_bonus?: string
          transacao_deposito_id?: string
          valor_bonus?: number
          valor_deposito?: number
        }
        Relationships: []
      }
      configuracoes_sistema: {
        Row: {
          chave: string
          created_at: string | null
          descricao: string | null
          id: string
          updated_at: string | null
          valor: string | null
        }
        Insert: {
          chave: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          updated_at?: string | null
          valor?: string | null
        }
        Update: {
          chave?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          updated_at?: string | null
          valor?: string | null
        }
        Relationships: []
      }
      investimentos_ativos: {
        Row: {
          created_at: string | null
          dias_restantes: number
          id: string
          nome_plano: string
          retorno_diario: number
          user_id: string
          valor_investido: number
        }
        Insert: {
          created_at?: string | null
          dias_restantes: number
          id?: string
          nome_plano: string
          retorno_diario: number
          user_id: string
          valor_investido: number
        }
        Update: {
          created_at?: string | null
          dias_restantes?: number
          id?: string
          nome_plano?: string
          retorno_diario?: number
          user_id?: string
          valor_investido?: number
        }
        Relationships: [
          {
            foreignKeyName: "investimentos_ativos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invited_users: {
        Row: {
          created_at: string | null
          id: string
          invited_user_id: string
          referrer_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_user_id: string
          referrer_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_user_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      metas_convite_alcancadas: {
        Row: {
          created_at: string | null
          id: string
          nivel_convidados: number
          user_id: string
          valor_bonus: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          nivel_convidados: number
          user_id: string
          valor_bonus: number
        }
        Update: {
          created_at?: string | null
          id?: string
          nivel_convidados?: number
          user_id?: string
          valor_bonus?: number
        }
        Relationships: []
      }
      metodos_deposito: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          duracao_exibicao: number | null
          iban: string | null
          id: string
          nome: string
          numero_express: string | null
          ordem: number | null
          tipo: string
          titular_conta: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          duracao_exibicao?: number | null
          iban?: string | null
          id?: string
          nome: string
          numero_express?: string | null
          ordem?: number | null
          tipo: string
          titular_conta?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          duracao_exibicao?: number | null
          iban?: string | null
          id?: string
          nome?: string
          numero_express?: string | null
          ordem?: number | null
          tipo?: string
          titular_conta?: string | null
        }
        Relationships: []
      }
      planos: {
        Row: {
          acesso_mercados_avancados: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          limite_construcoes: number
          limite_jogos: number
          nome: string
          preco: number
          verificacao_automatica: boolean | null
        }
        Insert: {
          acesso_mercados_avancados?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          limite_construcoes: number
          limite_jogos: number
          nome: string
          preco: number
          verificacao_automatica?: boolean | null
        }
        Update: {
          acesso_mercados_avancados?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          limite_construcoes?: number
          limite_jogos?: number
          nome?: string
          preco?: number
          verificacao_automatica?: boolean | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean | null
          avatar_url: string | null
          bloqueado: boolean | null
          bonus_convite_pago: boolean | null
          convidado_por: string | null
          created_at: string | null
          criado_por: string | null
          email: string | null
          id: string
          nome_completo: string | null
          plano_id: string | null
          primeiro_deposito_processado: boolean | null
          saldo: number | null
          telefone: string | null
          tipo_conta: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          avatar_url?: string | null
          bloqueado?: boolean | null
          bonus_convite_pago?: boolean | null
          convidado_por?: string | null
          created_at?: string | null
          criado_por?: string | null
          email?: string | null
          id: string
          nome_completo?: string | null
          plano_id?: string | null
          primeiro_deposito_processado?: boolean | null
          saldo?: number | null
          telefone?: string | null
          tipo_conta?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          avatar_url?: string | null
          bloqueado?: boolean | null
          bonus_convite_pago?: boolean | null
          convidado_por?: string | null
          created_at?: string | null
          criado_por?: string | null
          email?: string | null
          id?: string
          nome_completo?: string | null
          plano_id?: string | null
          primeiro_deposito_processado?: boolean | null
          saldo?: number | null
          telefone?: string | null
          tipo_conta?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_plano"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          codigo_convite: string
          created_at: string | null
          id: string
          total_convidados: number | null
          user_id: string
        }
        Insert: {
          codigo_convite: string
          created_at?: string | null
          id?: string
          total_convidados?: number | null
          user_id: string
        }
        Update: {
          codigo_convite?: string
          created_at?: string | null
          id?: string
          total_convidados?: number | null
          user_id?: string
        }
        Relationships: []
      }
      team_profiles: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          permissoes: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          permissoes?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          permissoes?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      transacoes: {
        Row: {
          banco: string | null
          comprovativo_url: string | null
          created_at: string | null
          data_validacao: string | null
          descricao: string | null
          id: string
          motivo_rejeicao: string | null
          status: string | null
          tipo: string
          user_id: string
          validador_id: string | null
          valor: number
        }
        Insert: {
          banco?: string | null
          comprovativo_url?: string | null
          created_at?: string | null
          data_validacao?: string | null
          descricao?: string | null
          id?: string
          motivo_rejeicao?: string | null
          status?: string | null
          tipo: string
          user_id: string
          validador_id?: string | null
          valor: number
        }
        Update: {
          banco?: string | null
          comprovativo_url?: string | null
          created_at?: string | null
          data_validacao?: string | null
          descricao?: string | null
          id?: string
          motivo_rejeicao?: string | null
          status?: string | null
          tipo?: string
          user_id?: string
          validador_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "transacoes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          team_profile_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          team_profile_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          team_profile_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_team_profile_id_fkey"
            columns: ["team_profile_id"]
            isOneToOne: false
            referencedRelation: "team_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_bonus_amount: {
        Args: { valor_depositado: number }
        Returns: number
      }
      generate_referral_code: { Args: never; Returns: string }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_saldo: {
        Args: { amount: number; user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
