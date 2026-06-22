import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://nlcdrhjeyoqelovupnvj.supabase.co'
const supabaseKey = 'sb_publishable_M0SFzkz5U-GmsTc7_RGCQA_7X1DEuzL'

export const supabase = createClient(supabaseUrl, supabaseKey)
