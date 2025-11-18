<template>
  <div
    :class="['home-container', textModeClass, { 'is-dark-overlay': isDarkOverlay }]"
    :style="containerStyles"
    @click="onBlankAreaClick"
  >
    <div class="menu-bar-fixed" ref="menuBarContainer">
      <MenuBar 
        :ref="menuBarRef"
        :menus="menus" 
        :activeId="activeMenu?.id" 
        :activeSubMenuId="activeSubMenu?.id"
        @select="selectMenu"
      />
    </div>
    
    <div class="search-section" :style="searchSectionStyle">
      <div class="search-box-wrapper">
        <div class="search-engine-select">
          <button v-for="engine in searchEngines" :key="engine.name"
            :class="['engine-btn', {active: selectedEngine.name === engine.name}]"
            @click="selectEngine(engine)"
          >
            {{ engine.label }}
          </button>
          
          <a href="/admin" class="engine-btn admin-btn">
            后台
          </a>
        </div>
        <div class="search-container">
          <input 
            v-model="searchQuery" 
            type="text" 
            :placeholder="selectedEngine.placeholder" 
            class="search-input"
            @keyup.enter="handleSearch"
            @input="onSearchInput" 
          />
          <button v-if="searchQuery" class="clear-btn" @click="clearSearch" aria-label="清空" title="clear">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
          </button>
          <button @click="handleSearch" class="search-btn" title="search">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
    
    <div v-if="leftAds.length" class="ad-space-fixed left-ad-fixed">
      <a v-for="ad in leftAds" :key="ad.id" :href="ad.url" target="_blank">
        <img :src="ad.img" alt="广告" />
      </a>
    </div>
    <div v-if="rightAds.length" class="ad-space-fixed right-ad-fixed">
      <a v-for="ad in rightAds" :key="ad.id" :href="ad.url" target="_blank">
        <img :src="ad.img" alt="广告" />
      </a>
    </div>
    
    <CardGrid :cards="cards" @click.stop /> 
    
    <footer class="footer">
      <div class="footer-content">
        <button @click="showFriendLinks = true" class="friend-link-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
          友情链接
        </button>
        <p class="copyright">
          Copyright © 2025 Nav-Item |
          <a href="https://github.com/LeoJyenn/nav-item" target="_blank" class="footer-link">Powered by LeoJyenn</a>
        </p>
      </div>
    </footer>

    <div v-if="showFriendLinks" class="modal-overlay" @click="showFriendLinks = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>友情链接</h3>
          <button @click="showFriendLinks = false" class="close-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="friend-links-grid">
            <a 
              v-for="friend in friendLinks" 
              :key="friend.id" 
              :href="friend.url" 
              target="_blank" 
              class="friend-link-card"
            >
              <div class="friend-link-logo">
                <img 
                  v-if="friend.logo" 
                  :src="friend.logo" 
                  :alt="friend.title"
                  @error="handleLogoError"
                />
                <div v-else class="friend-link-placeholder">
                  {{ friend.title.charAt(0) }}
                </div>
              </div>
              <div class="friend-link-info">
                <h4>{{ friend.title }}</h4>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch, nextTick, onBeforeUnmount } from 'vue'; 
import { getMenus, getCards, getAds, getFriends, globalSearchCards, getSettings } from '../api'; 
import MenuBar from '../components/MenuBar.vue';
import CardGrid from '../components/CardGrid.vue';

const menus = ref([]);
const activeMenu = ref(null);
const activeSubMenu = ref(null);
const cards = ref([]);
const searchQuery = ref('');
const leftAds = ref([]);
const rightAds = ref([]);
const showFriendLinks = ref(false);
const friendLinks = ref([]);
const isGlobalSearchActive = ref(false);
let debounceTimer = null;

const menuBarRef = ref(null);
const menuBarContainer = ref(null);
const cardsCache = new Map();

const isMobile = ref(false);
const menuBarHeight = ref(0);

const settings = ref({
  bg_url_pc: '',
  bg_url_mobile: '',
  bg_opacity: '1',
  glass_opacity: '1', 
  custom_css: '',
  text_color_mode: 'auto'
});

