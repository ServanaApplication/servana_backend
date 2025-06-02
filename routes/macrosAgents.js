const express = require("express");
const router = express.Router();
const supabase = require("../helpers/supabaseClient.js");

// GET all canned messages (macros) and departments
router.get("/", async (req, res) => {
  try {
    const { data: macros, error: macrosError } = await supabase
      .from("canned_message")
      .select(`
        canned_id,
        canned_message,
        canned_is_active,
        dept_id,
        department:department(dept_name)
      `)
      .order("canned_message", { ascending: true });

    if (macrosError) throw macrosError;

    const formattedMacros = macros.map((m) => ({
      id: m.canned_id,
      text: m.canned_message,
      active: m.canned_is_active,
      department: m.department ? m.department.dept_name : "All",
      dept_id: m.dept_id,
    }));

    const { data: departmentsData, error: deptError } = await supabase
      .from("department")
      .select("dept_name")
      .eq("dept_is_active", true)
      .order("dept_name", { ascending: true });

    if (deptError) throw deptError;

    const departments = departmentsData.map((d) => d.dept_name);

    res.json({ macros: formattedMacros, departments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal Server Error" });
  }
});

// POST new macro
router.post("/", async (req, res) => {
  const { text, department, active } = req.body;

  try {
    let dept_id = null;
    if (department && department !== "All") {
      const { data: deptData, error: deptErr } = await supabase
        .from("department")
        .select("dept_id")
        .eq("dept_name", department)
        .single();
      if (deptErr) throw deptErr;
      dept_id = deptData.dept_id;
    }

    const { data, error } = await supabase
      .from("canned_message")
      .insert([
        {
          canned_message: text,
          canned_is_active: active !== undefined ? active : true,
          dept_id,
        },
      ])
      .select(
        `
        canned_id,
        canned_message,
        canned_is_active,
        dept_id,
        department:department(dept_name)
        `
      )
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const formattedMacro = {
      id: data.canned_id,
      text: data.canned_message,
      active: data.canned_is_active,
      department: data.department ? data.department.dept_name : "All",
      dept_id: data.dept_id,
    };

    res.status(201).json(formattedMacro);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// PUT update existing macro
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { text, department, active } = req.body;

  try {
    let dept_id = null;
    if (department && department !== "All") {
      const { data: deptData, error: deptErr } = await supabase
        .from("department")
        .select("dept_id")
        .eq("dept_name", department)
        .single();
      if (deptErr) throw deptErr;
      dept_id = deptData.dept_id;
    }

    const { data, error } = await supabase
      .from("canned_message")
      .update({
        canned_message: text,
        canned_is_active: active,
        dept_id,
      })
      .eq("canned_id", id)
      .select(
        `
        canned_id,
        canned_message,
        canned_is_active,
        dept_id,
        department:department(dept_name)
        `
      )
      .single();

    if (error) return res.status(500).json({ error: error.message });

    const formattedMacro = {
      id: data.canned_id,
      text: data.canned_message,
      active: data.canned_is_active,
      department: data.department ? data.department.dept_name : "All",
      dept_id: data.dept_id,
    };

    res.json(formattedMacro);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
