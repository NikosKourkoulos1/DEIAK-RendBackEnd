const express = require('express');
const Node = require('../models/Node');
const Pipe = require('../models/Pipe');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const mongoose = require('mongoose');


const router = express.Router();

// Advanced Nodes Search and Filtering
router.get('/nodes/search', async (req, res) => {
  try {
      const {
          type,
          minLatitude,
          maxLatitude,
          minLongitude,
          maxLongitude,
          minCapacity,
          maxCapacity,
          status,
          name
      } = req.query;

      const query = {};

      if (type) {
          const typeList = type.split(','); 
          query.type = { $in: typeList }; 
      }

      // Location filtering
      if (minLatitude || maxLatitude) {
          query['location.latitude'] = {};
          if (minLatitude) query['location.latitude'].$gte = parseFloat(minLatitude);
          if (maxLatitude) query['location.latitude'].$lte = parseFloat(maxLatitude);
      }

      if (minLongitude || maxLongitude) {
          query['location.longitude'] = {};
          if (minLongitude) query['location.longitude'].$gte = parseFloat(minLongitude);
          if (maxLongitude) query['location.longitude'].$lte = parseFloat(maxLongitude);
      }

      // Capacity filtering
      if (minCapacity || maxCapacity) {
          query.capacity = {};
          if (minCapacity) query.capacity.$gte = parseFloat(minCapacity);
          if (maxCapacity) query.capacity.$lte = parseFloat(maxCapacity);
      }

      // Status filtering
      if (status) query.status = status;

      // Name partial match (case-insensitive)
      if (name) query.name = { $regex: name, $options: 'i' };

      const nodes = await Node.find(query);
      res.json(nodes);
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});

router.post('/node', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
      // Validate Corfu Island bounds
      const { location } = req.body;
      if (
          location.latitude < 38.5 || location.latitude > 39.8 ||
          location.longitude < 19.3 || location.longitude > 20.3
      ) {
          return res.status(400).json({ message: 'Node location must be within Corfu Island bounds' });
      }

      // Set default status if empty or missing
      if (!req.body.status || req.body.status.trim() === "") {
          req.body.status = "active"; 
      }

      const newNode = await Node.create(req.body); 

      res.status(201).json(newNode);
  } catch (err) {
      console.error('Node Creation Error:', err);

      if (err.name === 'ValidationError') {
          return res.status(400).json({
              message: 'Node validation failed',
              error: err.message
          });
      }

      res.status(500).json({
          message: 'Error creating node',
          error: err.message
      });
  }
});

// Update a node (admin only) - using _id
router.put('/node/:id', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
      const { id } = req.params;
      const updateData = req.body;

      if (updateData.location) {
          if (
              updateData.location.latitude < 38.5 || updateData.location.latitude > 39.8 ||
              updateData.location.longitude < 19.3 || updateData.location.longitude > 20.3
          ) {
              return res.status(400).json({ message: 'Node location must be within Corfu Island bounds' });
          }
      }

      const updatedNode = await Node.findByIdAndUpdate(
          id,
          updateData,
          { new: true, runValidators: true }
      );

      if (!updatedNode) {
          return res.status(404).json({ message: 'Node not found' });
      }

      res.json(updatedNode);
  } catch (err) {
      console.error("Error updating node:", err);
      res.status(500).json({ error: err.message });
  }
});

// Delete a node (admin only)
router.delete('/node/:id', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
      const { id } = req.params;

      const node = await Node.findById(id);
      if (!node) {
          return res.status(404).json({ message: 'Node not found' });
      }

      const connectedPipes = await Pipe.find({
          $or: [
              { startNode: id },
              { endNode: id }
          ]
      });

      if (connectedPipes.length > 0) {
          return res.status(400).json({ 
              message: 'Cannot delete node. It is connected to existing pipes.',
              connectedPipes: connectedPipes.map(pipe => pipe._id)
          });
      }

      await Node.findByIdAndDelete(id);
      res.json({ message: 'Node deleted successfully' });
  } catch (err) {
      console.error("Error deleting node:", err); 
      res.status(500).json({ error: err.message });
  }
});


router.get('/pipes', async (req, res) => {
  try {
      const pipes = await Pipe.find({}); 
      res.json(pipes);
  } catch (err) {
      res.status(500).json({ error: err.message });
  }
});

//Pipe Search and Filtering
router.get('/pipes/search', async (req, res) => {
try {
  const {
      status,
      minFlow,
      maxFlow,
      minLength,
      maxLength
  } = req.query;
  const query = {};

  // Status filter
  if (status) query.status = status;

  // Flow filter
  if (minFlow || maxFlow) {
      query.flow = {};
      if (minFlow) query.flow.$gte = parseFloat(minFlow);
      if (maxFlow) query.flow.$lte = parseFloat(maxFlow);
  }

  // Length filtering
  if (minLength || maxLength) {
      query.length = {};
      if (minLength) query.length.$gte = parseFloat(minLength);
      if (maxLength) query.length.$lte = parseFloat(maxLength);
  }

  const pipes = await Pipe.find(query)

  res.json(pipes);
} catch (err) {
  res.status(500).json({ error: err.message });
}
});

// Create Pipe (Admin Only)
router.post('/pipe', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
      const { coordinates, status, flow, length, diameter, material } = req.body;

      // --- VALIDATION ---
      if (!coordinates || coordinates.length < 2) {
          return res.status(400).json({ message: "At least two coordinates are required." });
      }
      if (flow !== 0 && flow !== 1) { 
          return res.status(400).json({ message: "Invalid flow direction. Must be 0 or 1." });
      }

      const newPipe = new Pipe({
          coordinates,
          status,
          flow, 
          length,
          diameter,
          material,
      });

      const savedPipe = await newPipe.save();
      res.status(201).json(savedPipe);

  } catch (error) {
      res.status(500).json({ message: error.message });
  }
});



// Update a pipe (admin only)
router.put('/pipe/:id', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
      const { id } = req.params;
      const { coordinates, status, flow, length, diameter, material } = req.body;
       // --- VALIDATION ---
      if (flow !== undefined && flow !== 0 && flow !== 1) { 
        return res.status(400).json({ message: "Invalid flow direction. Must be 0 or 1." });
      }
      if (coordinates && coordinates.length < 2) { 
          return res.status(400).json({ message: 'At least two coordinates are required.' });
      }

      const updateObject = { ...req.body }; 
      delete updateObject._id; 

      if(Object.keys(updateObject).length > 0){ 
         updateObject.updatedAt = Date.now();
      }


      const updatedPipe = await Pipe.findByIdAndUpdate(
          id,
          updateObject, 
          { new: true, runValidators: true }
      );

      if (!updatedPipe) {
          return res.status(404).json({ message: "Pipe not found" });
      }

      res.status(200).json(updatedPipe);
  } catch (error) {
      console.error("Error updating pipe:", error);
      if (error.name === 'ValidationError') {
          return res.status(400).json({message: error.message})
      }
      res.status(500).json({ error: error.message });
  }
});

// Delete a pipe (admin only) 
router.delete('/pipe/:id', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({ message: 'Invalid pipe ID format' });
      }

      const deletedPipe = await Pipe.findByIdAndDelete(id);

      if (!deletedPipe) {
          return res.status(404).json({ message: 'Pipe not found' });
      }

      res.json({ message: 'Pipe deleted successfully', deletedPipe });
  } catch (err) {
      console.error("Error deleting pipe:", err);
      res.status(500).json({ error: err.message });
  }
});

module.exports = router;