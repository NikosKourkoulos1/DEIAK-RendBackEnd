const express = require('express');

const User = require('../models/User');


const router = express.Router();

// GET Method - Fetch all users
router.get('/users', async (req, res) => {
    try {
      const users = await User.find(); 
      res.status(200).json(users);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });

// Get User Details
router.get('/:id', async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.status(200).json(user);
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
});
  
//Update a user's details (excluding role)
router.put('/:id', async (req, res) => {
    try {
      const { name, email, password } = req.body;
  
      // Ensure role cannot be updated
      const updates = { name, email, password };
  
      // Find and update the user by ID
      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
        updates,
        { new: true, runValidators: true } 
      );
  
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      res.status(200).json({ message: 'User updated successfully', user: updatedUser });
    } catch (err) {
      if (err.code === 11000) {
        res.status(400).json({ message: 'Email already exists' });
      } else {
        res.status(500).json({ message: 'Server error', error: err.message });
      }
    }
});
  
  // Delete a user by ID
router.delete('/:id', async (req, res) => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.status(200).json({ message: 'User deleted successfully' });
    } catch (err) {
      res.status(500).json({ message: 'Server error', error: err.message });
    }
});
  
module.exports = router;
