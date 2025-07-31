// routes/chat.js
const express = require("express");
const router = express.Router();
const supabase = require("../helpers/supabaseClient");
const cookie = require("cookie");
const getCurrentUser = require("../middleware/getCurrentUser"); // attaches req.userId

router.use(getCurrentUser);

router.get("/chatgroups", async (req, res) => {
  try {
    const { data: groups, error } = await supabase
      .from("chat_group")
      .select(
        `
    chat_group_id,
    dept_id,
    sys_user_id,
    department:department(dept_name),
    client:client!chat_group_client_id_fkey(
      client_id,
      client_number,
      prof_id,
      profile:profile(
        prof_firstname,
        prof_lastname
      )
    )
  `
      )
      .is("sys_user_id", null) // Only get chat_groups with no agent assigned


    if (error) throw error;

    if (!groups || groups.length === 0) {
      return res.json([]);
    }

    const profIds = groups
      .map((g) => g.client?.prof_id)
      .filter((id) => id !== undefined && id !== null);

    let imageMap = {};
    if (profIds.length) {
      const { data: images, error: imgErr } = await supabase
        .from("image")
        .select("prof_id, img_location")
        .in("prof_id", profIds)
        .eq("img_is_current", true);
      if (imgErr) throw imgErr;

      const foundIds = (images || []).map((i) => i.prof_id);
      const missingIds = profIds.filter((id) => !foundIds.includes(id));

      if (missingIds.length > 0) {
        const { data: latest, error: latestErr } = await supabase
          .from("image")
          .select("prof_id, img_location")
          .in("prof_id", missingIds)
          .order("img_created_at", { ascending: false });
        if (!latestErr && latest) {
          (latest || []).forEach((i) => (imageMap[i.prof_id] = i.img_location));
        }
      }

      (images || []).forEach((i) => (imageMap[i.prof_id] = i.img_location));
    }

    const formatted = groups.map((group) => {
      const client = group.client;
      if (!client) return null;

      const fullName = client.profile
        ? `${client.profile.prof_firstname} ${client.profile.prof_lastname}`
        : "Unknown Client";

      return {
        chat_group_id: group.chat_group_id,
        chat_group_name: fullName,
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


    res.json(formatted.filter(Boolean));
  } catch (err) {
    console.error("❌ Error fetching chat groups:", err);
    res.status(500).json({ error: "Failed to fetch chat groups" });
  }
});

router.get("/:clientId", async (req, res) => {
  const { clientId } = req.params;
  const { before, limit = 10 } = req.query;

  // Find all groups that belong to this client (usually 1, but safe for >1)
  const { data: groups, error: groupsErr } = await supabase
    .from("chat_group")
    .select("chat_group_id")
    .eq("client_id", clientId);

  if (groupsErr) {
    return res.status(500).json({ error: groupsErr.message });
  }
  if (!groups || groups.length === 0) {
    return res.status(404).json({ error: "Chat group not found" });
  }

  const groupIds = groups.map((g) => g.chat_group_id);

  // Fetch both sides of the conversation:
  // - client messages (client_id = clientId)
  // - agent messages (client_id is NULL but in this client's chat_group_id(s))
  let query = supabase
    .from("chat")
    .select("*")
    .or(
      [
        `client_id.eq.${clientId}`,
        `chat_group_id.in.(${groupIds.join(",")})`,
      ].join(",")
    )
    .order("chat_created_at", { ascending: false })
    .limit(parseInt(limit, 10));

  if (before) {
    query = query.lt("chat_created_at", before);
  }

  const { data: rows, error: chatErr } = await query;
  if (chatErr) {
    return res.status(500).json({ error: chatErr.message });
  }

  // De-dup (in case a row matches both branches) and send oldest→newest
  const seen = new Set();
  const messages = (rows || [])
    .filter((r) => {
      if (seen.has(r.chat_id)) return false;
      seen.add(r.chat_id);
      return true;
    })
    .reverse();

  res.json({ messages });
});

module.exports = router;
