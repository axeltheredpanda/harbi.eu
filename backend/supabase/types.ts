export type Database = {
  public: {
    Tables: {
      todos: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          done: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          done?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          done?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          summary: string | null;
          summary_until_message_id: string | null;
          topic: string | null;
          topic_at: string | null;
          active_leaf_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          summary?: string | null;
          summary_until_message_id?: string | null;
          topic?: string | null;
          topic_at?: string | null;
          active_leaf_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          summary?: string | null;
          summary_until_message_id?: string | null;
          topic?: string | null;
          topic_at?: string | null;
          active_leaf_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: "user" | "assistant";
          content: string;
          created_at: string;
          token_count: number | null;
          parent_id: string | null;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: "user" | "assistant";
          content?: string;
          created_at?: string;
          token_count?: number | null;
          parent_id?: string | null;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: "user" | "assistant";
          content?: string;
          created_at?: string;
          token_count?: number | null;
          parent_id?: string | null;
        };
        Relationships: [];
      };
      memories: {
        Row: {
          id: string;
          user_id: string;
          category: "personal" | "projects" | "preferences" | "ongoing" | "other";
          title: string;
          content: string;
          sensitive: boolean;
          pinned: boolean;
          source_conversation_id: string | null;
          last_touched_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: "personal" | "projects" | "preferences" | "ongoing" | "other";
          title: string;
          content: string;
          sensitive?: boolean;
          pinned?: boolean;
          source_conversation_id?: string | null;
          last_touched_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category?: "personal" | "projects" | "preferences" | "ongoing" | "other";
          title?: string;
          content?: string;
          sensitive?: boolean;
          pinned?: boolean;
          source_conversation_id?: string | null;
          last_touched_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      attachments: {
        Row: {
          id: string;
          user_id: string;
          conversation_id: string;
          message_id: string | null;
          type: "pdf" | "image";
          storage_path: string;
          extracted_text: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          conversation_id: string;
          message_id?: string | null;
          type: "pdf" | "image";
          storage_path: string;
          extracted_text?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          conversation_id?: string;
          message_id?: string | null;
          type?: "pdf" | "image";
          storage_path?: string;
          extracted_text?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      vehicles: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          price: number | null;
          mileage: number | null;
          year: number | null;
          url: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          price?: number | null;
          mileage?: number | null;
          year?: number | null;
          url?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          price?: number | null;
          mileage?: number | null;
          year?: number | null;
          url?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      bg_removals: {
        Row: {
          id: string;
          user_id: string;
          mode: "fast" | "quality";
          original_path: string;
          result_path: string;
          original_name: string | null;
          content_hash: string | null;
          duration_ms: number | null;
          cache_hit: boolean;
          failed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          mode: "fast" | "quality";
          original_path: string;
          result_path: string;
          original_name?: string | null;
          content_hash?: string | null;
          duration_ms?: number | null;
          cache_hit?: boolean;
          failed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          mode?: "fast" | "quality";
          original_path?: string;
          result_path?: string;
          original_name?: string | null;
          content_hash?: string | null;
          duration_ms?: number | null;
          cache_hit?: boolean;
          failed?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          id: string;
          relationship_status: "single" | "dating";
          single_since: string;
          louis_joke_mode: boolean;
          now_playing_title: string | null;
          now_playing_artist: string | null;
          now_playing_url: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          relationship_status?: "single" | "dating";
          single_since?: string;
          louis_joke_mode?: boolean;
          now_playing_title?: string | null;
          now_playing_artist?: string | null;
          now_playing_url?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          relationship_status?: "single" | "dating";
          single_since?: string;
          louis_joke_mode?: boolean;
          now_playing_title?: string | null;
          now_playing_artist?: string | null;
          now_playing_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      cv_milestones: {
        Row: {
          id: string;
          period: string;
          title_fr: string;
          title_en: string;
          place_fr: string;
          place_en: string;
          summary_fr: string;
          summary_en: string;
          image_path: string | null;
          sort_order: number;
          published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          period: string;
          title_fr: string;
          title_en: string;
          place_fr?: string;
          place_en?: string;
          summary_fr: string;
          summary_en: string;
          image_path?: string | null;
          sort_order?: number;
          published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          period?: string;
          title_fr?: string;
          title_en?: string;
          place_fr?: string;
          place_en?: string;
          summary_fr?: string;
          summary_en?: string;
          image_path?: string | null;
          sort_order?: number;
          published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      claudette_settings: {
        Row: {
          user_id: string;
          web_search_enabled: boolean;
          profile: Record<string, unknown>;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          web_search_enabled?: boolean;
          profile?: Record<string, unknown>;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          web_search_enabled?: boolean;
          profile?: Record<string, unknown>;
          updated_at?: string;
        };
        Relationships: [];
      };
      feeds: {
        Row: {
          id: string;
          url: string;
          name: string;
          favicon_url: string | null;
          last_fetched_at: string | null;
          status: "ok" | "unreachable";
          consecutive_failures: number;
          tags: string[];
          created_at: string;
        };
        Insert: {
          id: string;
          url: string;
          name: string;
          favicon_url?: string | null;
          last_fetched_at?: string | null;
          status?: "ok" | "unreachable";
          consecutive_failures?: number;
          tags?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          url?: string;
          name?: string;
          favicon_url?: string | null;
          last_fetched_at?: string | null;
          status?: "ok" | "unreachable";
          consecutive_failures?: number;
          tags?: string[];
          created_at?: string;
        };
        Relationships: [];
      };
      feed_items: {
        Row: {
          id: string;
          feed_id: string;
          guid: string;
          title: string;
          url: string;
          published_at: string | null;
          content_snippet: string | null;
          full_content: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          feed_id: string;
          guid: string;
          title: string;
          url: string;
          published_at?: string | null;
          content_snippet?: string | null;
          full_content?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          feed_id?: string;
          guid?: string;
          title?: string;
          url?: string;
          published_at?: string | null;
          content_snippet?: string | null;
          full_content?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      claude_usage: {
        Row: {
          id: string;
          user_id: string;
          conversation_id: string | null;
          message_id: string | null;
          model: string;
          input_tokens: number | null;
          output_tokens: number | null;
          cache_creation_tokens: number | null;
          cache_read_tokens: number | null;
          ttft_ms: number | null;
          total_ms: number | null;
          web_search: boolean;
          aborted: boolean;
          error: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          conversation_id?: string | null;
          message_id?: string | null;
          model: string;
          input_tokens?: number | null;
          output_tokens?: number | null;
          cache_creation_tokens?: number | null;
          cache_read_tokens?: number | null;
          ttft_ms?: number | null;
          total_ms?: number | null;
          web_search?: boolean;
          aborted?: boolean;
          error?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          conversation_id?: string | null;
          message_id?: string | null;
          model?: string;
          input_tokens?: number | null;
          output_tokens?: number | null;
          cache_creation_tokens?: number | null;
          cache_read_tokens?: number | null;
          ttft_ms?: number | null;
          total_ms?: number | null;
          web_search?: boolean;
          aborted?: boolean;
          error?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      service_events: {
        Row: {
          id: string;
          user_id: string | null;
          service: "claude" | "cutout" | "news" | "other";
          kind: "success" | "error" | "timeout" | "info";
          detail: string | null;
          duration_ms: number | null;
          meta: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          service: "claude" | "cutout" | "news" | "other";
          kind: "success" | "error" | "timeout" | "info";
          detail?: string | null;
          duration_ms?: number | null;
          meta?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          service?: "claude" | "cutout" | "news" | "other";
          kind?: "success" | "error" | "timeout" | "info";
          detail?: string | null;
          duration_ms?: number | null;
          meta?: Record<string, unknown>;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};

export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
export type Message = Database["public"]["Tables"]["messages"]["Row"];
export type Attachment = Database["public"]["Tables"]["attachments"]["Row"];
export type Vehicle = Database["public"]["Tables"]["vehicles"]["Row"];
export type BgRemoval = Database["public"]["Tables"]["bg_removals"]["Row"];
export type SiteSettings = Database["public"]["Tables"]["site_settings"]["Row"];
export type RelationshipStatus = SiteSettings["relationship_status"];

export type MessageWithAttachments = Message & {
  attachments: Attachment[];
};
