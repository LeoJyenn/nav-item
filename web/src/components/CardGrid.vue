<template>
  <div
    ref="containerRef"
    :class="['container card-grid', { 'animate-cardEnter': enableAnimation, 'no-anim': !enableAnimation }]"
    :key="animationKey"
  >
    <div
      v-if="isVirtualEnabled && spacerTopHeight > 0"
      class="virtual-spacer"
      :style="{ height: `${spacerTopHeight}px` }"
    ></div>
    <div
      v-for="(card, index) in visibleCards"
      :key="card.id"
      class="link-item"
      :style="getCardStyle(visibleStart + index)"
    >
      <a
        :href="card.url"
        target="_blank"
        :title="getTooltip(card)"
        @click.prevent="handleClick(card.url)"
      >
        <img
          class="link-icon"
          :src="getLogo(card)"
          alt=""
          @error="onImgError($event, card)"
          loading="lazy"
          decoding="async"
          fetchpriority="low"
        >
        <span class="link-text">{{ truncate(card.title) }}</span>
        <span class="link-desc">{{ getDesc(card) }}</span>
      </a>
    </div>
    <div
      v-if="isVirtualEnabled && spacerBottomHeight > 0"
      class="virtual-spacer"
      :style="{ height: `${spacerBottomHeight}px` }"
    ></div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';

const props = defineProps({
  cards: {
    type: Array,
    default: () => []
  },
  enableAnimation: {
    type: Boolean,
    default: true
  }
});

const animationKey = ref(0);
const containerRef = ref(null);
const rowHeight = ref(0);
const columns = ref(7);
const visibleRange = ref({ start: 0, end: 0, startRow: 0, endRow: 0 });
const VIRTUALIZATION_THRESHOLD = 60;
const BUFFER_ROWS = 2;
let scrollRaf = 0;

const isVirtualEnabled = computed(() => props.cards.length > VIRTUALIZATION_THRESHOLD);
const visibleStart = computed(() => visibleRange.value.start);
const visibleCards = computed(() => {
  if (!isVirtualEnabled.value) return props.cards;
  return props.cards.slice(visibleRange.value.start, visibleRange.value.end);
});
const spacerTopHeight = computed(() => visibleRange.value.startRow * rowHeight.value);
const spacerBottomHeight = computed(() => {
  if (!isVirtualEnabled.value) return 0;
  const totalRows = Math.ceil(props.cards.length / columns.value) || 0;
  const hiddenRows = totalRows - visibleRange.value.endRow;
  return Math.max(0, hiddenRows * rowHeight.value);
});

watch(
  () => props.cards,
  (newCards, oldCards) => {
    if (!newCards) return;
    if (newCards.length === 0) return;
    const newSignature = getCardsSignature(newCards);
    const oldSignature = oldCards ? getCardsSignature(oldCards) : '';
    if (props.enableAnimation && (!oldCards || oldSignature !== newSignature)) {
      animationKey.value += 1;
    }
    nextTick(() => {
      measureRowHeight();
      updateVisibleRange();
    });
  },
  { deep: true }
);

onMounted(() => {
  updateColumns();
  nextTick(() => {
    measureRowHeight();
    updateVisibleRange();
  });
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleResize, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll);
  window.removeEventListener('resize', handleResize);
  if (scrollRaf) {
    cancelAnimationFrame(scrollRaf);
    scrollRaf = 0;
  }
});

function handleScroll() {
  if (!isVirtualEnabled.value) return;
  if (scrollRaf) return;
  scrollRaf = requestAnimationFrame(() => {
    scrollRaf = 0;
    updateVisibleRange();
  });
}

function handleResize() {
  updateColumns();
  nextTick(() => {
    measureRowHeight();
    updateVisibleRange();
  });
}

function updateColumns() {
  if (typeof window === 'undefined') return;
  const width = window.innerWidth || 1200;
  if (width <= 480) {
    columns.value = 3;
  } else if (width <= 768) {
    columns.value = 3;
  } else if (width <= 1200) {
    columns.value = 4;
  } else {
    columns.value = 7;
  }
}

function measureRowHeight() {
  if (!containerRef.value) return;
  const item = containerRef.value.querySelector('.link-item');
  if (!item) return;
  const itemRect = item.getBoundingClientRect();
  const containerStyles = window.getComputedStyle(containerRef.value);
  const gap = parseFloat(containerStyles.rowGap || containerStyles.gap || '0');
  rowHeight.value = Math.max(1, itemRect.height + gap);
}

function updateVisibleRange() {
  if (!isVirtualEnabled.value) {
    visibleRange.value = {
      start: 0,
      end: props.cards.length,
      startRow: 0,
      endRow: Math.ceil(props.cards.length / columns.value)
    };
    return;
  }
  if (!containerRef.value) return;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
  const containerTop = containerRef.value.getBoundingClientRect().top + scrollTop;
  const rowSize = rowHeight.value || 130;
  const viewportHeight = window.innerHeight || 800;
  const totalRows = Math.ceil(props.cards.length / columns.value) || 0;
  const startRow = Math.max(0, Math.floor((scrollTop - containerTop) / rowSize) - BUFFER_ROWS);
  const visibleRows = Math.ceil(viewportHeight / rowSize) + BUFFER_ROWS * 2;
  const endRow = Math.min(totalRows, startRow + visibleRows);
  const startIndex = Math.max(0, startRow * columns.value);
  const endIndex = Math.min(props.cards.length, endRow * columns.value);
  visibleRange.value = {
    start: startIndex,
    end: endIndex,
    startRow,
    endRow
  };
}