const backgroundStyles = computed(() => {
  const pcUrl = settings.value.bg_url_pc;
  const mobileUrl = settings.value.bg_url_mobile;
  
  const rawBgOp = parseFloat(settings.value.bg_opacity);
  const opacity = isNaN(rawBgOp) ? 0.15 : rawBgOp; 
  const overlayTint = 1.0 - opacity; 
  
  const styles = {}; 

  if (pcUrl) {
    styles['--dynamic-bg-pc'] = `url(${pcUrl})`;
  }
  if (mobileUrl) {
    styles['--dynamic-bg-mobile'] = `url(${mobileUrl})`;
  }

  if (pcUrl || mobileUrl) {
    styles['--dynamic-overlay-color'] = `rgba(0, 0, 0, ${overlayTint})`;
  } else {
    styles['--dynamic-overlay-color'] = 'rgba(0, 0, 0, 0)';
  }

  const rawGlass = settings.value.glass_opacity;
  const rawGlassOp = parseFloat(rawGlass);
  const glassOpacity = isNaN(rawGlassOp) ? 0.7 : rawGlassOp;
  
  styles['--glass-color-rgb'] = '255, 255, 255'; 
  styles['--glass-opacity'] = glassOpacity;
  
  const hoverOpacity = Math.min(glassOpacity + 0.15, 1.0);
  styles['--glass-opacity-hover'] = hoverOpacity;
  
  return styles;
});

const dynamicTextColor = computed(() => {
  const mode = settings.value.text_color_mode || 'auto';
  const op = parseFloat(settings.value.bg_opacity || '1');

  if (mode === 'black') return '#000000';
  if (mode === 'white') return '#ffffff';
  return op <= 0.5 ? '#ffffff' : '#000000';
});

const isDarkOverlay = computed(() => {
  const op = parseFloat(settings.value.bg_opacity || '1');
  return op <= 0.5;
});

const containerStyles = computed(() => {
  return {
    ...backgroundStyles.value,
    '--global-text-color': dynamicTextColor.value
  };
});

const textModeClass = computed(() => {
  const mode = settings.value.text_color_mode || 'auto';
  if (mode === 'white') return 'text-mode-white';
  if (mode === 'black') return 'text-mode-black';
  return 'text-mode-auto';
});

const searchSectionStyle = computed(() => {
  if (!isMobile.value) return {};
  const extraGap = 13;
  return {
    marginTop: menuBarHeight.value > 0 ? `${menuBarHeight.value + extraGap}px` : '70px'
  };
});

const searchEngines = [
  {
    name: 'site',
    label: '站内',
    placeholder: '站内搜索...',
    url: q => `/search?query=${encodeURIComponent(q)}`
  },
  {
    name: 'google',
    label: 'Google',
    placeholder: 'Google 搜索...',
    url: q => `https://www.google.com/search?q=${encodeURIComponent(q)}`
  },
  {
    name: 'baidu',
    label: '百度',
    placeholder: '百度搜索...',
    url: q => `https://www.baidu.com/s?wd=${encodeURIComponent(q)}`
  },
  {
    name: 'bing',
    label: 'Bing',
    placeholder: 'Bing 搜索...',
    url: q => `https://www.bing.com/search?q=${encodeURIComponent(q)}`
  },
  {
    name: 'github',
    label: 'github',
    placeholder: 'GitHub 搜索...',
    url: q => `https://github.com/search?q=${encodeURIComponent(q)}&type=repositories`
  }
];

const selectedEngine = ref(searchEngines[0]); // 现在默认就是“站内”


function selectEngine(engine) {
  selectedEngine.value = engine;
}

function clearSearch() {
  searchQuery.value = '';
  if (isGlobalSearchActive.value) {
    isGlobalSearchActive.value = false;
    if (menus.value.length) {
      selectMenu(menus.value[0]);
    } else {
      cards.value = [];
    }
  }
}

