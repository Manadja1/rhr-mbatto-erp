export interface SupabaseTableBuilder {
  select: (columns?: string) => Promise<{ data: unknown[]; error: null }>;
  insert: (values: unknown) => Promise<{ data: unknown; error: null }>;
  update: (values: unknown) => {
    eq: (column: string, value: unknown) => Promise<{ data: unknown; error: null }>;
  };
  delete: () => {
    eq: (column: string, value: unknown) => Promise<{ data: unknown; error: null }>;
  };
}

export interface SupabaseClient {
  url: string;
  key: string;
  from: (table: string) => SupabaseTableBuilder;
}

export function createClient(supabaseUrl: string, supabaseKey: string): SupabaseClient {
  return {
    url: supabaseUrl,
    key: supabaseKey,
    from: (_table: string): SupabaseTableBuilder => ({
      select: async () => ({ data: [], error: null }),
      insert: async (values) => ({ data: values, error: null }),
      update: (values) => ({
        eq: async () => ({ data: values, error: null }),
      }),
      delete: () => ({
        eq: async () => ({ data: null, error: null }),
      }),
    }),
  };
}

