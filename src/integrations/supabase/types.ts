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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          categoria: string
          cep: string | null
          client_id: string | null
          created_at: string
          data: string | null
          descricao: string | null
          endereco: string | null
          fotos: string[]
          hora: string | null
          ia_analisado_em: string | null
          ia_justificativa: string | null
          ia_proximos_passos: Json | null
          ia_tipo: string | null
          ia_urgencia: string | null
          id: string
          location_id: string | null
          nome_contato: string
          origem: string
          status: string
          tecnico_id: string | null
          tipo: string
          visita_orcamento: boolean
          whatsapp: string
        }
        Insert: {
          categoria: string
          cep?: string | null
          client_id?: string | null
          created_at?: string
          data?: string | null
          descricao?: string | null
          endereco?: string | null
          fotos?: string[]
          hora?: string | null
          ia_analisado_em?: string | null
          ia_justificativa?: string | null
          ia_proximos_passos?: Json | null
          ia_tipo?: string | null
          ia_urgencia?: string | null
          id?: string
          location_id?: string | null
          nome_contato: string
          origem?: string
          status?: string
          tecnico_id?: string | null
          tipo: string
          visita_orcamento?: boolean
          whatsapp: string
        }
        Update: {
          categoria?: string
          cep?: string | null
          client_id?: string | null
          created_at?: string
          data?: string | null
          descricao?: string | null
          endereco?: string | null
          fotos?: string[]
          hora?: string | null
          ia_analisado_em?: string | null
          ia_justificativa?: string | null
          ia_proximos_passos?: Json | null
          ia_tipo?: string | null
          ia_urgencia?: string | null
          id?: string
          location_id?: string | null
          nome_contato?: string
          origem?: string
          status?: string
          tecnico_id?: string | null
          tipo?: string
          visita_orcamento?: boolean
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      catalogo_itens: {
        Row: {
          a_partir: boolean
          ativo: boolean
          categoria: string
          created_at: string
          descricao: string | null
          id: string
          imagem_url: string | null
          ordem: number
          preco: number | null
          tipo: string
          titulo: string
        }
        Insert: {
          a_partir?: boolean
          ativo?: boolean
          categoria?: string
          created_at?: string
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          ordem?: number
          preco?: number | null
          tipo?: string
          titulo: string
        }
        Update: {
          a_partir?: boolean
          ativo?: boolean
          categoria?: string
          created_at?: string
          descricao?: string | null
          id?: string
          imagem_url?: string | null
          ordem?: number
          preco?: number | null
          tipo?: string
          titulo?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          created_at: string
          documento: string | null
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          documento?: string | null
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          documento?: string | null
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      configuracoes_empresa: {
        Row: {
          atualizado_em: string
          id: number
          pix_chave: string | null
          pix_cidade: string | null
          pix_nome: string | null
        }
        Insert: {
          atualizado_em?: string
          id?: number
          pix_chave?: string | null
          pix_cidade?: string | null
          pix_nome?: string | null
        }
        Update: {
          atualizado_em?: string
          id?: number
          pix_chave?: string | null
          pix_cidade?: string | null
          pix_nome?: string | null
        }
        Relationships: []
      }
      equipment: {
        Row: {
          ambiente: string | null
          btus: number | null
          created_at: string
          descricao: string
          gas: string | null
          id: string
          intervalo_meses: number
          location_id: string
          marca: string | null
          ultima_manutencao: string | null
          voltagem: string | null
        }
        Insert: {
          ambiente?: string | null
          btus?: number | null
          created_at?: string
          descricao: string
          gas?: string | null
          id?: string
          intervalo_meses?: number
          location_id: string
          marca?: string | null
          ultima_manutencao?: string | null
          voltagem?: string | null
        }
        Update: {
          ambiente?: string | null
          btus?: number | null
          created_at?: string
          descricao?: string
          gas?: string | null
          id?: string
          intervalo_meses?: number
          location_id?: string
          marca?: string | null
          ultima_manutencao?: string | null
          voltagem?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_entries: {
        Row: {
          categoria: string
          created_at: string
          data: string
          descricao: string
          id: string
          recebimento_id: string | null
          service_order_id: string | null
          tipo: string
          valor: number
        }
        Insert: {
          categoria?: string
          created_at?: string
          data?: string
          descricao: string
          id?: string
          recebimento_id?: string | null
          service_order_id?: string | null
          tipo: string
          valor?: number
        }
        Update: {
          categoria?: string
          created_at?: string
          data?: string
          descricao?: string
          id?: string
          recebimento_id?: string | null
          service_order_id?: string | null
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_entries_recebimento_id_fkey"
            columns: ["recebimento_id"]
            isOneToOne: false
            referencedRelation: "recebimentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_entries_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: true
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          apelido: string
          bairro: string | null
          cep: string | null
          cidade: string
          client_id: string
          created_at: string
          endereco: string
          id: string
        }
        Insert: {
          apelido?: string
          bairro?: string | null
          cep?: string | null
          cidade?: string
          client_id: string
          created_at?: string
          endereco: string
          id?: string
        }
        Update: {
          apelido?: string
          bairro?: string | null
          cep?: string | null
          cidade?: string
          client_id?: string
          created_at?: string
          endereco?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      mensagens_enviadas: {
        Row: {
          cliente_id: string | null
          data: string
          enviado_por: string
          id: string
          referencia_id: string | null
          tipo: string
        }
        Insert: {
          cliente_id?: string | null
          data?: string
          enviado_por?: string
          id?: string
          referencia_id?: string | null
          tipo: string
        }
        Update: {
          cliente_id?: string | null
          data?: string
          enviado_por?: string
          id?: string
          referencia_id?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "mensagens_enviadas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      modelos_mensagem: {
        Row: {
          atualizado_em: string
          chave: string
          id: string
          texto: string
          titulo: string
        }
        Insert: {
          atualizado_em?: string
          chave: string
          id?: string
          texto: string
          titulo: string
        }
        Update: {
          atualizado_em?: string
          chave?: string
          id?: string
          texto?: string
          titulo?: string
        }
        Relationships: []
      }
      os_fotos: {
        Row: {
          created_at: string
          id: string
          path: string
          service_order_id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          id?: string
          path: string
          service_order_id: string
          tipo?: string
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          service_order_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "os_fotos_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          especialidade: string | null
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          especialidade?: string | null
          id: string
          nome?: string
          telefone?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          especialidade?: string | null
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      quote_items: {
        Row: {
          created_at: string
          descricao: string
          id: string
          ordem: number
          quantidade: number
          quote_id: string
          tipo: string
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          ordem?: number
          quantidade?: number
          quote_id: string
          tipo?: string
          valor_unitario?: number
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          ordem?: number
          quantidade?: number
          quote_id?: string
          tipo?: string
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          client_id: string
          created_at: string
          descricao: string
          enviado_em: string | null
          id: string
          numero: number
          observacoes: string | null
          service_order_id: string | null
          status: string
          validade_dias: number
          valor: number
        }
        Insert: {
          client_id: string
          created_at?: string
          descricao: string
          enviado_em?: string | null
          id?: string
          numero?: number
          observacoes?: string | null
          service_order_id?: string | null
          status?: string
          validade_dias?: number
          valor?: number
        }
        Update: {
          client_id?: string
          created_at?: string
          descricao?: string
          enviado_em?: string | null
          id?: string
          numero?: number
          observacoes?: string | null
          service_order_id?: string | null
          status?: string
          validade_dias?: number
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      recebimentos: {
        Row: {
          cliente_id: string
          criado_em: string
          forma_pagamento: string | null
          id: string
          observacao: string | null
          ordem_id: string | null
          status: string
          valor_pago: number
          valor_total: number
          vencimento: string
        }
        Insert: {
          cliente_id: string
          criado_em?: string
          forma_pagamento?: string | null
          id?: string
          observacao?: string | null
          ordem_id?: string | null
          status?: string
          valor_pago?: number
          valor_total?: number
          vencimento?: string
        }
        Update: {
          cliente_id?: string
          criado_em?: string
          forma_pagamento?: string | null
          id?: string
          observacao?: string | null
          ordem_id?: string | null
          status?: string
          valor_pago?: number
          valor_total?: number
          vencimento?: string
        }
        Relationships: [
          {
            foreignKeyName: "recebimentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recebimentos_ordem_id_fkey"
            columns: ["ordem_id"]
            isOneToOne: true
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      service_order_items: {
        Row: {
          created_at: string
          id: string
          quantidade: number
          service_order_id: string
          stock_item_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quantidade?: number
          service_order_id: string
          stock_item_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quantidade?: number
          service_order_id?: string
          stock_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_order_items_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "service_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_order_items_stock_item_id_fkey"
            columns: ["stock_item_id"]
            isOneToOne: false
            referencedRelation: "stock_items"
            referencedColumns: ["id"]
          },
        ]
      }
      service_orders: {
        Row: {
          appointment_id: string | null
          categoria: string
          client_id: string
          concluida_em: string | null
          created_at: string
          descricao: string
          equipment_id: string | null
          estoque_baixado: boolean
          garantia_dias: number
          id: string
          inicio: string | null
          location_id: string | null
          numero: number
          status: string
          tecnico_id: string | null
          valor: number | null
        }
        Insert: {
          appointment_id?: string | null
          categoria: string
          client_id: string
          concluida_em?: string | null
          created_at?: string
          descricao: string
          equipment_id?: string | null
          estoque_baixado?: boolean
          garantia_dias?: number
          id?: string
          inicio?: string | null
          location_id?: string | null
          numero?: number
          status?: string
          tecnico_id?: string | null
          valor?: number | null
        }
        Update: {
          appointment_id?: string | null
          categoria?: string
          client_id?: string
          concluida_em?: string | null
          created_at?: string
          descricao?: string
          equipment_id?: string | null
          estoque_baixado?: boolean
          garantia_dias?: number
          id?: string
          inicio?: string | null
          location_id?: string | null
          numero?: number
          status?: string
          tecnico_id?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_orders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_orders_tecnico_id_fkey"
            columns: ["tecnico_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_items: {
        Row: {
          created_at: string
          custo: number
          id: string
          minimo: number
          nome: string
          quantidade: number
          unidade: string
        }
        Insert: {
          created_at?: string
          custo?: number
          id?: string
          minimo?: number
          nome: string
          quantidade?: number
          unidade?: string
        }
        Update: {
          created_at?: string
          custo?: number
          id?: string
          minimo?: number
          nome?: string
          quantidade?: number
          unidade?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      horarios_ocupados: {
        Args: { _fim: string; _inicio: string }
        Returns: {
          data: string
          hora: string
        }[]
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      registrar_pagamento: {
        Args: { _data: string; _forma: string; _rec: string; _valor: number }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "tecnico"
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
    Enums: {
      app_role: ["admin", "tecnico"],
    },
  },
} as const
