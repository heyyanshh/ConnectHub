/**
 * ConnectHub - Contact Controller
 * 
 * Business logic for contact management:
 * - CRUD operations (Create, Read, Update, Delete)
 * - Duplicate detection (same owner + same phone)
 * - Toggle favorite status
 * - Export contacts to JSON
 * - Import contacts from JSON
 */

const Contact = require('../models/Contact');

/**
 * Get all contacts for a user.
 * GET /api/contacts/:ownerPhone
 */
const getContacts = async (req, res) => {
    try {
        const contacts = await Contact.find({ ownerPhone: req.params.ownerPhone })
            .sort({ fullName: 1 })
            .lean();

        // Fetch User profiles for all contacts to append lastSeen and isOnline
        const phones = contacts.map(c => c.phone);
        const users = await require('../models/User').find({ phone: { $in: phones } });
        const userMap = {};
        users.forEach(u => { userMap[u.phone] = u; });

        contacts.forEach(c => {
            if (userMap[c.phone]) {
                c.isOnline = userMap[c.phone].isOnline;
                c.lastSeen = userMap[c.phone].lastSeen;
                c.status = userMap[c.phone].status;
            }
        });

        res.status(200).json({
            success: true,
            count: contacts.length,
            contacts
        });
    } catch (error) {
        console.error('[ContactController] getContacts error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error fetching contacts',
            error: error.message
        });
    }
};

/**
 * Get a single contact by ID.
 * GET /api/contacts/detail/:id
 */
const getContactById = async (req, res) => {
    try {
        const contact = await Contact.findById(req.params.id);

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        res.status(200).json({ success: true, contact });
    } catch (error) {
        console.error('[ContactController] getContactById error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error fetching contact',
            error: error.message
        });
    }
};

/**
 * Add a new contact.
 * Checks for duplicate (same owner + same phone) before creating.
 * POST /api/contacts
 */
const addContact = async (req, res) => {
    try {
        const { ownerPhone, fullName, phone, email, address, category, favorite, profilePicture } = req.body;

        /* Upsert logic: if contact exists, update it instead of throwing error */
        const existing = await Contact.findOne({
            ownerPhone: ownerPhone,
            phone: phone.trim()
        });

        if (existing) {
            existing.fullName = fullName.trim();
            if (email !== undefined) existing.email = email.trim().toLowerCase();
            if (address !== undefined) existing.address = address.trim();
            if (category !== undefined) existing.category = category;
            if (favorite !== undefined) existing.favorite = favorite;
            if (profilePicture !== undefined) existing.profilePicture = profilePicture;
            
            await existing.save();
            
            return res.status(200).json({
                success: true,
                message: 'Contact updated successfully',
                contact: existing
            });
        }

        const contact = await Contact.create({
            ownerPhone,
            fullName: fullName.trim(),
            phone: phone.trim(),
            email: email ? email.trim().toLowerCase() : '',
            address: address ? address.trim() : '',
            category: category || 'Other',
            favorite: favorite || false,
            profilePicture: profilePicture || ''
        });

        res.status(201).json({
            success: true,
            message: 'Contact added successfully',
            contact
        });
    } catch (error) {
        /* Handle MongoDB duplicate key error */
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'A contact with this phone number already exists'
            });
        }
        console.error('[ContactController] addContact error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error adding contact',
            error: error.message
        });
    }
};

/**
 * Update a contact.
 * PUT /api/contacts/:id
 */
const updateContact = async (req, res) => {
    try {
        const { fullName, phone, email, address, category, favorite, profilePicture } = req.body;

        const updateData = {};
        if (fullName !== undefined) updateData.fullName = fullName.trim();
        if (phone !== undefined) updateData.phone = phone.trim();
        if (email !== undefined) updateData.email = email.trim().toLowerCase();
        if (address !== undefined) updateData.address = address.trim();
        if (category !== undefined) updateData.category = category;
        if (favorite !== undefined) updateData.favorite = favorite;
        if (profilePicture !== undefined) updateData.profilePicture = profilePicture;

        const contact = await Contact.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Contact updated successfully',
            contact
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'A contact with this phone number already exists'
            });
        }
        console.error('[ContactController] updateContact error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error updating contact',
            error: error.message
        });
    }
};

