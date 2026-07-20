/**
 * ConnectHub - Contact Routes
 * 
 * Endpoints:
 *   GET    /api/contacts/export/:ownerPhone  - Export contacts
 *   POST   /api/contacts/import/:ownerPhone  - Import contacts
 *   GET    /api/contacts/detail/:id          - Get single contact
 *   PUT    /api/contacts/favorite/:id        - Toggle favorite
 *   GET    /api/contacts/:ownerPhone         - Get all contacts for user
 *   POST   /api/contacts                     - Add new contact
 *   PUT    /api/contacts/:id                 - Update contact
 *   DELETE /api/contacts/:id                 - Delete contact
 */

const express = require('express');
const router = express.Router();
const {
    getContacts,
    getContactById,
    addContact,
    updateContact,
    deleteContact,
    toggleFavorite,
    exportContacts,
    importContacts,
    toggleBlock
} = require('../controllers/contactController');
const { validateContact } = require('../middleware/validator');

/* Static/specific routes MUST come before parameterized routes */
router.get('/export/:ownerPhone', exportContacts);
router.post('/import/:ownerPhone', importContacts);
router.get('/detail/:id', getContactById);
router.put('/favorite/:id', toggleFavorite);
router.put('/block/:id', toggleBlock);

/* Parameterized routes */
router.get('/:ownerPhone', getContacts);
router.post('/', validateContact, addContact);
router.put('/:id', validateContact, updateContact);
router.delete('/:id', deleteContact);

module.exports = router;
