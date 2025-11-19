import axios from 'axios';
const BASE = '/api';

export const login = (username, password) => axios.post(`${BASE}/login`, { username, password });

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// 菜单相关API
export const getMenus = () => axios.get(`${BASE}/menus`);
export const addMenu = (data) => axios.post(`${BASE}/menus`, data, { headers: authHeaders() });
export const updateMenu = (id, data) => axios.put(`${BASE}/menus/${id}`, data, { headers: authHeaders() });
export const deleteMenu = (id) => axios.delete(`${BASE}/menus/${id}`, { headers: authHeaders() });

// 子菜单相关API
export const getSubMenus = (menuId) => axios.get(`${BASE}/menus/${menuId}/submenus`);
export const addSubMenu = (menuId, data) => axios.post(`${BASE}/menus/${menuId}/submenus`, data, { headers: authHeaders() });
export const updateSubMenu = (id, data) => axios.put(`${BASE}/menus/submenus/${id}`, data, { headers: authHeaders() });
export const deleteSubMenu = (id) => axios.delete(`${BASE}/menus/submenus/${id}`, { headers: authHeaders() });

// 卡片相关API
export const getCards = (menuId, subMenuId = null) => {
  const params = subMenuId ? { subMenuId } : {};
  return axios.get(`${BASE}/cards/${menuId}`, { params });
};
export const addCard = (data) => axios.post(`${BASE}/cards`, data, { headers: authHeaders() });
export const updateCard = (id, data) => axios.put(`${BASE}/cards/${id}`, data, { headers: authHeaders() });
export const deleteCard = (id) => axios.delete(`${BASE}/cards/${id}`, { headers: authHeaders() });

export const globalSearchCards = (query) => {
  return axios.get(`${BASE}/cards/search`, { params: { q: query } });
};

export const uploadLogo = (file) => {
  const formData = new FormData();
  formData.append('logo', file);
  return axios.post(`${BASE}/upload`, formData, { headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' } });
};

// 图片上传API
export const uploadImageWithRemark = (file, remark = '') => {
  const formData = new FormData();
  formData.append('logo', file);
  formData.append('remark', remark);
  return axios.post(`${BASE}/upload`, formData, {
    headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' }
  });
};

export const getUploadImages = () => {
  return axios.get(`${BASE}/upload/files`, {
    headers: authHeaders()
  });
};

// 图片删除API
export const deleteUploadImage = (id) => {
  return axios.delete(`${BASE}/upload/${id}`, {
    headers: authHeaders()
  });
};

// 广告API
export const getAds = () => axios.get(`${BASE}/ads`);
export const addAd = (data) => axios.post(`${BASE}/ads`, data, { headers: authHeaders() });
export const updateAd = (id, data) => axios.put(`${BASE}/ads/${id}`, data, { headers: authHeaders() });
export const deleteAd = (id) => axios.delete(`${BASE}/ads/${id}`, { headers: authHeaders() });

// 友链API
export const getFriends = () => axios.get(`${BASE}/friends`);
export const addFriend = (data) => axios.post(`${BASE}/friends`, data, { headers: authHeaders() });
export const updateFriend = (id, data) => axios.put(`${BASE}/friends/${id}`, data, { headers: authHeaders() });
export const deleteFriend = (id) => axios.delete(`${BASE}/friends/${id}`, { headers: authHeaders() });

// 用户API
export const getUserProfile = () => axios.get(`${BASE}/users/profile`, { headers: authHeaders() });
export const changePassword = (oldPassword, newPassword) => axios.put(`${BASE}/users/password`, { oldPassword, newPassword }, { headers: authHeaders() });
export const getUsers = () => axios.get(`${BASE}/users`, { headers: authHeaders() });

// 备份与恢复 API
export const exportBackup = () => {
  return axios.get(`${BASE}/backup/export`, {
    headers: authHeaders(),
    responseType: 'blob', 
  });
};
export const importBackup = (formData) => {
  return axios.post(`${BASE}/backup/import`, formData, {
    headers: {
      ...authHeaders(),
      'Content-Type': 'multipart/form-data', 
    },
  });
};

// 网站设置 API
export const getSettings = () => {
  return axios.get(`${BASE}/settings`); // (公开)
};
export const updateSettings = (settingsData) => {
  return axios.post(`${BASE}/settings`, settingsData, { // (私有)
    headers: authHeaders(),
  });
};