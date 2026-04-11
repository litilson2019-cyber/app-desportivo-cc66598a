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
      anuncio_imagens: {
        Row: {
          anuncio_id: string
          created_at: string | null
          id: string
          imagem_url: string
          ordem: number | null
        }
        Insert: {
          anuncio_id: string
          created_at?: string | null
          id?: string
          imagem_url: string
          ordem?: number | null
        }
        Update: {
          anuncio_id?: string
          created_at?: string | null
          id?: string
          imagem_url?: string
          ordem?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "anuncio_imagens_anuncio_id_fkey"
            columns: ["anuncio_id"]
            isOneToOne: false
            referencedRelation: "anuncios_marketplace"
            referencedColumns: ["id"]
          },
        ]
      }
      anuncios_marketplace: {
        Row: {
          ativo: boolean | null
          categoria: string
          contacto_link: string | null
          created_at: string | null
          descricao: string | null
          id: string
          localizacao: string | null
          preco: number | null
          titulo: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string
          contacto_link?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          localizacao?: string | null
          preco?: number | null
          titulo: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          categoria?: string
          contacto_link?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          localizacao?: string | null
          preco?: number | null
          titulo?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      artista_avaliacoes: {
        Row: {
          artista_id: string
          comentario: string | null
          created_at: string
          id: string
          nota: number
          updated_at: string
          user_id: string
        }
        Insert: {
          artista_id: string
          comentario?: string | null
          created_at?: string
          id?: string
          nota: number
          updated_at?: string
          user_id: string
        }
        Update: {
          artista_id?: string
          comentario?: string | null
          created_at?: string
          id?: string
          nota?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artista_avaliacoes_artista_id_fkey"
            columns: ["artista_id"]
            isOneToOne: false
            referencedRelation: "artistas"
            referencedColumns: ["id"]
          },
        ]
      }
      artista_galeria: {
        Row: {
          artista_id: string
          created_at: string | null
          id: string
          ordem: number | null
          tipo: string
          titulo: string | null
          url: string
        }
        Insert: {
          artista_id: string
          created_at?: string | null
          id?: string
          ordem?: number | null
          tipo?: string
          titulo?: string | null
          url: string
        }
        Update: {
          artista_id?: string
          created_at?: string | null
          id?: string
          ordem?: number | null
          tipo?: string
          titulo?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "artista_galeria_artista_id_fkey"
            columns: ["artista_id"]
            isOneToOne: false
            referencedRelation: "artistas"
            referencedColumns: ["id"]
          },
        ]
      }
      artistas: {
        Row: {
          ativo: boolean | null
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          cidade: string | null
          contacto: string | null
          created_at: string | null
          id: string
          nome_artistico: string
          percentagem_musico: number | null
          percentagem_produtora: number | null
          preco_album: number | null
          preco_base_atuacao: number | null
          produtora_id: string | null
          tipo: string
          tipo_evento_permitido: string | null
          updated_at: string | null
          user_id: string
          verificado: boolean | null
        }
        Insert: {
          ativo?: boolean | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          cidade?: string | null
          contacto?: string | null
          created_at?: string | null
          id?: string
          nome_artistico: string
          percentagem_musico?: number | null
          percentagem_produtora?: number | null
          preco_album?: number | null
          preco_base_atuacao?: number | null
          produtora_id?: string | null
          tipo?: string
          tipo_evento_permitido?: string | null
          updated_at?: string | null
          user_id: string
          verificado?: boolean | null
        }
        Update: {
          ativo?: boolean | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          cidade?: string | null
          contacto?: string | null
          created_at?: string | null
          id?: string
          nome_artistico?: string
          percentagem_musico?: number | null
          percentagem_produtora?: number | null
          preco_album?: number | null
          preco_base_atuacao?: number | null
          produtora_id?: string | null
          tipo?: string
          tipo_evento_permitido?: string | null
          updated_at?: string | null
          user_id?: string
          verificado?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "artistas_produtora_id_fkey"
            columns: ["produtora_id"]
            isOneToOne: false
            referencedRelation: "produtoras"
            referencedColumns: ["id"]
          },
        ]
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
      calculos_atuacao: {
        Row: {
          artista_id: string
          created_at: string | null
          descricao: string | null
          id: string
          percentagem_musico: number
          percentagem_produtora: number
          produtora_id: string | null
          tipo_evento: string | null
          valor_musico: number
          valor_produtora: number
          valor_total: number
        }
        Insert: {
          artista_id: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          percentagem_musico: number
          percentagem_produtora: number
          produtora_id?: string | null
          tipo_evento?: string | null
          valor_musico: number
          valor_produtora: number
          valor_total: number
        }
        Update: {
          artista_id?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          percentagem_musico?: number
          percentagem_produtora?: number
          produtora_id?: string | null
          tipo_evento?: string | null
          valor_musico?: number
          valor_produtora?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "calculos_atuacao_artista_id_fkey"
            columns: ["artista_id"]
            isOneToOne: false
            referencedRelation: "artistas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calculos_atuacao_produtora_id_fkey"
            columns: ["produtora_id"]
            isOneToOne: false
            referencedRelation: "produtoras"
            referencedColumns: ["id"]
          },
        ]
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
      destaque_interacoes: {
        Row: {
          created_at: string | null
          destaque_id: string
          id: string
          ip_address: string | null
          tipo: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          destaque_id: string
          id?: string
          ip_address?: string | null
          tipo: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          destaque_id?: string
          id?: string
          ip_address?: string | null
          tipo?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "destaque_interacoes_destaque_id_fkey"
            columns: ["destaque_id"]
            isOneToOne: false
            referencedRelation: "destaques_vitrine"
            referencedColumns: ["id"]
          },
        ]
      }
      destaques_vitrine: {
        Row: {
          ativo: boolean
          created_at: string | null
          data_fim: string
          data_inicio: string
          gasto: number
          id: string
          loja_id: string
          orcamento: number
          preco_unitario: number
          prioridade: number
          tipo: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string | null
          data_fim: string
          data_inicio?: string
          gasto?: number
          id?: string
          loja_id: string
          orcamento?: number
          preco_unitario?: number
          prioridade?: number
          tipo?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean
          created_at?: string | null
          data_fim?: string
          data_inicio?: string
          gasto?: number
          id?: string
          loja_id?: string
          orcamento?: number
          preco_unitario?: number
          prioridade?: number
          tipo?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "destaques_vitrine_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
      }
      divulgacao_cliques: {
        Row: {
          convertido: boolean | null
          created_at: string | null
          id: string
          ip_address: string | null
          link_id: string
          referrer_user_id: string | null
          user_agent: string | null
          valor_comissao: number | null
        }
        Insert: {
          convertido?: boolean | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          link_id: string
          referrer_user_id?: string | null
          user_agent?: string | null
          valor_comissao?: number | null
        }
        Update: {
          convertido?: boolean | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          link_id?: string
          referrer_user_id?: string | null
          user_agent?: string | null
          valor_comissao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "divulgacao_cliques_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "divulgacao_links"
            referencedColumns: ["id"]
          },
        ]
      }
      divulgacao_comissoes: {
        Row: {
          created_at: string | null
          descricao: string | null
          id: string
          item_id: string | null
          item_tipo: string | null
          link_id: string | null
          status: string
          user_id: string
          valor: number
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          item_id?: string | null
          item_tipo?: string | null
          link_id?: string | null
          status?: string
          user_id: string
          valor?: number
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          id?: string
          item_id?: string | null
          item_tipo?: string | null
          link_id?: string | null
          status?: string
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "divulgacao_comissoes_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "divulgacao_links"
            referencedColumns: ["id"]
          },
        ]
      }
      divulgacao_links: {
        Row: {
          ativo: boolean
          cliques: number
          codigo: string
          comissao_percentual: number
          conversoes: number
          created_at: string | null
          id: string
          item_id: string
          tipo: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean
          cliques?: number
          codigo: string
          comissao_percentual?: number
          conversoes?: number
          created_at?: string | null
          id?: string
          item_id: string
          tipo?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean
          cliques?: number
          codigo?: string
          comissao_percentual?: number
          conversoes?: number
          created_at?: string | null
          id?: string
          item_id?: string
          tipo?: string
          updated_at?: string | null
          user_id?: string
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
      lojas: {
        Row: {
          ativo: boolean | null
          bio: string | null
          contacto_outro: string | null
          contacto_whatsapp: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          nome: string
          updated_at: string | null
          user_id: string
          verificado: boolean | null
        }
        Insert: {
          ativo?: boolean | null
          bio?: string | null
          contacto_outro?: string | null
          contacto_whatsapp?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          updated_at?: string | null
          user_id: string
          verificado?: boolean | null
        }
        Update: {
          ativo?: boolean | null
          bio?: string | null
          contacto_outro?: string | null
          contacto_whatsapp?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          updated_at?: string | null
          user_id?: string
          verificado?: boolean | null
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
      planos_comerciais: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          preco_anual: number
          preco_mensal: number
          selo_verificado: boolean | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          preco_anual?: number
          preco_mensal?: number
          selo_verificado?: boolean | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          preco_anual?: number
          preco_mensal?: number
          selo_verificado?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      produto_imagens: {
        Row: {
          created_at: string | null
          id: string
          imagem_url: string
          ordem: number | null
          produto_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          imagem_url: string
          ordem?: number | null
          produto_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          imagem_url?: string
          ordem?: number | null
          produto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "produto_imagens_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtoras: {
        Row: {
          ativo: boolean | null
          bio: string | null
          contacto: string | null
          created_at: string | null
          endereco: string | null
          id: string
          logo_url: string | null
          nif: string | null
          nome: string
          responsavel: string | null
          updated_at: string | null
          user_id: string
          verificado: boolean | null
        }
        Insert: {
          ativo?: boolean | null
          bio?: string | null
          contacto?: string | null
          created_at?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nif?: string | null
          nome: string
          responsavel?: string | null
          updated_at?: string | null
          user_id: string
          verificado?: boolean | null
        }
        Update: {
          ativo?: boolean | null
          bio?: string | null
          contacto?: string | null
          created_at?: string | null
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nif?: string | null
          nome?: string
          responsavel?: string | null
          updated_at?: string | null
          user_id?: string
          verificado?: boolean | null
        }
        Relationships: []
      }
      produtos: {
        Row: {
          ativo: boolean | null
          contacto_link: string | null
          created_at: string | null
          descricao: string | null
          id: string
          loja_id: string
          nome: string
          ordem: number | null
          preco: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          contacto_link?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          loja_id: string
          nome: string
          ordem?: number | null
          preco?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          contacto_link?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          loja_id?: string
          nome?: string
          ordem?: number | null
          preco?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produtos_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
        ]
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
          wallet_bonus_balance: number | null
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
          wallet_bonus_balance?: number | null
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
          wallet_bonus_balance?: number | null
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
      subscricoes_loja: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          data_fim: string
          data_inicio: string
          id: string
          loja_id: string
          plano_id: string
          tipo: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          data_fim: string
          data_inicio?: string
          id?: string
          loja_id: string
          plano_id: string
          tipo?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          data_fim?: string
          data_inicio?: string
          id?: string
          loja_id?: string
          plano_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscricoes_loja_loja_id_fkey"
            columns: ["loja_id"]
            isOneToOne: false
            referencedRelation: "lojas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscricoes_loja_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_comerciais"
            referencedColumns: ["id"]
          },
        ]
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
      generate_promo_code: { Args: never; Returns: string }
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
