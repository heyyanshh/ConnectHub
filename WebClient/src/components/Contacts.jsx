import React, { useState, useEffect } from 'react';
import { Search, UserPlus, Phone, Users, Check, X, Mail, MapPin, Tag, Star } from 'lucide-react';
import { searchUsers, addContact, updateContact, deleteContact, toggleFavorite, toggleBlock } from '../services/api';
import { initWasm, getDsaInstance, jsArrayToWasmVector, wasmVectorToJsArray } from '../services/wasmService';
import { formatPhone } from '../utils/formatters';

export default function Contacts({ user, contacts, onlineUsers, refreshContacts, onStartChat }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [addedPhones, setAddedPhones] = useState(new Set());
  const [isSearching, setIsSearching] = useState(false);
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ fullName: '', phonePrefix: '+1', phoneNumber: '', email: '', address: '', category: 'Other' });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingContactId, setEditingContactId] = useState(null);

  // Wasm state
  const [wasmReady, setWasmReady] = useState(false);
  const [wasmFilteredContacts, setWasmFilteredContacts] = useState([]);
  const [contactsVersion, setContactsVersion] = useState(0);

  // Initialize Wasm and load contacts into C++ memory
  useEffect(() => {
    initWasm().then((instance) => {
      const contactsWithCategory = contacts.map(c => ({
        ...c,
        category: c.category || "Other"
      }));
      const wasmVector = jsArrayToWasmVector(contactsWithCategory);
      instance.loadContacts(wasmVector);
      wasmVector.delete();
      setWasmReady(true);
      setContactsVersion(v => v + 1);
    }).catch(err => {
      console.error("Failed to load Wasm DSA module:", err);
    });
  }, [contacts]);

  // C++ Search
  useEffect(() => {
    if (wasmReady) {
      const instance = getDsaInstance();
      const resultsVec = instance.search(searchQuery);
      const jsResults = wasmVectorToJsArray(resultsVec);
      setWasmFilteredContacts(jsResults);
      resultsVec.delete();
    }
  }, [searchQuery, wasmReady, contactsVersion]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await searchUsers(searchQuery);
      if (response.success) {
        setSearchResults(response.users.filter(u => u.phone !== user.phone));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddContactFromList = async (contactPhone) => {
    try {
      const userToAdd = searchResults.find(u => u.phone === contactPhone) || { displayName: 'Unknown' };
      const response = await addContact({
        ownerPhone: user.phone,
        phone: contactPhone,
        fullName: userToAdd.displayName,
        category: 'Other'
      });
      if (response.success) {
        setAddedPhones(prev => new Set(prev).add(contactPhone));
        setTimeout(refreshContacts, 500);
      }
    } catch (err) {
      console.error("Error adding contact:", err);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.fullName.trim() || !formData.phoneNumber.trim()) {
      setFormError('Name and phone number are required.');
      return;
    }

    const fullPhone = `${formData.phonePrefix}${formData.phoneNumber.trim()}`;

    setFormLoading(true);
    try {
      let response;
      if (editingContactId) {
        // Edit existing contact
        response = await updateContact(editingContactId, {
          fullName: formData.fullName.trim(),
          phone: fullPhone,
          email: formData.email.trim(),
          address: formData.address.trim(),
          category: formData.category
        });
      } else {
        // Add new contact
        response = await addContact({
          ownerPhone: user.phone,
          fullName: formData.fullName.trim(),
          phone: fullPhone,
          email: formData.email.trim(),
          address: formData.address.trim(),
          category: formData.category
        });
      }

      if (response.success) {
        setShowAddModal(false);
        setFormData({ fullName: '', phone: '', email: '', address: '', category: 'Other' });
        setEditingContactId(null);
        refreshContacts();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to add contact.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (!window.confirm("Are you sure you want to delete this contact?")) return;
    try {
      const response = await deleteContact(contactId);
      if (response.success) {
        refreshContacts();
      }
    } catch (err) {
      console.error("Failed to delete contact:", err);
      alert(err.message || 'Failed to delete contact');
    }
  };

  const handleBlockContact = async (contactId) => {
    try {
      await toggleBlock(contactId);
      refreshContacts();
    } catch (err) {
      console.error("Failed to block contact:", err);
      alert(err.message || 'Failed to block/unblock contact');
    }
  };

  const handleToggleFavorite = async (contactId) => {
    try {
      const response = await toggleFavorite(contactId);
      if (response.success) {
        refreshContacts();
      }
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  const filteredContacts = wasmReady 
    ? wasmFilteredContacts.map(wc => contacts.find(c => c.phone === wc.phone) || wc)
    : contacts.filter(c => {
        const name = (c.displayName || c.fullName || '').toLowerCase();
        return name.includes(searchQuery.toLowerCase()) || (c.phone || '').includes(searchQuery);
      });

  const displayList = (() => {
    let list = [];
    if (!searchQuery || searchResults.length === 0) {
      list = filteredContacts;
    } else {
      const localPhones = new Set(filteredContacts.map(c => c.phone));
      const newGlobalUsers = searchResults.filter(u => !localPhones.has(u.phone));
      list = [...filteredContacts, ...newGlobalUsers];
    }
    return list.sort((a, b) => {
      // Sort favorites first
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return 1;
      return 0;
    });
  })();

  const categories = ['Family', 'Friends', 'Work', 'College', 'Other'];

  return (
    <div className="h-full w-full flex flex-col animate-fade-in" style={{ padding: '40px', position: 'relative' }}>

      {/* Header */}
      <div className="flex justify-between items-center mb-8 animate-slide-up">
        <div className="flex items-center gap-4">
          <h1 className="text-gradient" style={{ fontSize: '36px', fontWeight: '800' }}>Contacts</h1>
        </div>
        <button
          onClick={() => {
            setFormData({ fullName: '', phonePrefix: '+1', phoneNumber: '', email: '', address: '', category: 'Other' });
            setEditingContactId(null);
            setFormError('');
            setShowAddModal(true);
          }}
          style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}
        >
          <UserPlus size={18} /> Add Contact
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="animate-slide-up" style={{ position: 'relative', marginBottom: '32px', animationDelay: '0.1s', animationFillMode: 'both' }}>
        <input 
          type="text" 
          placeholder="Search your contacts or find users..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (e.target.value === '') setSearchResults([]);
          }}
          style={{ paddingLeft: '48px', height: '60px', fontSize: '16px' }}
        />
        <Search size={22} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '19px' }} />
        {isSearching && (
          <div style={{ position: 'absolute', right: '16px', top: '19px', width: '22px', height: '22px', border: '2px solid var(--text-muted)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        )}
      </form>

      {/* Contact List */}
      <div className="animate-slide-up" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingRight: '8px', animationDelay: '0.2s', animationFillMode: 'both' }}>
        {displayList.length === 0 ? (
          <div className="text-center text-gray flex flex-col items-center justify-center h-full">
            <Users size={56} opacity={0.3} className="mb-4" />
            <p style={{ fontSize: '18px' }}>No contacts found.</p>
          </div>
        ) : (
          displayList.map(contact => {
            const isExistingContact = contacts.some(c => c.phone === contact.phone);
            const justAdded = addedPhones.has(contact.phone);

            return (
              <div key={contact.phone} className="glass-card" style={{
                padding: '20px 28px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: '24px'
              }}>
                <div className="flex items-center" style={{ gap: '20px', flex: 1, minWidth: 0 }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <div style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '24px', color: 'white' }}>{(contact.displayName || contact.fullName || '?').charAt(0)}</span>
                    </div>
                    {onlineUsers.includes(contact.phone) && (
                      <div style={{ position: 'absolute', bottom: 0, right: 0, width: '16px', height: '16px', background: '#10b981', borderRadius: '50%', border: '3px solid var(--bg-panel)' }} />
                    )}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {contact.displayName || contact.fullName}
                      {contact.favorite && <Star size={16} fill="var(--accent-primary)" color="var(--accent-primary)" />}
                    </h3>
                    <p className="text-gray flex items-center gap-2" style={{ fontSize: '14px' }}>
                      <Phone size={14} /> {formatPhone(contact.phone)}
                    </p>
                  </div>
                </div>

                <div className="flex" style={{ gap: '12px', flexShrink: 0, alignItems: 'center' }}>
                  {isExistingContact ? (
                    <>
                      <button
                        onClick={() => handleToggleFavorite(contact._id || contact.id)}
                        style={{ background: 'transparent', color: contact.favorite ? 'var(--accent-primary)' : 'var(--text-secondary)', padding: '8px', border: 'none', cursor: 'pointer' }}
                        title={contact.favorite ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Star size={20} fill={contact.favorite ? "var(--accent-primary)" : "none"} />
                      </button>
                      <button
                        onClick={() => {
                          let pre = '+1';
                          let num = contact.phone || '';
                          const supportedPrefixes = ['+1', '+91', '+44', '+61', '+81', '+49', '+33'];
                          for (const p of supportedPrefixes) {
                            if (num.startsWith(p)) {
                              pre = p;
                              num = num.slice(p.length);
                              break;
                            }
                          }
                          setFormData({
                            fullName: contact.fullName || contact.displayName || '',
                            phonePrefix: pre,
                            phoneNumber: num,
                            email: contact.email || '',
                            address: contact.address || '',
                            category: contact.category || 'Other'
                          });
                          setEditingContactId(contact._id || contact.id || null);
                          setShowAddModal(true);
                        }}
                        style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteContact(contact._id || contact.id)}
                        style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => handleBlockContact(contact._id || contact.id)}
                        style={{ background: contact.isBlocked ? 'var(--bg-panel)' : 'rgba(249, 115, 22, 0.1)', color: contact.isBlocked ? 'var(--text-secondary)' : '#f97316', border: contact.isBlocked ? '1px solid var(--border-color)' : '1px solid rgba(249, 115, 22, 0.3)' }}
                      >
                        {contact.isBlocked ? 'Unblock' : 'Block'}
                      </button>
                      <button onClick={() => onStartChat({ ...contact, displayName: contact.displayName || contact.fullName })}>
                        Message
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => !justAdded && handleAddContactFromList(contact.phone)}
                      disabled={justAdded}
                    >
                      {justAdded ? <><Check size={18} /> Added!</> : <><UserPlus size={18} /> Add</>}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ═══ GLASSMORPHISM ADD CONTACT MODAL ═══ */}
      {showAddModal && (
        <div
          onClick={() => setShowAddModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(12px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          className="animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel animate-slide-up"
            style={{
              padding: '40px',
              width: '480px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-gradient" style={{ fontSize: '28px', fontWeight: '800', marginBottom: '4px' }}>{editingContactId ? 'Edit Contact' : 'Add New Contact'}</h2>
                <p style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>{editingContactId ? 'Update the details below' : 'Fill in the details below'}</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', padding: '10px' }}
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Name (required) */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500', fontSize: '15px' }}>
                  <Users size={16} color="var(--accent-primary)" /> Full Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>

              {/* Phone (required) */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500', fontSize: '15px' }}>
                  <Phone size={16} color="var(--accent-primary)" /> Phone Number <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select 
                    value={formData.phonePrefix}
                    onChange={(e) => setFormData({ ...formData, phonePrefix: e.target.value })}
                    style={{ 
                      width: '120px', 
                      padding: '14px', 
                      background: 'var(--bg-input)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '12px', 
                      color: 'var(--text-primary)',
                      outline: 'none',
                      cursor: 'pointer',
                      fontSize: '15px'
                    }}
                  >
                    <option value="+1">+1 (USA)</option>
                    <option value="+91">+91 (IND)</option>
                    <option value="+44">+44 (UK)</option>
                    <option value="+61">+61 (AUS)</option>
                    <option value="+81">+81 (JPN)</option>
                    <option value="+49">+49 (GER)</option>
                    <option value="+33">+33 (FRA)</option>
                  </select>
                  <input
                    type="tel"
                    placeholder="1234567890"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value.replace(/\D/g, '') })}
                    required
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              {/* Email (optional) */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500', fontSize: '15px' }}>
                  <Mail size={16} color="var(--accent-primary)" /> Email <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>(optional)</span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. john@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              {/* Address (optional) */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500', fontSize: '15px' }}>
                  <MapPin size={16} color="var(--accent-primary)" /> Address <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 123 Main St, City"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              {/* Category */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--text-primary)', fontWeight: '500', fontSize: '15px' }}>
                  <Tag size={16} color="var(--accent-primary)" /> Category
                </label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat })}
                      style={{
                        padding: '10px 20px',
                        borderRadius: '24px',
                        background: formData.category === cat ? 'var(--accent-primary)' : 'var(--bg-input)',
                        color: formData.category === cat ? 'white' : 'var(--text-secondary)',
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error */}
              {formError && (
                <p className="error-text text-center">{formError}</p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={formLoading}
                style={{
                  marginTop: '12px',
                  padding: '16px',
                  background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                  fontSize: '16px',
                  boxShadow: '0 8px 24px -8px var(--accent-primary)'
                }}
              >
                {formLoading ? 'Saving...' : (editingContactId ? 'Update Contact' : 'Save Contact')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