function measureMenuBar() {
  if (!isMobile.value) {
    menuBarHeight.value = 0;
    return;
  }
  if (menuBarContainer.value) {
    menuBarHeight.value = menuBarContainer.value.offsetHeight || 0;
  }
}

const handleResize = () => {
  isMobile.value = window.innerWidth <= 768;
  nextTick(() => {
    measureMenuBar();
  });
};

onMounted(async () => {
  isMobile.value = window.innerWidth <= 768;
  window.addEventListener('resize', handleResize);

  getSettings().then(res => {
    settings.value = { ...settings.value, ...res.data };
  }).catch(err => {
    console.error("加载网站设置失败:", err);
  });
  
  getMenus().then(async res => {
    menus.value = res.data;
    await nextTick();
    measureMenuBar();
    if (menus.value.length) {
      activeMenu.value = menus.value[0];
      loadCards();
    }
  });

  getAds().then(adRes => {
    leftAds.value = adRes.data.filter(ad => ad.position === 'left');
    rightAds.value = adRes.data.filter(ad => ad.position === 'right');
  });
  
  getFriends().then(friendRes => {
    friendLinks.value = friendRes.data;
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
});

watch(
  () => menus.value,
  () => {
    nextTick(() => {
      measureMenuBar();
    });
  },
  { deep: true }
);

watch(() => settings.value.custom_css, (newCss) => {
  const styleId = 'custom-nav-style';
  let styleTag = document.getElementById(styleId);
  
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = styleId;
    document.head.appendChild(styleTag);
  }
  
  styleTag.textContent = newCss || '';
}, {
  immediate: true 
});

async function selectMenu(menu, parentMenu = null) {
  searchQuery.value = '';
  isGlobalSearchActive.value = false;

  if (parentMenu) {
    activeMenu.value = parentMenu;
    activeSubMenu.value = menu;
  } else {
    activeMenu.value = menu;
    activeSubMenu.value = null;
  }
  loadCards();
}

async function loadCards() {
  if (!activeMenu.value) return;

  const cacheKey = activeSubMenu.value 
    ? `submenu-${activeSubMenu.value.id}` 
    : `menu-${activeMenu.value.id}`;

  if (cardsCache.has(cacheKey)) {
    cards.value = cardsCache.get(cacheKey);
    return; 
  }

  try {
    const res = await getCards(activeMenu.value.id, activeSubMenu.value?.id);
    cards.value = res.data;
    cardsCache.set(cacheKey, res.data);
  } catch (error) {
    console.error("加载卡片失败:", error);
    cards.value = []; 
  }
}

function onSearchInput() {
  clearTimeout(debounceTimer); 
  
  if (selectedEngine.value.name === 'site') {
    debounceTimer = setTimeout(() => {
      if (searchQuery.value.trim() === '') {
        clearSearch();
      } else {
        handleSearch(true); 
      }
    }, 300); 
  }
}

async function handleSearch(isRealtime = false) {
  clearTimeout(debounceTimer);

  if (selectedEngine.value.name === 'site') {
    const query = searchQuery.value.trim();
    if (!query) {
      clearSearch();
      return;
    }

    const cacheKey = `search-${query}`;

    if (cardsCache.has(cacheKey)) {
      cards.value = cardsCache.get(cacheKey);
      isGlobalSearchActive.value = true;
      activeMenu.value = null; 
      activeSubMenu.value = null;
      return; 
    }

    try {
      const res = await globalSearchCards(query);
      cards.value = res.data;
      cardsCache.set(cacheKey, res.data);
      
      isGlobalSearchActive.value = true;
      activeMenu.value = null; 
      activeSubMenu.value = null;
    } catch (error) {
      console.error("全局搜索失败:", error);
      if (!isRealtime) {
        alert('搜索失败，请稍后重试。');
      }
    }
  } else {
    if (!searchQuery.value.trim()) return;
    const url = selectedEngine.value.url(searchQuery.value);
    window.open(url, '_blank');
  }
}

function onBlankAreaClick() {
  if (menuBarRef.value) {
    menuBarRef.value.closeAllSubMenus();
  }
}

function handleLogoError(event) {
  event.target.style.display = 'none';
  event.target.nextElementSibling.style.display = 'flex';
}
</script>

<style scoped>
.home-container {
  background-color: transparent;
  min-height: 95vh;
  display: flex;
  flex-direction: column;
  position: relative;
  padding-top: 50px;
  isolation: isolate;
  color: var(--global-text-color, #000);
}

.home-container * {
  color: var(--global-text-color, #000) !important;
}

.home-container::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 100lvh;
  background-image: var(--dynamic-bg-pc);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: -2;
}

.home-container::after {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 100lvh;
  background: var(--dynamic-overlay-color, rgba(0, 0, 0, 0));
  z-index: -1;
}

.menu-bar-fixed {
  position: fixed;
  top: 0;
  padding-top: env(safe-area-inset-top);
  left: 0;
  right: 0;
  width: 100%;
  z-index: 100;
  backdrop-filter: blur(10px);
  background-color: rgba(var(--glass-color-rgb), var(--glass-opacity));
  box-shadow: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
  transition: background-color 0.3s ease;
}

.search-container {
  display: flex;
  align-items: center;
  background: rgba(var(--glass-color-rgb), var(--glass-opacity));
  border-radius: 20px;
  padding: 0.3rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(10px);
  max-width: 480px;
  width: 92%;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.2);
  transition: background-color 0.3s ease;
}

.search-container:hover {
  background: rgba(var(--glass-color-rgb), var(--glass-opacity-hover));
}

.search-engine-select {
  display: flex;
  flex-direction: row;
  align-items: center;
  padding-bottom: .3rem;
  gap: 5px;
  z-index: 2;
  flex-wrap: wrap;
}

.engine-btn {
  border: none;
  background: none;
  font-size: .8rem;
  padding: 2px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: color 0.2s, background 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  text-decoration: none;
}

.engine-btn.active,
.engine-btn:hover {
  background: #eeeeee;
}

/* 后台按钮：不参与 active/hover 的高亮，避免返回时看起来被选中 */
.engine-btn.admin-btn,
.engine-btn.admin-btn:hover,
.engine-btn.admin-btn:active,
.engine-btn.admin-btn:focus {
  background: transparent !important;
  box-shadow: none !important;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  padding: .1rem .5rem;
  font-size: 1.2rem;
  outline: none;
}

.search-input::placeholder {
  color: #888;
}

.clear-btn {
  background: none;
  border: none;
  outline: none;
  cursor: pointer;
  margin-right: 0.2rem;
  display: flex;
  align-items: center;
  padding: 0;
}

.clear-btn svg {
  stroke: #000;
}

.search-btn {
  background: #e9e9eb00;
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.2s;
  margin-right: 0.1rem;
}

.search-btn:hover {
  background: #3367d6;
  color: #ffffff;
}

.search-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.4rem 0;
  position: relative;
  z-index: 2;
}

