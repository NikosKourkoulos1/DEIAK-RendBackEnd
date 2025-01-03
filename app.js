require('dotenv').config({ path: './.env' });
const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/auth');
const networkRoutes = require('./routes/network');
const userRoutes = require('./routes/user');
const cors = require('cors');

const app = express();


app.use(cors()); // Enable CORS 
app.use(express.json()); 


mongoose.set('strictQuery', false);
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected`);
    } catch (error) {
        console.log(error);
        process.exit(1);
    }
}
connectDB();

// Routes
app.get('/', (req, res) => {
    res.send('Back End Up and Running!');
});

app.use('/api/user', userRoutes);

app.use('/api/auth', authRoutes);

app.use('/api/network', networkRoutes);

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

module.exports = app;