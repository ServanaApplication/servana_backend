require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.REACT_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.REACT_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase credentials in .env');
}
console.log("Using Supabase key starts with:", process.env.REACT_SERVICE_ROLE_KEY.slice(0, 8));

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
module.exports = supabase;
