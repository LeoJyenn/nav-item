<template>
  <div class="card-manage">
    <div class="card-header">
      <div class="header-content">
        <h2 class="page-title">管理网站导航卡片，支持主菜单和子菜单分类</h2>
      </div>
      <div class="card-add">
        <select v-model="selectedMenuId" class="input" @change="onMenuChange">
          <option v-for="menu in menus" :value="menu.id" :key="menu.id">{{ menu.name }}</option>
        </select>
        <select v-model="selectedSubMenuId" class="input" @change="onSubMenuChange">
          <option value="">主菜单</option>
          <option v-for="subMenu in currentSubMenus" :value="subMenu.id" :key="subMenu.id">{{ subMenu.name }}</option>
        </select>
        <input v-model="newCardTitle" placeholder="卡片标题" class="input" />
        <input v-model="newCardUrl" placeholder="卡片链接" class="input" />
        <div class="input-with-icon header-icon-input">
          <input v-model="newCardLogo" placeholder="logo链接(可选)" class="input" />
          <button class="btn btn-icon btn-magic" @click="fetchIconForNewCard" title="自动获取图标">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9.9 2.5l1.1 2.8 2.9.4-2.1 2 .5 2.8-2.5-1.3L7.5 10.5l.5-2.8-2.1-2 2.9-.4zM18.5 10.5l1.1 2.8 2.9.4-2.1 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2.1-2 2.9-.4zM10 15.5l1.1 2.8 2.9.4-2.1 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2.1-2 2.9-.4z" />
            </svg>
          </button>
        </div>
        <button class="btn btn-block" @click="addCard">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14" />
          </svg>
          添加卡片
        </button>
      </div>
    </div>

    <div class="card-card">
      <table class="card-table">
        <thead>
          <tr>
            <th>标题</th>
            <th>网址</th>
            <th>Logo链接</th>
            <th>描述</th>
            <th>排序</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="card in cards" :key="card.id">
            <td>
              <input v-model="card.title" @blur="updateCard(card)" class="table-input" />
            </td>
            <td>
              <input v-model="card.url" @blur="updateCard(card)" class="table-input" />
            </td>
            <td>
              <div class="input-with-icon">
                <input
                  v-model="card.logo_url"
                  @blur="updateCard(card)"
                  class="table-input"
                  placeholder="logo链接(可选)"
                />
                <button
                  class="btn btn-icon btn-magic"
                  @click="fetchIconForExistingCard(card)"
                  title="自动获取图标"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9.9 2.5l1.1 2.8 2.9.4-2.1 2 .5 2.8-2.5-1.3L7.5 10.5l.5-2.8-2.1-2 2.9-.4zM18.5 10.5l1.1 2.8 2.9.4-2.1 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2.1-2 2.9-.4zM10 15.5l1.1 2.8 2.9.4-2.1 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2.1-2 2.9-.4z" />
                  </svg>
                </button>
              </div>
            </td>
            <td>
              <input
                v-model="card.desc"
                @blur="updateCard(card)"
                class="table-input"
                placeholder="描述（可选）"
              />
            </td>
            <td>
              <input
                v-model.number="card.order"
                type="number"
                @blur="updateCard(card)"
                class="table-input order-input"
              />
            </td>
            <td class="td-actions">
              <button class="btn btn-danger btn-icon" @click="deleteCard(card.id)" title="删除">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <path d="M10 11v6M14 11v6" />
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { 
  getMenus, 
  getCards, 
  addCard as apiAddCard, 
  updateCard as apiUpdateCard, 
  deleteCard as apiDeleteCard 
} from '../../api';

const menus = ref([]);
const cards = ref([]);
const selectedMenuId = ref();
const selectedSubMenuId = ref('');
const newCardTitle = ref('');
const newCardUrl = ref('');
const newCardLogo = ref('');

const currentSubMenus = computed(() => {
  if (!selectedMenuId.value) return [];
  const menu = menus.value.find(m => m.id === selectedMenuId.value);
  return menu?.subMenus || [];
});

onMounted(async () => {
  const res = await getMenus();
  menus.value = res.data;
  if (menus.value.length) {
    selectedMenuId.value = menus.value[0].id;
    selectedSubMenuId.value = '';
  }
});

watch(selectedMenuId, () => {
  selectedSubMenuId.value = '';
  loadCards();
});

watch(selectedSubMenuId, loadCards);

function onMenuChange() {
  selectedSubMenuId.value = '';
}

function onSubMenuChange() {
  loadCards();
}

async function loadCards() {
  if (!selectedMenuId.value) return;
  const res = await getCards(selectedMenuId.value, selectedSubMenuId.value || null);
  cards.value = res.data;
}

