const express = require("express");
const router = express.Router();
const supabase = require("../helpers/supabaseClient");

// GET all client macros (role_id = 2)
router.get("/", async (req, res) => {
  try {
    const { data: macros, error: macrosError } = await supabase
      .from("canned_message")
      .select(`
        canned_id,
        canned_message,
        canned_is_active,
        dept_id,
        department:department(dept_name, dept_is_active)
      `)
      .eq("role_id", 2)
      .order("canned_message", { ascending: true });

    if (macrosError) throw macrosError;

    const { data: departments, error: deptError } = await supabase
      .from("department")
      .select("dept_id, dept_name, dept_is_active")
      .order("dept_name", { ascending: true });

    if (deptError) throw deptError;

    res.json({
      macros: macros.map(macro => ({
        canned_id: macro.canned_id,
        canned_message: macro.canned_message,
        canned_is_active: macro.canned_is_active,
        dept_id: macro.dept_id,
        department: macro.department
      })),
      departments
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// POST create new client macro
router.post("/", async (req, res) => {
  const { text, dept_id, active = true, created_by } = req.body;

  try {
    const { data, error } = await supabase
      .from("canned_message")
      .insert([{
        canned_message: text,
        canned_is_active: active,
        dept_id: dept_id || null,
        role_id: 2,
        canned_created_by: created_by
      }])
      .select(`
        canned_id,
        canned_message,
        canned_is_active,
        dept_id,
        department:department(dept_name, dept_is_active)
      `)
      .single();

    if (error) throw error;

    res.status(201).json({
      id: data.canned_id,
      text: data.canned_message,
      active: data.canned_is_active,
      dept_id: data.dept_id,
      department: data.department?.dept_name || "All"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// PUT update existing client macro
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { text, active, dept_id, updated_by } = req.body;

  try {
    const { data, error } = await supabase
      .from("canned_message")
      .update({
        canned_message: text,
        canned_is_active: active,
        dept_id: dept_id || null,
        canned_updated_by: updated_by,
        canned_updated_at: new Date().toISOString()
      })
      .eq("canned_id", id)
      .select(`
        canned_id,
        canned_message,
        canned_is_active,
        dept_id,
        department:department(dept_name, dept_is_active)
      `)
      .single();

    if (error) throw error;

    res.json({
      id: data.canned_id,
      text: data.canned_message,
      active: data.canned_is_active,
      dept_id: data.dept_id,
      department: data.department?.dept_name || "All"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
