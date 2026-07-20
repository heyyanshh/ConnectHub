/**
 * ConnectHub - Validation Middleware
 * 
 * Provides request validation middleware for:
 * - Phone number format validation
 * - Email format validation
 * - Required fields checking
 * - Contact data validation
 * - User registration validation
 */

/**
 * Validates phone number format.
 * Accepts: +1234567890, 1234567890 (7-15 digits, optional leading +)
 */
const isValidPhone = (phone) => {
    if (!phone || typeof phone !== 'string') return false;
    // Strip all whitespace so "+91 9329934637" becomes "+919329934637"
    const cleaned = phone.replace(/\s+/g, '');
    return /^\+?[1-9]\d{6,14}$/.test(cleaned);
};

/**
 * Validates email format.
 * Allows empty string (email is optional for contacts).
 */
const isValidEmail = (email) => {
    if (!email || email.trim() === '') return true; /* Email is optional */
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

/**
 * Middleware: Validate user registration data
 */
const validateUserRegistration = (req, res, next) => {
    const { displayName, phone, password } = req.body;

    const errors = [];

    if (!displayName || displayName.trim().length < 2) {
        errors.push('Display name must be at least 2 characters');
    }
    if (displayName && displayName.trim().length > 50) {
        errors.push('Display name cannot exceed 50 characters');
    }
    if (!phone) {
        errors.push('Phone number is required');
    } else if (!isValidPhone(phone)) {
        errors.push('Invalid phone number format (7-15 digits, optional + prefix)');
    }
    if (!password || password.length < 6) {
        errors.push('Password is required and must be at least 6 characters');
    }

    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    next();
};

/**
 * Middleware: Validate user login data
 */
const validateUserLogin = (req, res, next) => {
    const { phone, password } = req.body;
    const errors = [];

    if (!phone) {
        errors.push('Phone number is required');
    } else if (!isValidPhone(phone)) {
        errors.push('Invalid phone number format');
    }
    
    if (!password) {
        errors.push('Password is required');
    }

    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    next();
};

/**
 * Middleware: Validate contact data (create/update)
 */
const validateContact = (req, res, next) => {
    const { fullName, phone, email, category } = req.body;

    const errors = [];

    if (!fullName || fullName.trim().length < 2) {
        errors.push('Full name must be at least 2 characters');
    }
    if (!phone) {
        errors.push('Phone number is required');
    } else if (!isValidPhone(phone)) {
        errors.push('Invalid phone number format');
    }
    if (email && !isValidEmail(email)) {
        errors.push('Invalid email format');
    }
    if (category && !['Family', 'Friends', 'Work', 'College', 'Other'].includes(category)) {
        errors.push('Category must be one of: Family, Friends, Work, College, Other');
    }

    if (errors.length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    next();
};

/**
 * Middleware: Validate phone parameter in URL
 */
const validatePhoneParam = (req, res, next) => {
    const phone = req.params.phone;
    if (!phone || !isValidPhone(phone)) {
        return res.status(400).json({
            success: false,
            errors: ['Invalid phone number in URL parameter']
        });
    }
    next();
};

module.exports = {
    isValidPhone,
    isValidEmail,
    validateUserRegistration,
    validateUserLogin,
    validateContact,
    validatePhoneParam
};
