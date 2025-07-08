// routes/chat.js
const express = require("express");
const router = express.Router();
const supabase = require('../helpers/supabaseClient');

// routes/chat.js
router.get("/:clientId", async (req, res) => {
  const { clientId } = req.params;

  // Step 1: Get chat group(s) for this client
  const { data: groupLinks, error: groupLinkError } = await supabase
    .from("client_chat_group")
    .select("chat_group_id")
    .eq("client_id", clientId);

  if (groupLinkError || !groupLinks.length) {
    return res.status(404).json({ error: "Chat group not found for client." });
  }

  const chatGroupId = groupLinks[0].chat_group_id; // assuming one active group

  // Step 2: Fetch all messages from that chat group
  const { data: messages, error: chatError } = await supabase
    .from("chat")
    .select("*")
    .eq("chat_group_id", chatGroupId)
    .order("chat_created_at", { ascending: true });

  if (chatError) {
    return res.status(500).json({ error: chatError.message });
  }

  res.json(messages);
});



// ✅ NEW: GET /api/chatgroups
router.get("/chatgroups", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("chat_group")
      .select(`
        chat_group_id,
        chat_group_name,
        sys_user_id,
        dept_id,
        department:department (
          dept_name
        )
      `);

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Error fetching chat groups:", err.message);
    res.status(500).json({ error: "Failed to fetch chat groups" });
  }
});


module.exports = router;
