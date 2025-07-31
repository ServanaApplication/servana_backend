const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const supabase = require('../../helpers/supabaseClient.js');
const getCurrentMobileUser = require("../../middleware/getCurrentMobileUser.js"); // attaches req.userId

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || "your_jwt_secret_key"; // Use env var in production

// REGISTER ROUTE
router.post('/registercl', async (req, res) => {
    console.log('Register request body:', req.body);

    const { client_country_code, client_number, client_password, client_created_at } = req.body;

    if (!client_country_code || !client_number || !client_password || !client_created_at) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const { data: existingClient, error: findError } = await supabase
        .from('client')
        .select('*')
        .eq('client_number', client_number)
        .single();

    if (existingClient) {
        return res.status(409).json({ error: 'Client already exists' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(client_password, saltRounds);

    const { data, error } = await supabase
        .from('client')
        .insert([
            {
                client_country_code,
                client_number,
                client_password: hashedPassword,
                client_created_at
            }
        ])
        .select();

    if (error) {
        console.log('Supabase error:', error);
        return res.status(500).json({ error: 'Failed to register client', details: JSON.stringify(error) });
    }

    const client = data[0];
    const token = jwt.sign(
        { client_id: client.id, client_number: client.client_number },
        JWT_SECRET,
        { expiresIn: '7d' }
    );

    return res.status(201).json({
        message: 'Client registered successfully',
        client: {
            id: client.id,
            client_number: client.client_number,
            client_country_code: client.client_country_code
        },
        token
    });
});

// LOGIN ROUTE
router.post('/logincl', async (req, res) => {
  const { client_country_code, client_number, client_password } = req.body;

  if (!client_country_code || !client_number || !client_password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Check if client exists
  const { data: client, error } = await supabase
    .from('client')
    .select('*')
    .eq('client_country_code', client_country_code)
    .eq('client_number', client_number)
    .single();

  if (error || !client) {
    return res.status(401).json({ error: 'Invalid phone number or password' });
  }

  // Check password
  const isMatch = await bcrypt.compare(client_password, client.client_password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid phone number or password' });
  }

  // Generate JWT
  const token = jwt.sign(
    { client_id: client.client_id, client_number: client.client_number },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Check if chat group exists for this client
  let chatGroupId = null;
  const { data: existingGroup, error: groupError } = await supabase
    .from("chat_group")
    .select("chat_group_id")
    .eq("client_id", client.client_id)
    .order("chat_group_id", { ascending: false })
    .limit(1)
    .single();

  if (existingGroup) {
    chatGroupId = existingGroup.chat_group_id;
  } else {
    // Create a new chat group with dept_id as NULL
    const { data: newGroup, error: createError } = await supabase
      .from("chat_group")
      .insert([
        {
          client_id: client.client_id,
          dept_id: null, // <-- department will be assigned later
        },
      ])
      .select("chat_group_id")
      .single();

    if (createError) {
      console.error("Error creating chat group:", createError.message);
      return res.status(500).json({ error: "Failed to create chat group" });
    }

    chatGroupId = newGroup.chat_group_id;
  }

  // Return response
  return res.status(200).json({
    message: 'Login successful',
    client: {
      id: client.client_id,
      client_number: client.client_number,
      client_country_code: client.client_country_code,
    },
    token,
    chat_group_id: chatGroupId,
  });
});

// PATCH: Assign department to an existing chat group
// PATCH: Assign department to an existing chat group and create initial message
router.patch('/chat_group/:id/set-department', async (req, res) => {
  const id = Number(req.params.id);
  const { dept_id } = req.body;

  console.log("📥 PATCH /chat_group/:id/set-department");
  console.log("chat_group_id:", id, "dept_id:", dept_id, "type:", typeof id);

  if (!dept_id) {
    return res.status(400).json({ error: 'Department ID is required' });
  }

  // 1. Update chat_group table
  const { data: updatedGroup, error: updateError } = await supabase
    .from('chat_group')
    .update({ dept_id })
    .eq('chat_group_id', id)
    .select();

  if (updateError) {
    console.error('❌ Supabase error:', updateError.message);
    return res.status(500).json({ error: 'Failed to assign department' });
  }

  if (!updatedGroup || updatedGroup.length === 0) {
    return res.status(404).json({ error: 'Chat group not found' });
  }

  // 2. Get the department name
  const { data: dept, error: deptError } = await supabase
    .from('department')
    .select('dept_name')
    .eq('dept_id', dept_id)
    .single();

  if (deptError || !dept) {
    console.error("❌ Failed to fetch department name:", deptError?.message);
    return res.status(500).json({ error: "Failed to fetch department name" });
  }

  // 3. Insert department name as the first system message
  const { error: insertError } = await supabase
    .from('chat')
    .insert([
      {
        chat_group_id: id,
        chat_body: dept.dept_name,
        sender: 'system', // Ensure your DB supports this column, or remove if not needed
        chat_created_at: new Date().toISOString()
      }
    ]);

  if (insertError) {
    console.error("❌ Failed to insert initial message:", insertError.message);
    return res.status(500).json({ error: "Failed to insert initial message" });
  }

  console.log("✅ Department assigned and initial message inserted");
  return res.status(200).json({
    message: 'Department assigned successfully and message created',
    updated: updatedGroup[0],
  });
});





// Global error handler
router.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error', details: String(err) });
});

// All routes below this require authentication
router.use(getCurrentMobileUser);

// You can add protected routes below here

module.exports = router;
