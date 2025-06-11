const express = require('express');
const router = express.Router();
const supabase = require('../helpers/supabaseClient.js');

const ADMIN_ROLE_ID = 1;

// Get all admins
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('system_user')
      .select('sys_user_id, sys_user_email, sys_user_password, sys_user_is_active')
      .eq('role_id', ADMIN_ROLE_ID)
      .order('sys_user_email', { ascending: true });

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    console.error('Error fetching admins:', err.message);
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
});

// Add a new admin
router.post('/', async (req, res) => {
  const { sys_user_email, sys_user_password, sys_user_is_active, sys_user_created_by } = req.body;

  if (!sys_user_email || !sys_user_password || !sys_user_created_by) {
    return res.status(400).json({ error: 'sys_user_email, sys_user_password, and sys_user_created_by are required' });
  }

  try {
    const { data, error } = await supabase
      .from('system_user')
      .insert([{
        sys_user_email,
        sys_user_password, // plaintext, no hashing
        sys_user_is_active: sys_user_is_active !== undefined ? sys_user_is_active : true,
        role_id: ADMIN_ROLE_ID,
        sys_user_created_by,
        sys_user_updated_by: sys_user_created_by,
      }])
      .select('sys_user_id, sys_user_email, sys_user_password, sys_user_is_active')
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    console.error('Error adding admin:', err.message);
    res.status(500).json({ error: 'Failed to add admin' });
  }
});

// Update an existing admin
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { sys_user_email, sys_user_password, sys_user_is_active, sys_user_updated_by } = req.body;

  if (!sys_user_updated_by) {
    return res.status(400).json({ error: 'sys_user_updated_by is required' });
  }

  try {
    const updateData = {
      sys_user_updated_by,
      sys_user_updated_at: new Date(),
      role_id: ADMIN_ROLE_ID, // Keep role as admin
    };

    if (sys_user_email !== undefined) updateData.sys_user_email = sys_user_email;
    if (sys_user_password !== undefined) updateData.sys_user_password = sys_user_password;
    if (sys_user_is_active !== undefined) updateData.sys_user_is_active = sys_user_is_active;

    const { data, error } = await supabase
      .from('system_user')
      .update(updateData)
      .eq('sys_user_id', id)
      .select('sys_user_id, sys_user_email, sys_user_password, sys_user_is_active')
      .single();

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    console.error('Error updating admin:', err.message);
    res.status(500).json({ error: 'Failed to update admin' });
  }
});

// Toggle active status
router.put('/:id/toggle', async (req, res) => {
  const { id } = req.params;
  const { sys_user_is_active, sys_user_updated_by } = req.body;

  if (typeof sys_user_is_active !== 'boolean' || !sys_user_updated_by) {
    return res.status(400).json({ error: 'sys_user_is_active (boolean) and sys_user_updated_by are required' });
  }

  try {
    const { data, error } = await supabase
      .from('system_user')
      .update({
        sys_user_is_active,
        sys_user_updated_at: new Date(),
        sys_user_updated_by,
        role_id: ADMIN_ROLE_ID,
      })
      .eq('sys_user_id', id)
      .select('sys_user_id, sys_user_email, sys_user_password, sys_user_is_active')
      .single();

    if (error) throw error;

    res.status(200).json(data);
  } catch (err) {
    console.error('Error toggling admin active status:', err.message);
    res.status(500).json({ error: 'Failed to toggle admin status' });
  }
});

module.exports = router;