/**
 * Delete a contact.
 * DELETE /api/contacts/:id
 */
const deleteContact = async (req, res) => {
    try {
        const contact = await Contact.findByIdAndDelete(req.params.id);

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Contact deleted successfully'
        });
    } catch (error) {
        console.error('[ContactController] deleteContact error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error deleting contact',
            error: error.message
        });
    }
};

/**
 * Toggle favorite status of a contact.
 * PUT /api/contacts/favorite/:id
 */
const toggleFavorite = async (req, res) => {
    try {
        const contact = await Contact.findById(req.params.id);

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        contact.favorite = !contact.favorite;
        await contact.save();

        res.status(200).json({
            success: true,
            message: contact.favorite ? 'Added to favorites' : 'Removed from favorites',
            contact
        });
    } catch (error) {
        console.error('[ContactController] toggleFavorite error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error toggling favorite',
            error: error.message
        });
    }
};

/**
 * Toggle block status of a contact.
 * PUT /api/contacts/block/:id
 */
const toggleBlock = async (req, res) => {
    try {
        const contact = await Contact.findById(req.params.id);

        if (!contact) {
            return res.status(404).json({
                success: false,
                message: 'Contact not found'
            });
        }

        contact.isBlocked = !contact.isBlocked;
        await contact.save();

        res.status(200).json({
            success: true,
            message: contact.isBlocked ? 'Contact blocked' : 'Contact unblocked',
            contact
        });
    } catch (error) {
        console.error('[ContactController] toggleBlock error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error toggling block status',
            error: error.message
        });
    }
};

/**
 * Export all contacts for a user as JSON.
 * GET /api/contacts/export/:ownerPhone
 */
const exportContacts = async (req, res) => {
    try {
        const contacts = await Contact.find({ ownerPhone: req.params.ownerPhone })
            .select('-_id -__v -ownerPhone')
            .lean();

        res.status(200).json({
            success: true,
            exportDate: new Date().toISOString(),
            count: contacts.length,
            contacts
        });
    } catch (error) {
        console.error('[ContactController] exportContacts error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error exporting contacts',
            error: error.message
        });
    }
};

/**
 * Import contacts from JSON for a user.
 * POST /api/contacts/import/:ownerPhone
 */
const importContacts = async (req, res) => {
    try {
        const { contacts } = req.body;
        const ownerPhone = req.params.ownerPhone;

        if (!Array.isArray(contacts) || contacts.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No contacts provided for import'
            });
        }

        let imported = 0;
        let skipped = 0;
        const errors = [];

        for (const c of contacts) {
            try {
                /* Check for duplicate before inserting */
                const exists = await Contact.findOne({
                    ownerPhone: ownerPhone,
                    phone: c.phone ? c.phone.trim() : ''
                });

                if (exists) {
                    skipped++;
                    continue;
                }

                await Contact.create({
                    ownerPhone,
                    fullName: c.fullName || 'Unknown',
                    phone: c.phone || '',
                    email: c.email || '',
                    address: c.address || '',
                    category: c.category || 'Other',
                    favorite: c.favorite || false,
                    profilePicture: c.profilePicture || ''
                });
                imported++;
            } catch (err) {
                errors.push(`Failed to import ${c.fullName || 'Unknown'}: ${err.message}`);
            }
        }

        res.status(200).json({
            success: true,
            message: `Imported ${imported} contacts, skipped ${skipped} duplicates`,
            imported,
            skipped,
            errors
        });
    } catch (error) {
        console.error('[ContactController] importContacts error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server error importing contacts',
            error: error.message
        });
    }
};

module.exports = {
    getContacts,
    getContactById,
    addContact,
    updateContact,
    deleteContact,
    toggleFavorite,
    toggleBlock,
    exportContacts,
    importContacts
};
