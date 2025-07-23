// routes/chat.js
const express = require("express");
const router = express.Router();
const supabase = require("../helpers/supabaseClient");


router.get("/chatgroups", async (req, res) => {
  try {
    // Step 1: Fetch chat groups
    const { data: groups, error } = await supabase.from("chat_group").select(`
      chat_group_id,
      chat_group_name,
      dept_id,
      department ( dept_name ),
      client_chat_group (
        client_id,
        client (
          client_id,
          client_number,
          prof_id,
          profile ( prof_firstname, prof_lastname )
        )
      )
    `);

    if (error) throw error;



    // Step 2: Collect all prof_ids
    const profIds = groups
      .map((group) => group.client_chat_group?.[0]?.client?.prof_id)
      .filter((id) => id !== undefined && id !== null);


    if (profIds.length === 0) return res.json([]);

    // Step 3: Fetch all current images
    const { data: images, error: imgErr } = await supabase
      .from("image")
      .select("prof_id, img_location")
      .in("prof_id", profIds)
      .eq("img_is_current", true);

    if (imgErr) throw imgErr;


    // Step 4: Identify prof_ids with no current images
    const foundIds = images.map((i) => i.prof_id);
    const missingIds = profIds.filter((id) => !foundIds.includes(id));


    // Step 5: Fetch latest image for missing prof_ids
    let latestImages = [];
    if (missingIds.length > 0) {
      const { data: latest, error: latestErr } = await supabase
        .from("image")
        .select("prof_id, img_location")
        .in("prof_id", missingIds)
        .order("img_created_at", { ascending: false })
        .limit(missingIds.length); // one per prof_id
      if (!latestErr && latest) latestImages = latest;
    }



    // Merge current + fallback images
    const allImages = [...images, ...latestImages];
    const imageMap = {};
    allImages.forEach((img) => {
      imageMap[img.prof_id] = img.img_location;
    });



    // Step 6: Format response
    const formatted = groups.map((group) => {
      const clientEntry = group.client_chat_group?.[0];
      const client = clientEntry?.client;
      if (!client) return null;

      const fullName = client?.profile
        ? `${client.profile.prof_firstname} ${client.profile.prof_lastname}`
        : "Unknown Client";

      return {
        chat_group_id: group.chat_group_id,
        chat_group_name: group.chat_group_name,
        department: group.department?.dept_name || "Unknown",
        customer: {
          id: client.client_id,
          chat_group_id: group.chat_group_id,
          name: fullName,
          number: client.client_number,
          profile: imageMap[client.prof_id] || null,
          time: "9:00 AM",
        },
      };
    });


    res.json(formatted.filter((g) => g !== null));
  } catch (err) {
    console.error("❌ Error fetching chat groups:", err);
    res.status(500).json({ error: "Failed to fetch chat groups" });
  }
});




router.get("/:clientId", async (req, res) => {
  const { clientId } = req.params;
  const { before, limit = 10 } = req.query;

  const { data: groupLinks, error: groupLinkError } = await supabase
    .from("client_chat_group")
    .select("chat_group_id")
    .eq("client_id", clientId);

  if (groupLinkError || !groupLinks.length) {
    return res.status(404).json({ error: "Chat group not found" });
  }

  const chatGroupId = groupLinks[0].chat_group_id;

  let query = supabase
    .from("chat")
    .select("*")
    .eq("chat_group_id", chatGroupId)
    .order("chat_created_at", { ascending: false }) // newest first
    .limit(parseInt(limit)); // fetch 10 by default

  if (before) {
    query = query.lt("chat_created_at", before); // paginate
  }

  const { data: messages, error: chatError } = await query;

  if (chatError) {
    return res.status(500).json({ error: chatError.message });
  }

  res.json({
    messages: messages.reverse(), // chronological order
    chatGroupId,
  });
});

async function handleSendMessage(message, io) {
  try {
    io.emit("updateChatGroups"); // Broadcast to all clients

    const { data, error } = await supabase
      .from("chat")
      .insert([message])
      .select("*");

    if (error) {
      console.error("Supabase insert error:", error.message);
      return;
    }

    if (!data || data.length === 0) {
      console.warn("Insert returned no data.");
      return;
    }

    io.to(String(message.chat_group_id)).emit("receiveMessage", data[0]);
  } catch (err) {
    console.error("handleSendMessage error:", err.message);
  }
}

module.exports = {
  router,
  handleSendMessage,
};
