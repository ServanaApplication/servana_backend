const express = require('express');
const router = express.Router();
const supabase = require('../helpers/supabaseClient.js');


router.post('/login', async (req, res) =>{

    const { sys_user_email, sys_user_password } = req.body;

    const {data: user, error} = await supabase
         .from('system_user')
         .select('*')
         .eq('sys_user_email', sys_user_email)
         .single();

         console.log("Supabase error:", error);

         if (error || !user) {
            console.log("User not found or Supabase error:");
            return res.status(401).json({ error: 'Invalid username or password' });
         }

         if (user.sys_user_password !== sys_user_password) {
            console.log("Password mismatch:" , user.sys_user_password, sys_user_password);
            // Password does not match
            return res.status(401).json({ error: 'Invalid username or password' });
         }
           console.log("User authenticated successfully:", user);
         // User authenticated successfully
            return res.status(200).json({ message: 'Login successful' });
         

})

module.exports = router;