// src/api.js
import axios from 'axios';
const BASE = '/api';

let showingLogoutAlert = false;

axios.interceptors.response.use(
  res => res,
  err => {
    const status = err.response?.status;
    const url = err.config?.url || '';
    const isProfileCheck = url.includes('/users/profile');
    const isLogin = url.includes('/login');

    if (
      status === 401 &&
      window.location.pathname.startsWith('/admin') &&
      !isProfileCheck &&
      !isLogin &&
      !showingLogoutAlert
    ) {
      showingLogoutAlert = true;

      const modal = document.createElement('div');
      modal.style.position = 'fixed';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.width = '100vw';
      modal.style.height = '100vh';
      modal.style.background = 'rgba(0,0,0,0.55)';
      modal.style.display = 'flex';
      modal.style.justifyContent = 'center';
      modal.style.alignItems = 'center';
      modal.style.zIndex = '9999';

      modal.innerHTML = `
        <div style="
          background:#fff;
          padding:24px 28px;
          border-radius:12px;
          max-width:320px;
          width:80%;
          text-align:center;
          font-size:16px;
          line-height:1.6;
        ">
          <div style="margin-bottom:20px;font-weight:600;">
            当前登录状态已过期，请重新登入
          </div>
          <button id="logout-confirm-btn" 
            style="
              padding:8px 20px;
              border-radius:8px;
              background:#2563eb;
              color:#fff;
              border:none;
              font-size:15px;
              cursor:pointer;
            ">
            确定
          </button>
        </div>
      `;

      document.body.appendChild(modal);

      document.getElementById('logout-confirm-btn').onclick = () => {
        document.body.removeChild(modal);
        showingLogoutAlert = false;
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        window.location.href = '/admin';
      };
    }

    return Promise.reject(err);
  }
);

export const login = (username, password) =>
  axios.post(`${BASE}/login`, { username, password });

function authHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const getMenus = () => axios.get(`${BASE}/menus`);
export const addMenu = (data) =>
  axios.post(`${BASE}/menus`, data, { headers: authHeaders() });
export const updateMenu = (id, data) =>
  axios.put(`${BASE}/menus/${id}`, data, { headers: authHeaders() });
export const deleteMenu = (id) =>
  axios.delete(`${BASE}/menus/${id}`, { headers: authHeaders() });

export const getSubMenus = (menuId) =>
  axios.get(`${BASE}/menus/${menuId}/submenus`);
export const addSubMenu = (menuId, data) =>
  axios.post(`${BASE}/menus/${menuId}/submenus`, data, {
    headers: authHeaders()
  });
export const updateSubMenu = (id, data) =>
  axios.put(`${BASE}/menus/submenus/${id}`, data, { headers: authHeaders() });
export const deleteSubMenu = (id) =>
  axios.delete(`${BASE}/menus/submenus/${id}`, { headers: authHeaders() });

export const getCards = (menuId, subMenuId = null) => {
  const params = subMenuId ? { subMenuId } : {};
  return axios.get(`${BASE}/cards/${menuId}`, { params });
};
export const addCard = (data) =>
  axios.post(`${BASE}/cards`, data, { headers: authHeaders() });
export const updateCard = (id, data) =>
  axios.put(`${BASE}/cards/${id}`, data, { headers: authHeaders() });
export const deleteCard = (id) =>
  axios.delete(`${BASE}/cards/${id}`, { headers: authHeaders() });

export const globalSearchCards = (query) => {
  return axios.get(`${BASE}/cards/search`, { params: { q: query } });
};

export const uploadLogo = (file) => {
  const formData = new FormData();
  formData.append('logo', file);
  return axios.post(`${BASE}/upload`, formData, {
    headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' }
  });
};

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

export const deleteUploadImage = (id) => {
  return axios.delete(`${BASE}/upload/${id}`, {
    headers: authHeaders()
  });
};

export const getAds = () => axios.get(`${BASE}/ads`);
export const addAd = (data) =>
  axios.post(`${BASE}/ads`, data, { headers: authHeaders() });
export const updateAd = (id, data) =>
  axios.put(`${BASE}/ads/${id}`, data, { headers: authHeaders() });
export const deleteAd = (id) =>
  axios.delete(`${BASE}/ads/${id}`, { headers: authHeaders() });

export const getFriends = () => axios.get(`${BASE}/friends`);
export const addFriend = (data) =>
  axios.post(`${BASE}/friends`, data, { headers: authHeaders() });
export const updateFriend = (id, data) =>
  axios.put(`${BASE}/friends/${id}`, data, { headers: authHeaders() });
export const deleteFriend = (id) =>
  axios.delete(`${BASE}/friends/${id}`, { headers: authHeaders() });

export const getUserProfile = () =>
  axios.get(`${BASE}/users/profile`, { headers: authHeaders() });
export const changePassword = (oldPassword, newPassword) =>
  axios.put(
    `${BASE}/users/password`,
    { oldPassword, newPassword },
    { headers: authHeaders() }
  );
export const getUsers = () =>
  axios.get(`${BASE}/users`, { headers: authHeaders() });

export const exportBackup = () => {
  return axios.get(`${BASE}/backup/export`, {
    headers: authHeaders(),
    responseType: 'blob'
  });
};
export const importBackup = (formData) => {
  return axios.post(`${BASE}/backup/import`, formData, {
    headers: {
      ...authHeaders(),
      'Content-Type': 'multipart/form-data'
    }
  });
};

export const getSettings = () => {
  return axios.get(`${BASE}/settings`);
};
export const updateSettings = (settingsData) => {
  return axios.post(`${BASE}/settings`, settingsData, {
    headers: authHeaders()
  });
};
