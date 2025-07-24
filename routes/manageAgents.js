const express = require("express");
const router = express.Router();
const supabase = require("../helpers/supabaseClient.js");

// ✅ Fetch all agents with their departments
router.get("/agents", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("system_user")
      .select(`
        sys_user_id,
        sys_user_email,
        sys_user_is_active,
        sys_user_department (
          department ( dept_name )
        )
      `)
      .order("sys_user_email", { ascending: true });

    if (error) throw error;

    const formattedAgents = data.map((agent) => ({
      id: agent.sys_user_id,
      email: agent.sys_user_email, // ✅ Full email now
      active: agent.sys_user_is_active,
      departments: agent.sys_user_department.map((d) => d.department.dept_name),
    }));

    res.status(200).json(formattedAgents);
  } catch (err) {
    console.error("Error fetching agents:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Fetch all departments
router.get("/departments", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("department")
      .select("dept_name")
      .eq("dept_is_active", true);

    if (error) throw error;

    res.status(200).json(data.map((d) => d.dept_name));
  } catch (err) {
    console.error("Error fetching departments:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// in /manage-agents/agents/:id
router.put("/agents/:id", async (req, res) => {
  const { id } = req.params; // your system_user row id
  const { email, active, departments, password } = req.body;

  try {
    // 1. Look up the system_user row to get auth_user_id (add this col if missing)
    const { data: sysUser, error: sysErr } = await supabase
      .from("system_user")
      .select("auth_user_id")
      .eq("sys_user_id", id)
      .single();
    if (sysErr) throw sysErr;
    const authUserId = sysUser.auth_user_id;

    // 2. Update system_user metadata (email copy, active, updated_at)
    const { error: updateUserError } = await supabase
      .from("system_user")
      .update({
        sys_user_email: email,
        sys_user_is_active: active,
        sys_user_updated_at: new Date(),
      })
      .eq("sys_user_id", id);
    if (updateUserError) throw updateUserError;

    // 3. Update departments (same as your current code)...

    // 4. (Optional) Update Auth user email/password via service-role client
    if (authUserId) {
      const adminClient = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY // must be service_role
      );

      const attrs = {};
      if (password && password.length > 0) attrs.password = password;
      if (email) attrs.email = email;

      if (Object.keys(attrs).length > 0) {
        const { data: updatedAuthUser, error: authErr } =
          await adminClient.auth.admin.updateUserById(authUserId, attrs);
        if (authErr) throw authErr;
      }
    }

    res.status(200).json({ message: "Agent updated successfully" });
  } catch (err) {
    console.error("Error updating agent:", err.message);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
