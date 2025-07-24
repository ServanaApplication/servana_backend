const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
const supabase = require('../helpers/supabaseClient.js');

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key"; // Use env var in production

// REGISTER ROUTE
router.post('/registercl', async (req, res) => {
    console.log('Register request body:', req.body);

    const { client_country_code, client_number, client_password, client_created_at } = req.body;

    // Basic validation
    if (!client_country_code || !client_number || !client_password || !client_created_at) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if client already exists
    const { data: existingClient, error: findError } = await supabase
        .from('client')
        .select('*')
        .eq('client_number', client_number)
        .single();

    if (existingClient) {
        return res.status(409).json({ error: 'Client already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(client_password, saltRounds);

    // Insert new client with hashed password
    const { data, error } = await supabase
        .from('client')
        .insert([
            {
                client_country_code,
                client_number,
                client_password: hashedPassword,
                client_created_at
            }
        ])
        .select();

    if (error) {
        console.log('Supabase error:', error);
        return res.status(500).json({ error: 'Failed to register client', details: JSON.stringify(error) });
    }

    // Create JWT
    const client = data[0];
    const token = jwt.sign(
        { client_id: client.id, client_number: client.client_number },
        JWT_SECRET,
        { expiresIn: '7d' }
    );

    return res.status(201).json({
        message: 'Client registered successfully',
        client: {
            id: client.id,
            client_number: client.client_number,
            client_country_code: client.client_country_code
        },
        token
    });
});

// LOGIN ROUTE
router.post('/logincl', async (req, res) => {
    const { client_country_code, client_number, client_password } = req.body;

    if (!client_country_code || !client_number || !client_password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Find client by number
    const { data: client, error } = await supabase
        .from('client')
        .select('*')
        .eq('client_country_code', client_country_code)
        .eq('client_number', client_number)
        .single();

    if (error || !client) {
        return res.status(401).json({ error: 'Invalid phone number or password' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(client_password, client.client_password);
    if (!isMatch) {
        return res.status(401).json({ error: 'Invalid phone number or password' });
    }

    // Generate JWT
    const token = jwt.sign(
        { client_id: client.id, client_number: client.client_number },
        JWT_SECRET,
        { expiresIn: '7d' }
    );

    return res.status(200).json({
        message: 'Login successful',
        client: {
            id: client.id,
            client_number: client.client_number,
            client_country_code: client.client_country_code
        },
        token
    });
});

router.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error', details: String(err) });
});

module.exports = router;