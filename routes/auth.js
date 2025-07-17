const express = require('express');
const supabase = require('../helpers/supabaseClient');
const router = express.Router();

// Normalize email
const normalizeEmail = (email) => (email || '').trim().toLowerCase();

// POST /auth/login
router.post('/login', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;

  // Login with Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: error.message });

  const { session, user } = data;
  if (!session || !user) return res.status(500).json({ error: 'Login failed' });

  // Set secure cookies
  res.cookie('access_token', session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000, // 1 hour
  });
  res.cookie('refresh_token', session.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  // Link with system_user
  const { data: sysUser, error: sysErr } = await supabase
    .from('system_user')
    .select('sys_user_id, role_id, sys_user_is_active')
    .eq('supabase_user_id', user.id)
    .maybeSingle();

  if (sysErr || !sysUser || !sysUser.sys_user_is_active) {
    return res.status(403).json({ error: 'Account not linked or inactive' });
  }

  res.json({
    message: 'Login successful',
    user: { sys_user_id: sysUser.sys_user_id, role_id: sysUser.role_id },
  });
});

// GET /auth/me
router.get('/me', async (req, res) => {
  const token = req.cookies.access_token;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  const { data: authData, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !authData.user) return res.status(401).json({ error: 'Invalid token' });

  const supaId = authData.user.id;
  const { data: sysUser } = await supabase
    .from('system_user')
    .select('sys_user_id, role_id')
    .eq('supabase_user_id', supaId)
    .maybeSingle();

  if (!sysUser) return res.status(403).json({ error: 'Forbidden' });

  res.json({ user: sysUser });
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  res.json({ message: 'Logged out' });
});

module.exports = router;
