<template>
  <div class="friend-manage">
    <div class="friend-header">
      <div class="header-content">
        <h2 class="page-title">友链管理</h2>
      </div>
    </div>

    <div class="friend-add">
      <input v-model="newTitle" placeholder="网站名" class="input" />
      <input v-model="newUrl" placeholder="网站链接" class="input" />
      <div class="input-with-icon">
        <input v-model="newLogo" placeholder="logo链接(可选)" class="input" />
        <button
          class="btn btn-icon btn-magic"
          @click="fetchIconForNewFriend"
          title="自动获取图标"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M9.9 2.5l1.1 2.8 2.9.4-2.1 2 .5 2.8-2.5-1.3L7.5 10.5l.5-2.8-2.1-2 2.9-.4zM18.5 10.5l1.1 2.8 2.9.4-2.1 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2.1-2 2.9-.4zM10 15.5l1.1 2.8 2.9.4-2.1 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2.1-2 2.9-.4z"
            />
          </svg>
        </button>
      </div>
      <button class="btn btn-block" @click="addFriend">
        添加友链
      </button>
    </div>

    <div class="friend-card">
      <table class="friend-table">
        <thead>
          <tr>
            <th>网站名</th>
            <th>链接</th>
            <th>Logo</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in friends" :key="f.id">
            <td>
              <input
                v-model="f.title"
                @blur="updateFriend(f)"
                class="table-input"
              />
            </td>
            <td>
              <input
                v-model="f.url"
                @blur="updateFriend(f)"
                class="table-input"
              />
            </td>
            <td>
              <div class="input-with-icon">
                <input
                  v-model="f.logo"
                  @blur="updateFriend(f)"
                  class="table-input"
                  placeholder="logo链接(可选)"
                />
                <button
                  class="btn btn-icon btn-magic"
                  @click="fetchIconForExistingFriend(f)"
                  title="自动获取图标"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path
                      d="M9.9 2.5l1.1 2.8 2.9.4-2.1 2 .5 2.8-2.5-1.3L7.5 10.5l.5-2.8-2.1-2 2.9-.4zM18.5 10.5l1.1 2.8 2.9.4-2.1 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2.1-2 2.9-.4zM10 15.5l1.1 2.8 2.9.4-2.1 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2.1-2 2.9-.4z"
                    />
                  </svg>
                </button>
              </div>
            </td>
            <td>
              <button
                class="btn btn-danger btn-icon"
                @click="deleteFriend(f.id)"
              >
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import {
  getFriends,
  addFriend as apiAddFriend,
  updateFriend as apiUpdateFriend,
  deleteFriend as apiDeleteFriend
} from '../../api';

const friends = ref([]);
const newTitle = ref('');
const newUrl = ref('');
const newLogo = ref('');

onMounted(loadFriends);

async function loadFriends() {
  const res = await getFriends();
  friends.value = res.data;
}

async function addFriend() {
  if (!newTitle.value || !newUrl.value) return;
  await apiAddFriend({
    title: newTitle.value,
    url: newUrl.value,
    logo: newLogo.value
  });
  newTitle.value = '';
  newUrl.value = '';
  newLogo.value = '';
  loadFriends();
}

async function updateFriend(f) {
  await apiUpdateFriend(f.id, {
    title: f.title,
    url: f.url,
    logo: f.logo
  });
  loadFriends();
}

async function deleteFriend(id) {
  await apiDeleteFriend(id);
  loadFriends();
}

function extractDomain(url) {
  if (!url) return null;
  try {
    let fullUrl = url;
    if (!/^https?:\/\//i.test(fullUrl)) {
      fullUrl = 'http://' + fullUrl;
    }
    const parsedUrl = new URL(fullUrl);
    return parsedUrl.hostname.replace(/^www\./i, '');
  } catch (e) {
    console.error('URL 格式无效: ', e);
    return null;
  }
}

function fetchIconForNewFriend() {
  const domain = extractDomain(newUrl.value);
  if (domain) {
    newLogo.value = `https://www.faviconextractor.com/favicon/${domain}?larger=true`;
  } else {
    alert('请先在“网站链接”中输入有效的 URL');
  }
}

async function fetchIconForExistingFriend(f) {
  const domain = extractDomain(f.url);
  if (domain) {
    f.logo = `https://www.faviconextractor.com/favicon/${domain}?larger=true`;
    try {
      await updateFriend(f);
    } catch (error) {
      console.error('自动保存图标失败:', error);
      alert('获取图标成功，但自动保存失败。');
    }
  } else {
    alert('此友链的 URL 无效，无法获取图标。');
  }
}
</script>

<style scoped>
.friend-manage {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 0;
  box-sizing: border-box;
}

/* 顶部头部条：和广告管理 / 卡片管理风格统一 */
.friend-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 14px 18px;
  margin: 0 16px 18px;
  color: white;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
}

.header-content {
  margin-bottom: 4px;
}

.page-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
}

.friend-add {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  box-sizing: border-box;
  padding: 10px 16px 12px;
  justify-items: stretch;
  align-items: center;
}

.friend-card {
  width: 100%;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  width: 100%;
  box-sizing: border-box;
  overflow-x: auto;
  padding: 16px;
}

.friend-table {
  width: 100%;
  border-collapse: collapse;
}

.friend-table th,
.friend-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #e3e6ef;
  height: 36px;
  box-sizing: border-box;
}

.friend-table th {
  background: #f5f7fa;
  color: #222;
  font-weight: 600;
  font-size: 0.9rem;
}

.friend-table th:last-child,
.friend-table td:last-child {
  text-align: center;
  vertical-align: middle;
}

/* 输入框：和卡片管理 / 广告管理统一 */
.input {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #d0d7e2;
  background: #fff;
  color: #222;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  box-sizing: border-box;
  width: 100%;
  height: 36px;
}

.table-input {
  width: 100%;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #222;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  box-sizing: border-box;
  height: 32px;
}

.input:focus,
.table-input:focus {
  outline: none;
  border-color: #399dff;
  box-shadow: 0 0 0 2px rgba(57, 157, 255, 0.1);
}

/* 按钮：同后台通用按钮风格 */
.btn {
  padding: 0 12px;
  min-width: 96px;
  border: none;
  border-radius: 8px;
  background: #399dff;
  color: white;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  box-sizing: border-box;
}

.btn-block {
  width: 100%;
}

.btn-icon {
  width: 36px;
  min-width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 4px;
}

.btn:hover {
  background: #2d7dd2;
  transform: translateY(-1px);
}

.btn-danger {
  background: #ef4444;
}

.btn-danger:hover {
  background: #dc2626;
}

.btn-magic {
  background: #9b59b6;
}

.btn-magic:hover {
  background: #8e44ad;
}

/* 带魔术棒的小输入框布局 */
.input-with-icon {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.input-with-icon .input,
.input-with-icon .table-input {
  flex: 1;
}

/* 移动端：和卡片管理保持一致的风格 */
@media (max-width: 768px) {
  .friend-manage {
    width: 100%;
  }

  .friend-add {
    grid-template-columns: repeat(2, 1fr);
    padding: 8px 10px 10px;
  }

  .friend-card {
    padding: 0;
    overflow-x: auto;
  }

  .friend-table {
    min-width: 720px;
    font-size: 0.8rem;
  }

  .friend-table th,
  .friend-table td {
    padding: 6px 8px;
    font-size: 0.8rem;
  }

  .btn {
    min-width: 80px;
    height: 32px;
    font-size: 0.8rem;
  }

  .btn-icon {
    width: 32px;
    min-width: 32px;
    height: 32px;
  }
}
</style>