.search-box-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 480px;
}

.content-wrapper {
  display: flex;
  max-width: 1400px;
  margin: 0 auto;
  gap: 2rem;
  position: relative;
  z-index: 2;
  flex: 1;
  justify-content: space-between;
}

.main-content {
  flex: 1;
  min-width: 0;
}

.ad-space {
  width: 90px;
  min-width: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 0;
  background: transparent;
  margin: 0;
}

.ad-space a {
  width: 100%;
  display: block;
}

.ad-space img {
  width: 100%;
  max-width: 90px;
  max-height: 160px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  background: #fff;
  object-fit: contain;
  margin: 0 auto;
}

.ad-placeholder {
  background: rgba(0, 0, 0, 0.05);
  border: 2px dashed rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  color: rgba(0, 0, 0, 0.4);
  padding: 2rem 1rem;
  text-align: center;
  font-size: 14px;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.footer {
  margin-top: auto;
  text-align: center;
  padding-top: 1rem;
  padding-bottom: 2rem;
  position: relative;
  z-index: 2;
}

.footer-content {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 40px;
}

.friend-link-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  padding: 0;
}

.copyright {
  font-size: 14px;
  margin: 0;
  text-shadow: none;
}

.footer-link {
  text-decoration: none;
  transition: color 0.2s;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.modal-content {
  background: #ffffff;
  border-radius: 16px;
  width: 55rem;
  height: 30rem;
  max-width: 95vw;
  max-height: 95vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9f9ff;
}

.modal-header h3 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
}

