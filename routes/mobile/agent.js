const express = require("express");
const router = express.Router();
const supabase = require("../../helpers/supabaseClient.js");

router.get("/:chatGroupId", async (req, res) => {
  const { chatGroupId } = req.params;
  console.log("🔍 chatGroupId received:", chatGroupId);
    console.log("📥 Received GET /agent/:chatGroupId", chatGroupId);
  const { data, error } = await supabase
    .from("chat")
    .select(
      `
      sys_user_id,
      system_user:sys_user_id (
        prof_id,
        profile:prof_id (
          prof_firstname,
          prof_lastname
        )
      )
    `
    )
    .eq("chat_group_id", chatGroupId)
    .not("sys_user_id", "is", null)
    .order("chat_created_at", { ascending: false })
    .limit(1);

  console.log("🔍 Supabase result:", JSON.stringify(data, null, 2));

  if (error) {
    console.error("❌ Supabase error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }

  if (
    !data ||
    data.length === 0 ||
    !data[0].system_user ||
    !data[0].system_user.profile
  ) {
    console.error("❌ No agent found for chatGroupId:", chatGroupId);
    return res.status(404).json({ error: "Agent not found" });
  }

  const profile = data[0].system_user.profile;

  const agent = {
    name: `${profile.prof_firstname} ${profile.prof_lastname}`,
    image: null, // you can expand this later
  };

  res.json(agent);
});

module.exports = router;
