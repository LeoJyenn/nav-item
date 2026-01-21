<template>
  <nav class="menu-bar" @click.stop>
    <div 
      v-for="menu in menus" 
      :key="menu.id" 
      class="menu-item"
      @mouseleave="hideSubMenu(menu.id)"
    >
      <button 
        @click="handleParentClick(menu)" 
        :class="{active: menu.id === activeId}"
      >
        {{ menu.name }}
      </button>
      
      <div 
        v-if="menu.subMenus && menu.subMenus.length > 0" 
        class="sub-menu"
        :class="{ 'show': hoveredMenuId === menu.id }"
      >
        <button 
          v-for="subMenu in menu.subMenus" 
          :key="subMenu.id"
          @click="handleSubMenuClick(subMenu, menu)"
          :class="{active: subMenu.id === activeSubMenuId}"
          class="sub-menu-item"
        >
          {{ subMenu.name }}
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, defineEmits, defineExpose } from 'vue';

const props = defineProps({ 
  menus: Array, 
  activeId: Number,
  activeSubMenuId: Number 
});

const emit = defineEmits(['select']);

const hoveredMenuId = ref(null);

function showSubMenu(menuId) {
  hoveredMenuId.value = menuId;
}

function hideSubMenu(menuId) {
  setTimeout(() => {
    if (hoveredMenuId.value === menuId) {
      hoveredMenuId.value = null;
    }
  }, 100);
}

function handleParentClick(menu) {
  const hasSubMenu = menu.subMenus && menu.subMenus.length > 0;
  emit('select', menu); 
  if (hasSubMenu) {
    showSubMenu(menu.id);
  }
}

function handleSubMenuClick(subMenu, menu) {
  emit('select', subMenu, menu);
  hoveredMenuId.value = null;
}

function closeAllSubMenus() {
  hoveredMenuId.value = null;
}

defineExpose({
  closeAllSubMenus
});
</script>

<style scoped>
.menu-bar {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  padding: 0 1rem;
  position: relative;
}

.menu-item {
  position: relative;
}

.menu-bar button {
  background: transparent;
  border: none;
  color: #000;
  font-size: 16px;
  font-weight: 500;
  padding: 0.8rem 2rem;
  cursor: pointer;
  /* 优化：只过渡 color */
  transition: color 0.3s ease;
  text-shadow: none;
  box-shadow: none;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.menu-bar button::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 60%;
  height: 2px;
  background: #399dff;
  /* 优化：使用 transform 替代 width 动画 */
  transition: transform 0.3s ease;
  transform: translateX(-50%) scaleX(0); 
  transform-origin: center;
}

.menu-bar button:hover {
  color: #399dff;
}

.menu-bar button.active {
  color: #399dff;
}

.menu-bar button.active::before {
  transform: translateX(-50%) scaleX(1);
}

/* 二级菜单样式 */
.sub-menu {
  position: absolute;
  top: 100%;
  left: 50%;
  background: rgba(255, 255, 255, 0.90); 
  backdrop-filter: blur(12px); 
  border-radius: 6px;
  min-width: 120px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(0, 0, 0, 0.1);
  margin-top: -2px; 
  
  /* 优化：动画初始状态 */
  opacity: 0;
  visibility: hidden;
  transform: translateX(-50%) translateY(-5px); 

  /* 优化：GPU 加速 */
  will-change: opacity, transform;
  
  /* 优化：只过渡需要的属性 */
  transition: opacity 0.2s ease, transform 0.2s ease, visibility 0.2s ease;
  z-index: 1000;
}

.sub-menu.show {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(2px); 
}

.sub-menu-item {
  display: block !important;
  width: 100% !important;
  text-align: center !important;
  padding: 0.4rem 1rem !important;
  border: none !important;
  background: transparent !important;
  color: #000 !important;
  font-size: 14px !important;
  font-weight: 400 !important;
  cursor: pointer !important;
  border-radius: 0 !important;
  text-shadow: none !important;
  line-height: 1.5 !important;
  
  /* 优化：只过渡需要的属性 */
  transition: background 0.2s ease, color 0.2s ease !important;
}

.sub-menu-item:hover {
  background: rgba(57, 157, 255, 0.6) !important; 
  color: #fff !important; 
  transform: none !important;
}

.sub-menu-item.active {
  background: rgba(57, 157, 255, 0.75) !important; 
  color: #fff !important; 
  font-weight: 500 !important;
}

.sub-menu-item::before {
  display: none;
}

@media (max-width: 768px) {
  .menu-bar {
    gap: 0.2rem;
  }
  
  .menu-bar button {
    font-size: 15px;
    padding: .4rem .8rem;
  }
  
  .sub-menu {
    min-width: 100px;
  }
  
  .sub-menu-item {
    /* 手机端字体大小 */
    font-size: 11px !important; 
    padding: 0.2rem 0.8rem !important;
  }
}
</style>
