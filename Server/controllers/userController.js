/**
 * ConnectHub - User Controller
 * 
 * Business logic for user management:
 * - Register new user (phone must be unique)
 * - Get user profile by phone
 * - Update user profile (name, avatar, status, aboutMe)
 * - Get all online users
 */

const User = require('../models/User');
const bcrypt = require('bcryptjs');

/**
 * Register a new user.
 * If user with same phone already exists, return existing user.
 * POST /api/users/register
 */
const registerUser = async (req, res) => {
    try {
        const { displayName, phone, password } = req.body;
        const cleanPhone = phone.replace(/\s+/g, '');

        /* Check if user already exists */
        let user = await User.findOne({ phone: cleanPhone });

        if (user) {
            /* Legacy user migration */
            if (!user.password) {
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(password, salt);
                user.displayName = displayName.trim();
                user.isOnline = true;
                user.lastSeen = new Date();
                await user.save();

                const userObj = user.toObject();
                delete userObj.password;

                return res.status(200).json({
                    success: true,
                    message: 'Account successfully upgraded with password',
                    user: userObj
                });
            }

            return res.status(409).json({
                success: false,
                errors: ['An account with this phone number already exists. Please log in.']
            });
        }

        /* Hash password */
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        /* Create new user */
        user = await User.create({
            displayName: displayName.trim(),
            phone: cleanPhone,
            password: hashedPassword,
            isOnline: true,
            lastSeen: new Date()
        });

        // Don't send password back in response
        const userObj = user.toObject();
        delete userObj.password;

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: userObj
        });
    } catch (error) {
        console.error('[UserController] registerUser error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error during registration',
            error: error.message
        });
    }
};

/**
 * Login user.
 * POST /api/users/login
 */
const loginUser = async (req, res) => {
    try {
        const { phone, password } = req.body;
        const cleanPhone = phone.replace(/\s+/g, '');

        const user = await User.findOne({ phone: cleanPhone });
        
        if (!user) {
            return res.status(401).json({
                success: false,
                errors: ['Invalid phone number or password']
            });
        }
        
        // Handle legacy users without password
        if (!user.password) {
            return res.status(401).json({
                success: false,
                errors: ['This account was created without a password. Please create a new account.']
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                errors: ['Invalid phone number or password']
            });
        }

        user.isOnline = true;
        user.lastSeen = new Date();
        await user.save();

        const userObj = user.toObject();
        delete userObj.password;

        res.status(200).json({
            success: true,
            message: 'Login successful',
            user: userObj
        });
    } catch (error) {
        console.error('[UserController] loginUser error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error during login',
            error: error.message
        });
    }
};

/**
 * Get user profile by phone number.
 * GET /api/users/:phone
 */
const getUser = async (req, res) => {
    try {
        const cleanPhone = req.params.phone.replace(/\s+/g, '');
        const user = await User.findOne({ phone: cleanPhone });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({ success: true, user });
    } catch (error) {
        console.error('[UserController] getUser error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error fetching user',
            error: error.message
        });
    }
};

/**
 * Update user profile.
 * PUT /api/users/:phone
 */
const updateUser = async (req, res) => {
    try {
        const { displayName, avatar, status, aboutMe, allowGlobalMessage } = req.body;

        const updateData = {};
        if (displayName !== undefined) updateData.displayName = displayName.trim();
        if (avatar !== undefined) updateData.avatar = avatar;
        if (status !== undefined) updateData.status = status;
        if (aboutMe !== undefined) updateData.aboutMe = aboutMe;
        if (allowGlobalMessage !== undefined) updateData.allowGlobalMessage = allowGlobalMessage;

        const cleanPhone = req.params.phone.replace(/\s+/g, '');
        const user = await User.findOneAndUpdate(
            { phone: cleanPhone },
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            user
        });
    } catch (error) {
        console.error('[UserController] updateUser error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error updating user',
            error: error.message
        });
    }
};

/**
 * Get all online users.
 * GET /api/users/online/list
 */
const getOnlineUsers = async (req, res) => {
    try {
        const users = await User.find({ isOnline: true, allowGlobalMessage: true })
            .select('displayName phone avatar status isOnline lastSeen');

        res.status(200).json({ success: true, users });
    } catch (error) {
        console.error('[UserController] getOnlineUsers error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error fetching online users',
            error: error.message
        });
    }
};

/**
 * Get all users (for contact matching).
 * GET /api/users/all/list
 */
const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({})
            .select('displayName phone avatar status isOnline lastSeen');

        res.status(200).json({ success: true, users });
    } catch (error) {
        console.error('[UserController] getAllUsers error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error fetching users',
            error: error.message
        });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getUser,
    updateUser,
    getOnlineUsers,
    getAllUsers
};
