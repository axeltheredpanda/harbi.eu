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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          summary?: string | null;
          summary_until_message_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          summary?: string | null;
          summary_until_message_id?: string | null;
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
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: "user" | "assistant";
          content?: string;
          created_at?: string;
          token_count?: number | null;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: "user" | "assistant";
          content?: string;
          created_at?: string;
          token_count?: number | null;
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
          created_at?: string;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          id: string;
          relationship_status: "single" | "dating";
          single_since: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          relationship_status?: "single" | "dating";
          single_since?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          relationship_status?: "single" | "dating";
          single_since?: string;
          updated_at?: string;
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