async function addCard() {
  if (!newCardTitle.value || !newCardUrl.value) return;
  await apiAddCard({ 
    menu_id: selectedMenuId.value, 
    sub_menu_id: selectedSubMenuId.value || null,
    title: newCardTitle.value, 
    url: newCardUrl.value, 
    logo_url: newCardLogo.value 
  });
  newCardTitle.value = '';
  newCardUrl.value = '';
  newCardLogo.value = '';
  loadCards();
}

async function updateCard(card) {
  await apiUpdateCard(card.id, {
    menu_id: selectedMenuId.value,
    sub_menu_id: selectedSubMenuId.value || null,
    title: card.title,
    url: card.url,
    logo_url: card.logo_url,
    desc: card.desc,
    order: card.order
  });
}

async function deleteCard(id) {
  await apiDeleteCard(id);
  loadCards();
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
    console.error("URL 格式无效: ", e);
    return null; 
  }
}

function fetchIconForNewCard() {
  const domain = extractDomain(newCardUrl.value);
  if (domain) {
    newCardLogo.value = `https://www.faviconextractor.com/favicon/${domain}?larger=true`;
  } else {
    alert("请先在“卡片链接”中输入有效的 URL");
  }
}

async function fetchIconForExistingCard(card) {
  const domain = extractDomain(card.url);
  if (domain) {
    card.logo_url = `https://www.faviconextractor.com/favicon/${domain}?larger=true`;
    try {
      await updateCard(card);
    } catch (error) {
      console.error("自动保存图标失败:", error);
      alert("获取图标成功，但自动保存失败。");
    }
  } else {
    alert("此卡片的 URL 无效，无法获取图标。");
  }
}
</script>

<style scoped>
.card-manage {
  width: 100%;
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 0;
  box-sizing: border-box;
}

.card-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px; /* 添加圆角效果 */
  padding: 12px 16px;
  color: white;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
  width: 100%;
  box-sizing: border-box;
}


.header-content {
  margin-bottom: 8px;
}

.page-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.5px;
}

.card-add {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  box-sizing: border-box;
}

.card-card {
  background: white;
  border-radius: 0;
  box-shadow: none;
  width: 100%;
  box-sizing: border-box;
  overflow-x: auto;
}

.card-table {
  width: 100%;
  border-collapse: collapse;
}

.card-table th,
.card-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  box-sizing: border-box;
}

.card-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
}

.card-table th:nth-child(1), 
.card-table td:nth-child(1) {
  width: 15%;
}

.card-table th:nth-child(2), 
.card-table td:nth-child(2) {
  width: 25%;
}

.card-table th:nth-child(3), 
.card-table td:nth-child(3) {
  width: 25%;
}

.card-table th:nth-child(4), 
.card-table td:nth-child(4) {
  width: 15%;
}

.card-table th:nth-child(5), 
.card-table td:nth-child(5) {
  width: 8%;
}

.card-table th:nth-child(6), 
.card-table td:nth-child(6) {
  width: 12%;
  text-align: center;
}

.input {
  padding: 8px 10px;
  border-radius: 4px;
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
  border-radius: 4px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #222;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  box-sizing: border-box;
  height: 32px;
}

.table-input:focus,
.input:focus {
  outline: none;
  border-color: #399dff;
  box-shadow: 0 0 0 2px rgba(57, 157, 255, 0.1);
}

.order-input {
  max-width: 80px;
}

.btn {
  padding: 0 12px;
  min-width: 96px;
  border: none;
  border-radius: 4px;
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

.input-with-icon {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.header-icon-input {
  width: 100%;
}

.input-with-icon .table-input,
.input-with-icon .input {
  flex-grow: 1;
  width: auto;
}

.btn-magic {
  background: #9b59b6;
  flex-shrink: 0;
}

.btn-magic:hover {
  background: #8e44ad;
}

.td-actions {
  text-align: right;
}

@media (max-width: 1200px) {
  .card-add {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .card-header {
    padding: 12px 10px;
  }

  .page-title {
    font-size: 1.05rem;
  }

  .card-add {
    grid-template-columns: repeat(2, 1fr);
  }

  .card-card {
    padding: 0;
    overflow-x: auto;
  }

  .card-table {
    min-width: 720px;
  }

  .card-table th,
  .card-table td {
    padding: 6px 8px;
    font-size: 0.8rem;
  }

  .card-table td {
    border-bottom: none;
  }

  .card-table tr + tr td {
    border-top: 1px solid #f3f4f6;
  }

  .order-input {
    max-width: 70px;
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
