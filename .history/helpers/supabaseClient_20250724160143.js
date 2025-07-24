require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
// Initialize Supabase client with environment variables

const supabaseUrl = process.env.REACT_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_SUPABASE_ANON_KEY;  

const supabase = createClient(supabaseUrl, supabaseAnonKey);

module.exports = supabase;