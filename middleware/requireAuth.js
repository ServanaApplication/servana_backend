const supabase = require('../helpers/supabaseClient');

async function requireAuth(req, res, next) {
  const token = req.cookies.access_token;
  const { data: authData, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !authData.user) return res.status(401).json({ error: 'Unauthorized' });

  const supaId = authData.user.id;
  const { data: sysUser } = await supabase
    .from('system_user')
    .select('sys_user_id, role_id')
    .eq('supabase_user_id', supaId)
    .maybeSingle();
  if (!sysUser) return res.status(403).json({ error: 'Forbidden' });

  req.user = sysUser;
  next();
}

module.exports = requireAuth;