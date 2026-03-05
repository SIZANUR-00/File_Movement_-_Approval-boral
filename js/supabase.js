import { createClient }
from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm"

const SUPABASE_URL = "https://tazmxtwpxqheuyjhvvax.supabase.co"
const SUPABASE_KEY = "sb_publishable_idNpdkn-oXgCrk_PgR6emw_JPnvaadz"

export const supabase =
  createClient(SUPABASE_URL, SUPABASE_KEY)