function getCardStyle(index) {
  if (!props.cards || !props.cards.length) return {};
  if (!props.enableAnimation) {
    return {
      opacity: 1,
      animation: 'none'
    };
  }

  const animationLimit = 16;
  if (index >= animationLimit) {
    return {
      opacity: 1,
      animation: 'none'
    };
  }

  const delay = Math.min(index, 20) * 30;
  if (delay <= 0) return { opacity: 1 };

  return {
    animationDelay: `${delay}ms`
  };
}

function handleClick(url) {
  if (typeof window !== 'undefined') {
    window.open(url, '_blank');
  }
}

function getLogo(card) {
  if (card.custom_logo_path) return '/uploads/' + card.custom_logo_path;
  if (card.logo_url) return card.logo_url;
  try {
    const url = new URL(card.url);
    return url.origin + '/favicon.ico';
  } catch {
    return '/icon.png';
  }
}

function onImgError(e, card) {
  if (e.target.dataset.fallbackApplied) {
    e.target.style.display = 'none';
    return;
  }
  e.target.dataset.fallbackApplied = '1';
  e.target.src = '/icon.png';
}

function getTooltip(card) {
  return card.url || card.title || '';
}

function getCardsSignature(list) {
  if (!list || list.length === 0) return '';
  const first = list[0];
  const last = list[list.length - 1];
  const firstKey = first?.id ?? first?.title ?? '';
  const lastKey = last?.id ?? last?.title ?? '';
  return `${list.length}-${firstKey}-${lastKey}`;
}

function getDesc(card) {
  if (!card) return '暂无描述';
  return card.desc || '暂无描述';
}

function truncate(str) {
  if (!str) return '';
  return str.length > 20 ? str.slice(0, 20) + '...' : str;
}
</script>

<style scoped>
.container {
  max-width: 70rem;
  margin: 0 auto;
  width: 100%;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 15px;
  opacity: 1;
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000;
  content-visibility: auto;
  contain-intrinsic-size: 720px 520px;
}

@media (max-width: 1200px) {
  .container {
    grid-template-columns: repeat(4, 1fr);
  }
}
@media (max-width: 768px) {
  .container {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 480px) {
  .container {
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
  }
}

.link-item {
  background-color: rgba(var(--glass-color-rgb, 255, 255, 255), var(--glass-opacity, 0.6));
  backdrop-filter: var(--glass-card-filter, blur(8px));
  -webkit-backdrop-filter: var(--glass-card-filter, blur(8px));
  border-radius: 15px;
  padding: 0;
  transition: transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    box-shadow 0.25s ease,
    background-color 0.25s ease,
    border-color 0.25s ease,
    opacity 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  text-align: center;
  min-height: 110px;
  height: auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.25);
  opacity: 0;
  transform: translateZ(0);
  backface-visibility: hidden;
  will-change: transform, opacity;
  contain: content;
}

@media (max-width: 480px) {
  .link-item {
    min-height: 95px;
    height: auto;
  }
}

@media (hover: hover) and (pointer: fine) {
  .link-item:hover {
    background-color: rgba(var(--glass-color-rgb, 255, 255, 255), var(--glass-opacity-hover, 0.75));
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

@supports not ((-webkit-backdrop-filter: blur(1px)) or (backdrop-filter: blur(1px))) {
  .link-item {
    background-color: rgba(var(--glass-color-rgb, 255, 255, 255), var(--glass-fallback-opacity, 0.88));
    border-color: rgba(255, 255, 255, 0.6);
  }

  @media (hover: hover) and (pointer: fine) {
    .link-item:hover {
      background-color: rgba(var(--glass-color-rgb, 255, 255, 255), var(--glass-fallback-opacity-hover, 0.95));
    }
  }
}

.link-item a {
  text-decoration: none;
  color: #000;
  font-weight: 500;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 8px 6px 10px;
  gap: 1px;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
}

.link-icon {
  width: 22px;
  height: 22px;
  margin: 4px auto;
  object-fit: contain;
  aspect-ratio: 1 / 1;
  display: block;
}

@media (max-width: 480px) {
  .link-icon {
    width: 20px;
    height: 20px;
  }
}

.link-text {
  padding-right: 4px;
  padding-left: 4px;
  font-size: 14px;
  text-align: center;
  word-break: break-all;
  max-width: 100%;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  line-height: 1.2;
  min-height: 2.4em;
}

.link-desc {
  padding: 0 6px;
  font-size: 12px;
  text-align: center;
  max-width: 100%;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  line-height: 1.15;
  min-height: 2.2em;
  opacity: 0.7;
}

@media (max-width: 480px) {
  .link-text {
    font-size: 13px;
  }

  .link-desc {
    font-size: 11px;
  }
}

.animate-cardEnter .link-item {
  animation: cardEnter 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
  transform: translateZ(0);
}

.no-anim .link-item {
  animation: none;
  opacity: 1;
  transform: none;
}

.virtual-spacer {
  grid-column: 1 / -1;
}


@keyframes cardEnter {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .animate-cardEnter .link-item {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
</style>
