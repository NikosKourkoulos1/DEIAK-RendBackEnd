const jwt = require('jsonwebtoken');
const User = require('../models/User'); 
require('dotenv').config({ path: '../.env' });

const revokedRefreshTokens = new Set();

const authMiddleware = (req, res, next) => {
    const authHeader = req.header('Authorization');
    console.log("Authorization Header:", authHeader);

    const token = authHeader?.replace('Bearer ', '');
    console.log("Extracted Token:", token);

    if (!token) {
        console.log("No token provided");
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Decoded Token:", decoded);
        req.user = decoded;
        next();
    } catch (err) {
        console.error("Token verification error:", err);
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        } else {
            return res.status(401).json({ message: 'Token is not valid' });
        }
    }
};

const adminMiddleware = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin rights required.' });
    }
    next();
};

// Function to generate access token
const generateAccessToken = (user) => {
    return jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' } 
    );
};

const generateRefreshToken = (user) => {
    return jwt.sign(
        { id: user._id, role: user.role },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '7d' } 
    );
};


// Route to handle refresh token requests
const tokenRefresh = (req, res) => {
    const refreshToken = req.body.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({ message: 'Refresh token not provided' });
    }

    if (revokedRefreshTokens.has(refreshToken)) {
        return res.status(403).json({ message: 'Refresh token has been revoked' });
    }

    try {
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

        const accessToken = generateAccessToken({ _id: decoded.id, role: decoded.role });


        res.status(200).json({ accessToken });
    } catch (err) {
        console.error("Error refreshing token:", err);
        if (err.name === 'TokenExpiredError') {
            revokedRefreshTokens.add(refreshToken);
            return res.status(403).json({ message: 'Refresh token expired' });
        } else {
            return res.status(403).json({ message: 'Invalid refresh token' });
        }
    }
};

// User logout
const logoutUser = (req, res) => {
    const refreshToken = req.body.refreshToken;

    if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token not provided' });
    }

    revokedRefreshTokens.add(refreshToken);

    res.status(200).json({ message: 'Logged out successfully' });
};

module.exports = { 
    authMiddleware, 
    adminMiddleware, 
    generateAccessToken, 
    generateRefreshToken, 
    tokenRefresh, 
    logoutUser 
};