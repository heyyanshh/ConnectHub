import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

export const loginUser = async (phone, password) => {
  try {
    const response = await api.post('/users/login', { phone, password });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, errors: ['Network error occurred'] };
  }
};

export const registerUser = async (displayName, phone, password) => {
  try {
    const response = await api.post('/users/register', { displayName, phone, password });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, errors: ['Network error occurred'] };
  }
};

export const fetchContacts = async (phone) => {
  try {
    // The server route is GET /api/contacts/:ownerPhone
    const cleanPhone = phone.replace(/\s+/g, '');
    const response = await api.get(`/contacts/${encodeURIComponent(cleanPhone)}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, errors: ['Network error occurred'] };
  }
};

export const searchUsers = async (query) => {
  try {
    // Use the "all users" endpoint and filter client-side
    const response = await api.get('/users/all/list');
    if (response.data.success) {
      const lowerQuery = query.toLowerCase();
      const filtered = response.data.users.filter(u => {
        const name = (u.displayName || u.fullName || '').toLowerCase();
        return name.includes(lowerQuery) || (u.phone || '').includes(query);
      });
      return { success: true, users: filtered };
    }
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, errors: ['Network error occurred'] };
  }
};

export const addContact = async (contactData) => {
  try {
    const cleanData = {
      ...contactData,
      ownerPhone: contactData.ownerPhone.replace(/\s+/g, ''),
      phone: contactData.phone.replace(/\s+/g, '')
    };
    const response = await api.post('/contacts', cleanData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, errors: ['Network error occurred'] };
  }
};

export const updateContact = async (contactId, contactData) => {
  try {
    const cleanData = { ...contactData };
    if (cleanData.phone) cleanData.phone = cleanData.phone.replace(/\s+/g, '');
    const response = await api.put(`/contacts/${contactId}`, cleanData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, errors: ['Network error occurred'] };
  }
};

export const deleteContact = async (contactId) => {
  try {
    const response = await api.delete(`/contacts/${contactId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, errors: ['Network error occurred'] };
  }
};

export const toggleFavorite = async (contactId) => {
  try {
    const response = await api.put(`/contacts/favorite/${contactId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, errors: ['Network error occurred'] };
  }
};

export const toggleBlock = async (id) => {
  try {
    const response = await api.put(`/contacts/block/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, errors: ['Network error occurred'] };
  }
};

export const getChatHistory = async (user1, user2, skip = 0, limit = 50) => {
  try {
    const clean1 = user1.replace(/\s+/g, '');
    const clean2 = user2.replace(/\s+/g, '');
    const response = await api.get(`/messages/${encodeURIComponent(clean1)}/${encodeURIComponent(clean2)}?skip=${skip}&limit=${limit}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, errors: ['Network error occurred'] };
  }
};

export const getGlobalOnlineUsers = async () => {
  try {
    const response = await api.get('/users/online/list');
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, errors: ['Network error occurred'] };
  }
};

export const updateUser = async (phone, data) => {
  try {
    const cleanPhone = phone.replace(/\s+/g, '');
    const response = await api.put(`/users/${encodeURIComponent(cleanPhone)}`, data);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, errors: ['Network error occurred'] };
  }
};

export const uploadFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, errors: ['Network error occurred'] };
  }
};

export const clearChat = async (user1Phone, user2Phone) => {
  try {
    const response = await api.delete(`/messages/clear/${encodeURIComponent(user1Phone)}/${encodeURIComponent(user2Phone)}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { success: false, errors: ['Network error occurred'] };
  }
};

export default api;
