# Deiak Water Network (Backend)

## Overview
This is the backend for my CS50 final project, **Deiak Water Network**. It’s a Node.js server with MongoDB that powers an Android app for managing water network infrastructure in Corfu, Greece. It handles user authentication, node/pipe CRUD operations, and data storage.

## Features
- **User Auth**: Register, login, and JWT-based access (admin/user roles).
- **Nodes**: Create, update, delete, and search nodes (e.g., valves, hydrants) with location bounds for Corfu.
- **Pipes**: Create, update, delete, and search pipes with coordinates and flow direction.
- **API**: RESTful endpoints for the Android frontend.

## Tech Used
- **Language**: JavaScript (Node.js)
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose)
- **Auth**: JWT, bcrypt
- **Tools**: CORS, dotenv

## Setup
1. **Clone It**
   ```bash
   git clone https://github.com/NikosKourkoulos1/DeiakWaterNetwork-Backend.git
   cd DeiakWaterNetwork-Backend
