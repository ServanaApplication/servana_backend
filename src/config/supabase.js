// supabase

const { createClient } = require('@supabase/supabase-js');
// Initialize Supabase client with environment variables

const supabase = createClient(
  process.env.REACT_SUPABASE_URL,
  process.env.REACT_SUPABASE_ANON_KEY
);

module.exports = supabase; 