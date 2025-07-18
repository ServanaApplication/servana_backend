const express = require("express");
const supabase = require("../helpers/supabaseClient");
const router = express.Router();

// Normalize email
const normalizeEmail = (email) => (email || "").trim().toLowerCase();

// POST /auth/login
router.post("/login", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const { password } = req.body;

  // Login with Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return res.status(401).json({ error: error.message });

  const { session, user } = data;
  if (!session || !user) return res.status(500).json({ error: "Login failed" });

  // Set secure cookies
  res.cookie("access_token", session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 1000, // 1 hour
  });
  res.cookie("refresh_token", session.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  // Link with system_user
  const { data: sysUser, error: sysErr } = await supabase
    .from("system_user")
    // include email so Profile screen can show it
    .select("sys_user_id, role_id, prof_id, sys_user_is_active, sys_user_email")
    .eq("supabase_user_id", user.id)
    .maybeSingle();

  if (sysErr || !sysUser || !sysUser.sys_user_is_active) {
    return res.status(403).json({ error: "Account not linked or inactive" });
  }

  res.json({
    message: "Login successful",
    user: { sys_user_id: sysUser.sys_user_id, role_id: sysUser.role_id },
  });
});

// GET /auth/me
router.get("/me", async (req, res) => {
  const token = req.cookies.access_token;
  if (!token) return res.status(401).json({ authed: false });

  // Validate Supabase user via access token
  const { data: authData, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !authData?.user) {
    return res.status(401).json({ authed: false });
  }

  const supaId = authData.user.id;

  // Grab system_user row (linked account & role)
  const { data: sysUser, error: sysErr } = await supabase
    .from("system_user")
    .select("sys_user_id, role_id, prof_id, sys_user_is_active")
    .eq("supabase_user_id", supaId)
    .maybeSingle();

  // If no system_user row, you're still "authed" (Supabase session exists) but not linked.
  // Navigation only needs to know if you're logged in, so return authed:true + no user details.
  if (sysErr || !sysUser) {
    return res.json({ authed: true, user: null });
  }

  // Optional: block inactive accounts *without* breaking navigation.
  // We'll still send authed:true so ProtectedRoute works, but flag inactive in payload.
  if (!sysUser.sys_user_is_active) {
    return res.json({ authed: true, inactive: true, user: null });
  }

  // Fetch profile row
  const { data: prof, error: profErr } = await supabase
    .from("profile")
    .select(
      "prof_firstname, prof_middlename, prof_lastname, prof_address, prof_date_of_birth"
    )
    .eq("prof_id", sysUser.prof_id)
    .maybeSingle();

  // Profile is optional; don't fail navigation if missing
  if (profErr) {
    console.error("Profile load error:", profErr.message);
  }

  // Fetch *current* profile image (if any)
  const { data: imgRows, error: imgErr } = await supabase
    .from("image")
    .select("img_location")
    .eq("prof_id", sysUser.prof_id)
    .eq("img_is_current", true)
    .limit(1);

  if (imgErr) {
    console.error("Image load error:", imgErr.message);
  }

  const img =
    Array.isArray(imgRows) && imgRows.length > 0
      ? imgRows[0].img_location
      : null;

  // Map DB → frontend-friendly keys so you don’t have to rename everything in Profile.jsx
  const mappedUser = {
    sys_user_id: sysUser.sys_user_id,
    role_id: sysUser.role_id,
    email: sysUser.sys_user_email || '',
    firstName: prof?.prof_firstname || "",
    middleName: prof?.prof_middlename || "",
    lastName: prof?.prof_lastname || "",
    address: prof?.prof_address || "",
    dateOfBirth: prof?.prof_date_of_birth || "",
    profileImage: img || null,
  };

  return res.json({ authed: true, user: mappedUser });
});

// POST /auth/logout
router.post("/logout", (req, res) => {
  res.clearCookie("access_token");
  res.clearCookie("refresh_token");
  res.json({ message: "Logged out" });
});

module.exports = router;
