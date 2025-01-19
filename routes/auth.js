const express = require('express');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const User = require('../models/User');


const router = express.Router();

// Register a new user
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword, role });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully!' });
  } catch (err) {
    console.error('Registration Error:', err); 
    res.status(500).json({ 
        message: 'Error registering user', 
        error: err.message  
    });
 }
});

// Login user
router.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: 'User not found' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

      // Generate access token
      const accessToken = generateAccessToken(user);

      // Generate refresh token
      const refreshToken = generateRefreshToken(user);

      // Send the tokens in the response
      res.status(200).json({ accessToken, refreshToken, role: user.role });
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});

module.exports = router;
