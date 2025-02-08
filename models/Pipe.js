const mongoose = require('mongoose');

const PipeSchema = new mongoose.Schema({
  // startNode and endNode are removed
  coordinates: {
    type: [{
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    }],
    required: true,
    validate: { // Ensure at least two points
      validator: function(value) {
        return value.length >= 2;
      },
      message: 'At least two coordinates are required to define a pipe.'
    }
  },
  status: {
    type: String,
    enum: ['normal', 'high', 'blocked', 'maintenance'],
    default: 'normal'
  },
  flow: {
    type: Number,
    default: 0
  },
  length: {
    type: Number,
    default: null
  },
  diameter: {
    type: Number,
    default: null
  },
  material: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

PipeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Pipe', PipeSchema);