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

      // Build dynamic query
      const query = {};

      // Type filtering (updated to handle comma-separated types)
      if (type) {
          const typeList = type.split(','); // Split the query parameter into an array of types
          query.type = { $in: typeList }; // Use $in to match any of the types in the list
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
          req.body.status = "active"; // Or your preferred default status
      }

      const newNode = await Node.create(req.body); // Let MongoDB generate the _id

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

      // Validate Corfu Island bounds if location is provided
      if (updateData.location) {
          if (
              updateData.location.latitude < 38.5 || updateData.location.latitude > 39.8 ||
              updateData.location.longitude < 19.3 || updateData.location.longitude > 20.3
          ) {
              return res.status(400).json({ message: 'Node location must be within Corfu Island bounds' });
          }
      }

      // Use findByIdAndUpdate with the provided _id
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

      // Check if node exists
      const node = await Node.findById(id);
      if (!node) {
          return res.status(404).json({ message: 'Node not found' });
      }

      // Check if node is connected to any pipes
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
      console.error("Error deleting node:", err); // Log the error for debugging
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
      startNodeType, 
      endNodeType,
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

    // Pipes with start or end nodes of specific types
    const nodeTypeQuery = {};
    if (startNodeType) nodeTypeQuery.type = startNodeType;
    
    const pipes = await Pipe.find(query)
      .populate({
        path: 'startNode',
        match: startNodeType ? nodeTypeQuery : {}
      })
      .populate({
        path: 'endNode',
        match: endNodeType ? { type: endNodeType } : {}
      });

    // Filter out pipes where start or end node doesn't match type
    const filteredPipes = pipes.filter(pipe => 
      (startNodeType ? pipe.startNode : true) && 
      (endNodeType ? pipe.endNode : true)
    );

    res.json(filteredPipes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Pipe (Admin Only)
router.post('/pipe', [authMiddleware, adminMiddleware], async (req, res) => {
    try {
      const { startNode, endNode } = req.body;
  
     
      const start = await Node.findById(startNode);
      const end = await Node.findById(endNode);
  
      if (!start || !end) {
        return res.status(404).json({ message: 'One or both nodes do not exist' });
      }
  
      
      const newPipe = await Pipe.create(req.body);
      
      res.status(201).json(newPipe);
    } catch (err) {
      console.error('Pipe Creation Error:', err);
      res.status(500).json({ 
        message: 'Error creating pipe', 
        error: err.message 
      });
    }
  });

// Update a pipe (admin only)
router.put('/pipe/:id', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const { id } = req.params;
    const { startNode, endNode, status, flow, length, diameter, material } = req.body;

    // If new nodes are provided, validate they exist
    if (startNode) {
      const start = await Node.findById(startNode);
      if (!start) {
        return res.status(404).json({ message: 'Start node not found' });
      }
    }

    if (endNode) {
      const end = await Node.findById(endNode);
      if (!end) {
        return res.status(404).json({ message: 'End node not found' });
      }
    }

    const updateData = { 
      ...(startNode && { startNode }),
      ...(endNode && { endNode }),
      ...(status && { status }),
      ...(flow !== undefined && { flow }),
      ...(length !== undefined && { length }),
      ...(diameter !== undefined && { diameter }),
      ...(material && { material })
    };

    const updatedPipe = await Pipe.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    );

    if (!updatedPipe) {
      return res.status(404).json({ message: 'Pipe not found' });
    }

    res.json(updatedPipe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a pipe (admin only)
router.delete('/pipe/:id', [authMiddleware, adminMiddleware], async (req, res) => {
  try {
    const { id } = req.params;

    const deletedPipe = await Pipe.findByIdAndDelete(id);

    if (!deletedPipe) {
      return res.status(404).json({ message: 'Pipe not found' });
    }

    res.json({ message: 'Pipe deleted successfully', deletedPipe });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;