.modal-body {
  flex: 1;
  padding: 32px;
  overflow-y: auto;
}

.friend-links-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
}

.friend-link-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px;
  background: #f5f5f5;
  border-radius: 15px;
  text-decoration: none;
  transition: all 0.2s ease;
  border: 1px solid #eee;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.friend-link-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  background: #e9e9e9;
}

.friend-link-logo {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.friend-link-logo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.friend-link-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e5e7eb;
  font-size: 18px;
  font-weight: 600;
  border-radius: 8px;
}

.friend-link-info h4 {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  line-height: 1.3;
  word-break: break-all;
}

:deep(.menu-bar) {
  position: relative;
  z-index: 2;
}

:deep(.card-grid) {
  position: relative;
  z-index: 2;
}

.ad-space-fixed {
  position: fixed;
  top: 13rem;
  z-index: 10;
  width: 90px;
  min-width: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 0;
  background: transparent;
  margin: 0;
}

.left-ad-fixed {
  left: 0;
}

.right-ad-fixed {
  right: 0;
}

.ad-space-fixed a {
  width: 100%;
  display: block;
}

.ad-space-fixed img {
  width: 100%;
  max-width: 90px;
  max-height: 160px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  background: #fff;
  margin: 0 auto;
}

/* 深蒙版时：被选中的搜索引擎文字保持黑色 */
.home-container.is-dark-overlay .engine-btn.active {
  color: #000000 !important;
}

/* 始终白色模式下：被选中的搜索引擎文字保持黑色 */
.home-container.text-mode-white .engine-btn.active {
  color: #000000 !important;
}

/* 深蒙版时：搜索框内文字为白色，placeholder 浅白 */
.home-container.is-dark-overlay .search-input {
  color: #ffffff !important;
}

.home-container.is-dark-overlay .search-input::placeholder {
  color: rgba(255, 255, 255, 0.65) !important;
}

/* 深蒙版时：二级菜单文字保持黑色 */
.home-container.is-dark-overlay :deep(.sub-menu),
.home-container.is-dark-overlay :deep(.sub-menu-item) {
  color: #000000 !important;
}

/* 始终白色模式下：二级菜单文字保持黑色 */
.home-container.text-mode-white :deep(.sub-menu),
.home-container.text-mode-white :deep(.sub-menu-item) {
  color: #000000 !important;
}

@media (max-width: 1200px) {
  .content-wrapper {
    flex-direction: column;
    gap: 1rem;
  }

  .ad-space {
    width: 100%;
    height: 100px;
  }

  .ad-placeholder {
    height: 80px;
  }
}

@media (max-width: 768px) {
  .home-container::before {
    background-image: var(--dynamic-bg-mobile);
  }

  .home-container {
    padding-top: 0;
  }

  .search-section {
    padding-top: 0.4rem;
    padding-bottom: 1.2rem;
  }

  .search-box-wrapper {
    max-width: 420px;
  }

  .content-wrapper {
    gap: 0.5rem;
  }

  .ad-space {
    height: 60px;
  }

  .ad-placeholder {
    height: 50px;
    font-size: 12px;
    padding: 1rem 0.5rem;
  }

  .footer {
    padding-top: 2rem;
  }

  .footer-content {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: nowrap;
    gap: 12px;
    padding: 0 12px;
    width: 100%;
    box-sizing: border-box;
  }

  .friend-link-btn {
    font-size: clamp(8px, 2.9vw, 13px);
  }

  .copyright {
    font-size: clamp(8px, 2.9vw, 13px);
  }

  .friend-links-grid {
    grid-template-columns: repeat(3, 1fr);
  }

  .container {
    width: 95%;
  }
}
</style>
