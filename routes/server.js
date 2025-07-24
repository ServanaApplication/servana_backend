// server.js or routes/profile.js

const express = require("express");
const router = express.Router();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Middleware to handle /profile/login
router.post("/login", async (req, res) => {
  const { sys_user_email } = req.body;

  try {
    // Fetch user info from Supabase using email
    const { data, error } = await supabase
      .from("profiles") // or whatever table you store user metadata in
      .select("*")
      .eq("email", sys_user_email)
      .single();

    if (error || !data) {
      return res.status(404).json({ message: "User not found" });
    }

    // You can now perform role checks, sync metadata, etc.
    return res.status(200).json({ message: "Login successful", profile: data });
  } catch (err) {
    console.error("Backend login error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
