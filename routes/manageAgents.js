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
        sys_user_password,
        sys_user_is_active,
        sys_user_department (
          department (
            dept_name
          )
        )
      `)
      .order("sys_user_email", { ascending: true });

    if (error) throw error;

    const formattedAgents = data.map((agent) => ({
      id: agent.sys_user_id,
      username: agent.sys_user_email.split("@")[0], // Still shows first part
      password: agent.sys_user_password,
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

// ✅ Update agent info (username/password/active status/departments)
router.put("/agents/:id", async (req, res) => {
  const { id } = req.params;
  const { username, password, active, departments } = req.body;

  const client = supabase; // Supabase client

  try {
    // ✅ Update system_user basic info
    const { error: updateUserError } = await client
      .from("system_user")
      .update({
        sys_user_email: username,
        sys_user_password: password,
        sys_user_is_active: active,
        sys_user_updated_at: new Date(),
      })
      .eq("sys_user_id", id);

    if (updateUserError) throw updateUserError;

    // ✅ Clear old department mappings
    const { error: deleteError } = await client
      .from("sys_user_department")
      .delete()
      .eq("sys_user_id", id);

    if (deleteError) throw deleteError;

    // ✅ Insert new department mappings
    if (departments && departments.length > 0) {
      // Fetch dept_ids based on dept_name
      const { data: deptRows, error: deptError } = await client
        .from("department")
        .select("dept_id, dept_name")
        .in("dept_name", departments);

      if (deptError) throw deptError;

      const deptMappings = deptRows.map((dept) => ({
        sys_user_id: id,
        dept_id: dept.dept_id,
      }));

      const { error: insertError } = await client
        .from("sys_user_department")
        .insert(deptMappings);

      if (insertError) throw insertError;
    }

    res.status(200).json({ message: "Agent updated successfully" });
  } catch (err) {
    console.error("Error updating agent:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
