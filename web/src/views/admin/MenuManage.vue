<template>
  <div class="menu-manage">
    <div class="menu-header">
      <div class="header-content">
        <h2 class="page-title">管理主菜单和子菜单</h2>
      </div>
      <div class="menu-add">
        <input v-model="newMenuName" placeholder="请输入主菜单名称" class="input" />
        <button class="btn btn-primary" @click="addMenu">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          添加主菜单
        </button>
      </div>
    </div>
    
    <div class="menu-content">
      <div class="menu-list">
        <div v-for="menu in menus" :key="menu.id" class="menu-item">
          <div class="main-menu">
            <div class="menu-info">
              <div class="menu-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 3h18v18H3zM9 9h6v6H9z"/>
                </svg>
              </div>
              <input v-model="menu.name" @blur="updateMenu(menu)" class="menu-name-input" />
              <div class="menu-order">
                <span class="order-label">排序</span>
                <input v-model.number="menu.order" type="number" @blur="updateMenu(menu)" class="order-input" />
              </div>
            </div>
            <div class="menu-actions">
              <button class="btn btn-icon expand-btn" @click="toggleSubMenu(menu.id)" :title="menu.showSubMenu ? '收起子菜单' : '展开子菜单'">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </button>
              <button class="btn btn-danger btn-icon" @click="deleteMenu(menu.id)" title="删除主菜单">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                  <path d="M10 11v6M14 11v6"/>
                </svg>
              </button>
            </div>
          </div>
          
          <div class="sub-menu-section" :class="{ 'expanded': menu.showSubMenu }">
            <div class="sub-menu-header">
              <div class="sub-menu-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 11H1l8-8 8 8h-8v8z"/>
                </svg>
                子菜单 ({{ menu.subMenus?.length || 0 }})
              </div>
              <button class="btn btn-sm btn-outline" @click="addSubMenu(menu.id)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                添加子菜单
              </button>
            </div>
            
            <div class="sub-menu-list" v-if="menu.subMenus && menu.subMenus.length > 0">
              <div v-for="subMenu in menu.subMenus" :key="subMenu.id" class="sub-menu-item">
                <div class="sub-menu-info">
                  <div class="sub-menu-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                  </div>
                  <input v-model="subMenu.name" @blur="updateSubMenu(subMenu)" class="sub-menu-name-input" />
                  <div class="sub-menu-order">
                    <input v-model.number="subMenu.order" type="number" @blur="updateSubMenu(subMenu)" class="order-input" />
                  </div>
                </div>
                <div class="sub-menu-actions">
                  <button class="btn btn-danger btn-icon btn-sm" @click="deleteSubMenu(subMenu.id)" title="删除子菜单">
                    <svg width="14" height="14" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                      <path d="M10 11v6M14 11v6"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
            <div v-else class="empty-sub-menu">
              <p>暂无子菜单</p>
              <button class="btn btn-sm btn-outline" @click="addSubMenu(menu.id)">添加第一个子菜单</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { 
  getMenus, 
  addMenu as apiAddMenu, 
  updateMenu as apiUpdateMenu, 
  deleteMenu as apiDeleteMenu,
  addSubMenu as apiAddSubMenu,
  updateSubMenu as apiUpdateSubMenu,
  deleteSubMenu as apiDeleteSubMenu
} from '../../api';

const menus = ref([]);
const newMenuName = ref('');

onMounted(loadMenus);

async function loadMenus() {
  const res = await getMenus();
  const oldMenus = menus.value || [];
  menus.value = res.data.map(menu => {
    const old = oldMenus.find(m => m.id === menu.id);
    return {
      ...menu,
      showSubMenu: old ? !!old.showSubMenu : false
    };
  });
}

async function addMenu() {
  if (!newMenuName.value.trim()) return;
  const maxOrder = menus.value.length
    ? Math.max(...menus.value.map(m => m.order || 0))
    : 0;
  await apiAddMenu({ name: newMenuName.value.trim(), order: maxOrder + 1 });
  newMenuName.value = '';
  loadMenus();
}

