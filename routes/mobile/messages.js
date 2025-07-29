// backend/routes/messages.js
const express = require('express');
const router = express.Router();
const supabase = require('../../helpers/supabaseClient');
const getCurrentMobileUser = require("../../middleware/getCurrentMobileUser.js") //this routes require an authenticated user; attaches req.userId

router.use(getCurrentMobileUser);

router.post("/", async (req, res) => {
  const { chat_body, chat_group_id } = req.body;
  const client_id = req.userId; // from getCurrentUser middleware

  if (!chat_body || !chat_group_id || !client_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const { data, error } = await supabase
      .from("chat")
      .insert([
        {
          chat_body,
          client_id,
          chat_group_id,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (err) {
    console.error("Failed to insert chat:", err.message);
    res.status(500).json({ error: "Failed to insert chat" });
  }
});

router.get("/group/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from("chat")
      .select("*")
      .eq("chat_group_id", id)
      .order("chat_created_at", { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

module.exports = router;
