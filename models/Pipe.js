const mongoose = require('mongoose');

const PipeSchema = new mongoose.Schema({
  startNode: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Node', 
    required: true 
  },
  endNode: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Node', 
    required: true 
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

// Pre-save middleware to update timestamp
PipeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Pipe', PipeSchema);