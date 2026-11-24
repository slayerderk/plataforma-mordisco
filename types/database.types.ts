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
      anuncio_etiquetas: {
        Row: {
          anuncio_id: string
          etiqueta_id: string
        }
        Insert: {
          anuncio_id: string
          etiqueta_id: string
        }
        Update: {
          anuncio_id?: string
          etiqueta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anuncio_etiquetas_anuncio_id_fkey"
            columns: ["anuncio_id"]
            isOneToOne: false
            referencedRelation: "anuncios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anuncio_etiquetas_etiqueta_id_fkey"
            columns: ["etiqueta_id"]
            isOneToOne: false
            referencedRelation: "etiquetas"
            referencedColumns: ["id"]
          },
        ]
      }
      anuncios: {
        Row: {
          activo: boolean | null
          created_at: string | null
          descripcion: string
          distrito_id: string | null
          edad: number | null
          es_vip: boolean | null
          fotos: string[] | null
          id: string
          modalidad: string
          permitir_comentarios: boolean | null
          plan_id: string | null
          titulo: string
          total_clics_telegram: number | null
          total_clics_whatsapp: number | null
          total_likes: number | null
          total_vistas: number | null
          ultima_republicacion: string | null
          updated_at: string | null
          usuario_id: string
          vigente_hasta: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          descripcion: string
          distrito_id?: string | null
          edad?: number | null
          es_vip?: boolean | null
          fotos?: string[] | null
          id?: string
          modalidad: string
          permitir_comentarios?: boolean | null
          plan_id?: string | null
          titulo: string
          total_clics_telegram?: number | null
          total_clics_whatsapp?: number | null
          total_likes?: number | null
          total_vistas?: number | null
          ultima_republicacion?: string | null
          updated_at?: string | null
          usuario_id: string
          vigente_hasta?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          descripcion?: string
          distrito_id?: string | null
          edad?: number | null
          es_vip?: boolean | null
          fotos?: string[] | null
          id?: string
          modalidad?: string
          permitir_comentarios?: boolean | null
          plan_id?: string | null
          titulo?: string
          total_clics_telegram?: number | null
          total_clics_whatsapp?: number | null
          total_likes?: number | null
          total_vistas?: number | null
          ultima_republicacion?: string | null
          updated_at?: string | null
          usuario_id?: string
          vigente_hasta?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anuncios_distrito_id_fkey"
            columns: ["distrito_id"]
            isOneToOne: false
            referencedRelation: "distritos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anuncios_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "planes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anuncios_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracion_admin: {
        Row: {
          dias_espera_republicar: number | null
          id: number
          logo_url: string | null
          peso_max_foto_mb: number | null
          plin_activo: boolean | null
          qr_plin_url: string | null
          qr_yape_url: string | null
          telefono_pago: string | null
          titular_pago: string | null
          updated_at: string | null
          yape_activo: boolean | null
        }
        Insert: {
          dias_espera_republicar?: number | null
          id?: number
          logo_url?: string | null
          peso_max_foto_mb?: number | null
          plin_activo?: boolean | null
          qr_plin_url?: string | null
          qr_yape_url?: string | null
          telefono_pago?: string | null
          titular_pago?: string | null
          updated_at?: string | null
          yape_activo?: boolean | null
        }
        Update: {
          dias_espera_republicar?: number | null
          id?: number
          logo_url?: string | null
          peso_max_foto_mb?: number | null
          plin_activo?: boolean | null
          qr_plin_url?: string | null
          qr_yape_url?: string | null
          telefono_pago?: string | null
          titular_pago?: string | null
          updated_at?: string | null
          yape_activo?: boolean | null
        }
        Relationships: []
      }
      cupones: {
        Row: {
          activo: boolean | null
          codigo: string
          created_at: string | null
          fecha_expiracion: string | null
          id: string
          monto_fijo_descuento: number | null
          porcentaje_descuento: number | null
          usos_actuales: number | null
          usos_maximos: number | null
        }
        Insert: {
          activo?: boolean | null
          codigo: string
          created_at?: string | null
          fecha_expiracion?: string | null
          id?: string
          monto_fijo_descuento?: number | null
          porcentaje_descuento?: number | null
          usos_actuales?: number | null
          usos_maximos?: number | null
        }
        Update: {
          activo?: boolean | null
          codigo?: string
          created_at?: string | null
          fecha_expiracion?: string | null
          id?: string
          monto_fijo_descuento?: number | null
          porcentaje_descuento?: number | null
          usos_actuales?: number | null
          usos_maximos?: number | null
        }
        Relationships: []
      }
      departamentos: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      distritos: {
        Row: {
          department_id: string | null
          id: string
          name: string
          province_id: string | null
        }
        Insert: {
          department_id?: string | null
          id: string
          name: string
          province_id?: string | null
        }
        Update: {
          department_id?: string | null
          id?: string
          name?: string
          province_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "distritos_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "distritos_province_id_fkey"
            columns: ["province_id"]
            isOneToOne: false
            referencedRelation: "provincias"
            referencedColumns: ["id"]
          },
        ]
      }
      etiquetas: {
        Row: {
          activo: boolean | null
          icono: string | null
          id: string
          nombre: string
          orden: number
        }
        Insert: {
          activo?: boolean | null
          icono?: string | null
          id?: string
          nombre: string
          orden?: number
        }
        Update: {
          activo?: boolean | null
          icono?: string | null
          id?: string
          nombre?: string
          orden?: number
        }
        Relationships: []
      }
      pagos: {
        Row: {
          anuncio_id: string
          aprobado_por: string | null
          codigo_operacion_ia: string | null
          comprobante_url: string
          created_at: string | null
          cupon_id: string | null
          emisor_leido_ia: string | null
          estado: string | null
          fecha_aprobacion: string | null
          fecha_leida_ia: string | null
          hash_imagen: string | null
          id: string
          metodo: string | null
          monto_esperado: number
          monto_leido_ia: number | null
          plan_id: string
          token_aprobacion: string | null
          token_usado: boolean | null
        }
        Insert: {
          anuncio_id: string
          aprobado_por?: string | null
          codigo_operacion_ia?: string | null
          comprobante_url: string
          created_at?: string | null
          cupon_id?: string | null
          emisor_leido_ia?: string | null
          estado?: string | null
          fecha_aprobacion?: string | null
          fecha_leida_ia?: string | null
          hash_imagen?: string | null
          id?: string
          metodo?: string | null
          monto_esperado: number
          monto_leido_ia?: number | null
          plan_id: string
          token_aprobacion?: string | null
          token_usado?: boolean | null
        }
        Update: {
          anuncio_id?: string
          aprobado_por?: string | null
          codigo_operacion_ia?: string | null
          comprobante_url?: string
          created_at?: string | null
          cupon_id?: string | null
          emisor_leido_ia?: string | null
          estado?: string | null
          fecha_aprobacion?: string | null
          fecha_leida_ia?: string | null
          hash_imagen?: string | null
          id?: string
          metodo?: string | null
          monto_esperado?: number
          monto_leido_ia?: number | null
          plan_id?: string
          token_aprobacion?: string | null
          token_usado?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_anuncio_id_fkey"
            columns: ["anuncio_id"]
            isOneToOne: false
            referencedRelation: "anuncios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_cupon_id_fkey"
            columns: ["cupon_id"]
            isOneToOne: false
            referencedRelation: "cupones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "planes"
            referencedColumns: ["id"]
          },
        ]
      }
      anuncio_likes: {
        Row: {
          anuncio_id: string
          created_at: string | null
          id: string
          usuario_id: string
        }
        Insert: {
          anuncio_id: string
          created_at?: string | null
          id?: string
          usuario_id: string
        }
        Update: {
          anuncio_id?: string
          created_at?: string | null
          id?: string
          usuario_id?: string
        }
        Relationships: []
      }
      comentarios: {
        Row: {
          activo: boolean | null
          anuncio_id: string
          contenido: string
          created_at: string | null
          id: string
          usuario_id: string
        }
        Insert: {
          activo?: boolean | null
          anuncio_id: string
          contenido: string
          created_at?: string | null
          id?: string
          usuario_id: string
        }
        Update: {
          activo?: boolean | null
          anuncio_id?: string
          contenido?: string
          created_at?: string | null
          id?: string
          usuario_id?: string
        }
        Relationships: []
      }
      favoritos: {
        Row: {
          anuncio_id: string
          created_at: string | null
          id: string
          usuario_id: string
        }
        Insert: {
          anuncio_id: string
          created_at?: string | null
          id?: string
          usuario_id: string
        }
        Update: {
          anuncio_id?: string
          created_at?: string | null
          id?: string
          usuario_id?: string
        }
        Relationships: []
      }
      anuncio_visitas: {
        Row: {
          anuncio_id: string
          created_at: string | null
          id: string
          perfil_id: string
          visitante_id: string | null
        }
        Insert: {
          anuncio_id: string
          created_at?: string | null
          id?: string
          perfil_id: string
          visitante_id?: string | null
        }
        Update: {
          anuncio_id?: string
          created_at?: string | null
          id?: string
          perfil_id?: string
          visitante_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'anuncio_visitas_anuncio_id_fkey'
            columns: ['anuncio_id']
            isOneToOne: false
            referencedRelation: 'anuncios'
            referencedColumns: ['id']
          },
        ]
      }
      perfiles: {
        Row: {
          codigo_otp: string | null
          created_at: string | null
          id: string
          nombre_comercial: string
          otp_expira: string | null
          rol: string | null
          telefono: string
          telefono_verificado: boolean | null
          updated_at: string | null
        }
        Insert: {
          codigo_otp?: string | null
          created_at?: string | null
          id: string
          nombre_comercial: string
          otp_expira?: string | null
          rol?: string | null
          telefono: string
          telefono_verificado?: boolean | null
          updated_at?: string | null
        }
        Update: {
          codigo_otp?: string | null
          created_at?: string | null
          id?: string
          nombre_comercial?: string
          otp_expira?: string | null
          rol?: string | null
          telefono?: string
          telefono_verificado?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      planes: {
        Row: {
          activo: boolean | null
          caracteristicas: Json | null
          created_at: string | null
          dias_duracion: number
          es_destacado: boolean | null
          id: string
          limite_fotos: number
          nombre: string
          orden: number | null
          precio: number
        }
        Insert: {
          activo?: boolean | null
          caracteristicas?: Json | null
          created_at?: string | null
          dias_duracion: number
          es_destacado?: boolean | null
          id?: string
          limite_fotos?: number
          nombre: string
          orden?: number | null
          precio?: number
        }
        Update: {
          activo?: boolean | null
          caracteristicas?: Json | null
          created_at?: string | null
          dias_duracion?: number
          es_destacado?: boolean | null
          id?: string
          limite_fotos?: number
          nombre?: string
          orden?: number | null
          precio?: number
        }
        Relationships: []
      }
      provincias: {
        Row: {
          department_id: string | null
          id: string
          name: string
        }
        Insert: {
          department_id?: string | null
          id: string
          name: string
        }
        Update: {
          department_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "provincias_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departamentos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aprobar_pago_con_vigencia: {
        Args: { p_origen?: string; p_pago_id: string }
        Returns: Json
      }
      listar_visitas_ofertante: {
        Args: { p_limite?: number }
        Returns: {
          anuncio_id: string
          anuncio_titulo: string | null
          created_at: string | null
          id: string
          visitante_id: string | null
          visitante_nombre: string | null
        }[]
      }
      registrar_visita_anuncio: {
        Args: { p_anuncio_id: string }
        Returns: Json
      }
      republicar_anuncio: {
        Args: { p_anuncio_id: string }
        Returns: Json
      }
      solicitar_otp_perfil: {
        Args: {
          p_codigo_hash: string
          p_expira: string
          p_nombre: string
          p_server_secret: string
          p_telefono: string
        }
        Returns: Json
      }
      toggle_anuncio_like: {
        Args: { p_anuncio_id: string }
        Returns: Json
      }
      toggle_favorito: {
        Args: { p_anuncio_id: string }
        Returns: Json
      }
      total_likes_anuncio: {
        Args: { p_anuncio_id: string }
        Returns: number
      }
      verificar_otp_perfil: {
        Args: { p_codigo_hash: string }
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

