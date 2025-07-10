// routes/chat.js
const express = require("express");
const router = express.Router();
const supabase = require('../helpers/supabaseClient');

// ✅ GET /chat/chatgroups
router.get("/chatgroups", async (req, res) => {
  try {
    const { data: groups, error } = await supabase
      .from("chat_group")
      .select(`
        chat_group_id,
        chat_group_name,
        dept_id,
        department (
          dept_name
        ),
        client_chat_group (
          client_id,
          client (
            client_id,
            client_number,
            profile (
              prof_firstname,
              prof_lastname,
              image: image (
                img_location
              )
            )
          )
        )
      `);

    if (error) throw error;

    const formatted = groups.map((group) => {
      const clientEntry = group.client_chat_group?.[0];
      const client = clientEntry?.client;

      const fullName = client?.profile
        ? `${client.profile.prof_firstname} ${client.profile.prof_lastname}`
        : "Unknown Client";

      return {
        chat_group_id: group.chat_group_id,
        chat_group_name: group.chat_group_name,
        department: group.department?.dept_name || "Unknown",
        customer: client
          ? {
              id: client.client_id,
              chat_group_id: group.chat_group_id,
              name: fullName,
              number: client.client_number,
              profile: client.profile?.image?.[0]?.img_location || "/default.jpg", // fallback
              time: "9:00 AM" // you can replace with actual timestamp if available
            }
          : null,
      };
    });

    res.json(formatted.filter((g) => g.customer !== null)); // filter out empty clients
  } catch (err) {
    console.error("Error fetching chat groups:", err.message);
    res.status(500).json({ error: "Failed to fetch chat groups" });
  }
});


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




async function handleSendMessage(message, io) {
  try {
    io.emit('updateChatGroups'); // Broadcast to all clients

    const { data, error } = await supabase
      .from('chat')
      .insert([message])
      .select('*');

    if (error) {
      console.error("Supabase insert error:", error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.warn("Insert returned no data.");
      return;
    }

    io.to(String(message.chat_group_id)).emit('receiveMessage', data[0]);
  } catch (err) {
    console.error("handleSendMessage error:", err.message);
  }
}



module.exports = {
  router,
  handleSendMessage
};
