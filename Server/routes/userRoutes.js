/**
 * ConnectHub - User Routes
 * 
 * Endpoints:
 *   POST   /api/users/register     - Register new user
 *   GET    /api/users/online/list   - Get online users
 *   GET    /api/users/all/list      - Get all users
 *   GET    /api/users/:phone        - Get user by phone
 *   PUT    /api/users/:phone        - Update user profile
 */

const express = require('express');
const router = express.Router();
const {
    registerUser,
    loginUser,
    getUser,
    updateUser,
    getOnlineUsers,
    getAllUsers
} = require('../controllers/userController');
const {
    validateUserRegistration,
    validateUserLogin,
    validatePhoneParam
} = require('../middleware/validator');

router.post('/register', validateUserRegistration, registerUser);
router.post('/login', validateUserLogin, loginUser);
router.get('/online/list', getOnlineUsers);
router.get('/all/list', getAllUsers);
router.get('/:phone', validatePhoneParam, getUser);
router.put('/:phone', validatePhoneParam, updateUser);

module.exports = router;
