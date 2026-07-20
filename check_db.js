const mongoose = require('mongoose');
const Contact = require('./Server/models/Contact');
const User = require('./Server/models/User');

mongoose.connect('mongodb://127.0.0.1:27017/connecthub').then(async () => {
    const users = await User.find();
    console.log("Users:", users.map(u => ({ phone: u.phone, name: u.displayName })));
    const contacts = await Contact.find();
    console.log("Contacts:", contacts.map(c => ({ owner: c.ownerPhone, phone: c.phone, name: c.fullName })));
    process.exit(0);
});