async function updateMenu(menu) {
  await apiUpdateMenu(menu.id, { name: menu.name, order: menu.order });
  loadMenus();
}

async function deleteMenu(id) {
  if (!confirm('确定要删除这个主菜单吗？删除后将同时删除其下的所有子菜单和卡片。')) return;
  await apiDeleteMenu(id);
  loadMenus();
}

async function addSubMenu(menuId) {
  const menu = menus.value.find(m => m.id === menuId);
  const subMenuName = prompt('请输入子菜单名称：');
  if (!subMenuName?.trim()) return;
  
  const maxOrder = menu.subMenus?.length
    ? Math.max(...menu.subMenus.map(sm => sm.order || 0))
    : 0;
    
  await apiAddSubMenu(menuId, { name: subMenuName.trim(), order: maxOrder + 1 });
  loadMenus();
}

async function updateSubMenu(subMenu) {
  await apiUpdateSubMenu(subMenu.id, { name: subMenu.name, order: subMenu.order });
  loadMenus();
}

async function deleteSubMenu(id) {
  if (!confirm('确定要删除这个子菜单吗？删除后将同时删除其下的所有卡片。')) return;
  await apiDeleteSubMenu(id);
  loadMenus();
}

function toggleSubMenu(menuId) {
  const menu = menus.value.find(m => m.id === menuId);
  if (menu) {
    menu.showSubMenu = !menu.showSubMenu;
  }
}
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.menu-manage {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 8px;
  overflow-x: hidden;
}

.menu-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  padding: 24px 20px;
  margin-bottom: 16px;
  color: white;
  box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
  width: 100%;
  text-align: center;
}

.header-content {
  margin-bottom: 12px;
  text-align: center;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 6px 0;
  letter-spacing: -0.5px;
}

.menu-add {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: center;
  width: 100%;
}

.menu-content {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  width: 100%;
}

.menu-list {
  padding: 0;
}

.menu-item {
  border-bottom: 1px solid #f1f5f9;
  transition: all 0.3s ease;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:hover {
  background: #f8fafc;
}

.main-menu {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: white;
  transition: all 0.3s ease;
  width: 100%;
}

.menu-info {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 0;
}

.menu-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.menu-name-input {
  font-size: 1.05rem;
  font-weight: 600;
  border: 2px solid transparent;
  background: transparent;
  padding: 6px 10px;
  border-radius: 8px;
  color: #1e293b;
  width: 100%;
  max-width: 100%;
  transition: all 0.2s ease;
}

.menu-name-input:focus {
  outline: none;
  border-color: #667eea;
  background: #f8fafc;
}

.menu-order {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.order-label {
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 500;
}

.order-input {
  width: 60px;
  padding: 5px 6px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  text-align: center;
  font-size: 0.9rem;
}

.order-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.menu-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.sub-menu-section {
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  max-height: 0;
  overflow: hidden;
  transition: all 0.3s ease;
}

.sub-menu-section.expanded {
  max-height: 1000px;
}

.sub-menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 24px;
  background: #f1f5f9;
  border-bottom: 1px solid #e2e8f0;
}

.sub-menu-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #475569;
  font-size: 0.95rem;
}

.sub-menu-list {
  padding: 14px 24px 14px 40px;
  position: relative;
}

.sub-menu-list::before {
  content: '';
  position: absolute;
  left: 24px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, #e2e8f0, #cbd5e1);
  border-radius: 1px;
}

.sub-menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background: white;
  border-radius: 12px;
  margin-bottom: 5px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #e2e8f0;
  transition: all 0.2s ease;
  position: relative;
  width: 100%;
}

.sub-menu-item::before {
  content: '';
  position: absolute;
  left: -14px;
  top: 50%;
  width: 10px;
  height: 2px;
  background: #cbd5e1;
  transform: translateY(-50%);
  border-radius: 1px;
}

.sub-menu-item:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.sub-menu-item:last-child {
  margin-bottom: 0;
}

.sub-menu-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.sub-menu-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
}

.sub-menu-name-input {
  font-size: 0.95rem;
  border: 2px solid transparent;
  background: transparent;
  padding: 5px 8px;
  border-radius: 6px;
  color: #374151;
  width: 100%;
  max-width: 100%;
  transition: all 0.2s ease;
}

