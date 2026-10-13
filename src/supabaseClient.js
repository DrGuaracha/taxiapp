import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mydmissrkctfoxuyxrdp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15ZG1pc3Nya2N0Zm94dXl4cmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE5Mjk4NzYsImV4cCI6MjEwNzUwNTg3Nn0.i9LPcz5FAKu_jPvCUdnzuyURka8VQaBfFte2CZnbSc0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)