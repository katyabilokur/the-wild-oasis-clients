import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.SUPARBASE_URL,
  process.env.SUPARBASE_KEY
);
