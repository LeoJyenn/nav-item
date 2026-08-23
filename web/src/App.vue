<template>
  <router-view/>
</template>

<script setup>
import { onMounted } from 'vue';

// iOS 添加到主屏幕(standalone)检测：启用灵动岛/安全区沉浸式玻璃条
onMounted(() => {
  const isIOS = /iP(ad|hone|od)/.test(window.navigator.userAgent);
  const isStandalone =
    window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;
  if (isIOS && isStandalone) {
    document.body.classList.add('ios-standalone');
  }
});
</script>
