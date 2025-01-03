const mongoose = require('mongoose');

const NodeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { 
    type: String, 
    required: true, 
    enum: ['source', 'junction', 'outlet', 'reservoir'] 
  }, 
  location: {
    latitude: { 
      type: Number, 
      required: true,
      min: [38.5, 'Latitude out of Corfu Island bounds'],
      max: [39.8, 'Latitude out of Corfu Island bounds']
    },
    longitude: { 
      type: Number, 
      required: true,
      min: [19.3, 'Longitude out of Corfu Island bounds'],
      max: [20.3, 'Longitude out of Corfu Island bounds']
    },
  },
  capacity: { 
    type: Number, 
    default: null 
  },
  status: { 
    type: String, 
    enum: ['active', 'maintenance', 'inactive'], 
    default: 'active' 
  },
  description: { 
    type: String, 
    default: '' 
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

// Pre-save middleware to update timestamp
NodeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Node', NodeSchema);