.sub-menu-name-input:focus {
  outline: none;
  border-color: #10b981;
  background: #f0fdf4;
}

.sub-menu-order {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.sub-menu-actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.empty-sub-menu {
  padding: 10px 0;
  text-align: center;
  color: #64748b;
}

.empty-sub-menu p {
  color: #079f1e;
  margin: 0 0 12px 0;
  font-size: 0.95rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.btn-primary {
  background: linear-gradient(82deg, #667eea, #2f025d);
  color: white;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-outline {
  background: transparent;
  color: #667eea;
  border: 2px solid #667eea;
}

.btn-outline:hover {
  background: #667eea;
  color: white;
}

.btn-danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.btn-danger:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
}

.btn-icon {
  width: 34px;
  height: 34px;
  padding: 0;
  justify-content: center;
  border-radius: 8px;
}

.btn-icon.expand-btn {
  width: 34px;
  height: 34px;
}

.btn-sm {
  padding: 6px 10px;
  font-size: 0.8rem;
}

.btn-icon.btn-sm {
  width: 30px;
  height: 28px;
}

.input {
  padding: 10px 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.95rem;
  background: white;
  color: #1e293b;
  transition: all 0.2s ease;
  width: 100%;
  max-width: 420px;
}

.input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.input::placeholder {
  color: #94a3b8;
}

@media (max-width: 768px) {
  .menu-manage {
    padding: 10px 6px;
  }
  
  .menu-header {
    padding: 18px 12px;
    margin-bottom: 10px;
    border-radius: 12px;
  }
  
  .page-title {
    font-size: 1.2rem;
  }
  
  .menu-add {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }
  
  .input {
    width: 100%;
    max-width: 100%;
    padding: 8px 10px;
    font-size: 0.9rem;
  }
  
  .menu-content {
    border-radius: 12px;
    box-shadow: 0 2px 10px rgba(15, 23, 42, 0.08);
  }
  
  .main-menu {
    padding: 12px 10px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    column-gap: 8px;
    row-gap: 8px;
  }
  
  .menu-info {
    gap: 8px;
  }
  
  .menu-icon {
    width: 30px;
    height: 30px;
    border-radius: 10px;
  }
  
  .menu-name-input {
    font-size: 0.9rem;
    padding: 4px 6px;
  }
  
  .menu-order {
    gap: 4px;
  }
  
  .order-label {
    font-size: 0.75rem;
  }
  
  .order-input {
    width: 48px;
    padding: 3px 4px;
    font-size: 0.8rem;
  }
  
  .menu-actions {
    justify-content: flex-end;
    gap: 6px;
  }
  
  .btn {
    padding: 6px 8px;
    font-size: 0.8rem;
  }
  
  .btn-icon {
    width: 28px;
    height: 28px;
  }
  
  .btn-icon.expand-btn {
    width: 28px;
    height: 28px;
  }
  
  .sub-menu-header {
    padding: 8px 10px;
  }
  
  .sub-menu-title {
    font-size: 0.85rem;
  }
  
  .sub-menu-list {
    padding: 8px 10px 8px 24px;
  }
  
  .sub-menu-list::before {
    left: 16px;
  }
  
  .sub-menu-item::before {
    left: -8px;
    width: 6px;
  }
  
  .sub-menu-item {
    padding: 8px 8px;
    margin-bottom: 6px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    column-gap: 6px;
    align-items: center;
  }
  
  .sub-menu-info {
    gap: 6px;
  }
  
  .sub-menu-icon {
    width: 24px;
    height: 24px;
  }
  
  .sub-menu-name-input {
    font-size: 0.85rem;
    padding: 3px 4px;
  }
  
  .sub-menu-order {
    justify-content: flex-start;
  }
  
  .sub-menu-actions {
    justify-content: flex-end;
  }
  
  .btn-icon.btn-sm {
    width: 26px;
    height: 26px;
  }
  
  .empty-sub-menu {
    padding: 8px 0;
  }
}
</style>
