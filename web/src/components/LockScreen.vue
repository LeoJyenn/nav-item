<template>
  <form class="lock-screen-overlay" @submit.prevent="handleUnlock">
    <div class="lock-card">
      <div class="lock-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <rect x="4" y="10" width="16" height="11" rx="2" stroke="currentColor" stroke-width="2"/>
          <path d="M8 10V7a4 4 0 118 0v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          <circle cx="12" cy="15.5" r="1.5" fill="currentColor"/>
        </svg>
      </div>
      <div class="lock-title">本站已开启访问锁</div>
      <div class="lock-subtitle-flip" :class="{ 'is-error': !!errorMsg }">
        <div class="flip-face flip-front">请输入密码解锁</div>
        <div class="flip-face flip-back">{{ errorMsg || ' ' }}</div>
      </div>
      <div class="lock-input-wrapper">
        <input
          ref="passwordInput"
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          class="lock-input"
          autocomplete="off"
          autocapitalize="off"
          :disabled="verifying"
        />
        <button
          type="button"
          class="toggle-eye"
          @click="showPassword = !showPassword"
          tabindex="-1"
          :aria-label="showPassword ? '隐藏密码' : '显示密码'"
        >
          <svg v-if="!showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/>
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <button type="submit" class="lock-btn" :disabled="verifying || !password">
        {{ verifying ? '验证中...' : '解锁' }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { verifyLockPassword } from '../api';

const emit = defineEmits(['unlocked']);

const password = ref('');
const showPassword = ref(false);
const verifying = ref(false);
const errorMsg = ref('');
const passwordInput = ref(null);
let errorTimer = null;

onMounted(() => {
  // 移动端不自动聚焦，避免弹起键盘；PC 端保持自动聚焦
  if (typeof window !== 'undefined' && window.innerWidth <= 768) return;
  setTimeout(() => {
    if (passwordInput.value) passwordInput.value.focus();
  }, 300);
});

onBeforeUnmount(() => {
  clearTimeout(errorTimer);
});

async function handleUnlock() {
  if (verifying.value || !password.value) return;
  verifying.value = true;
  errorMsg.value = '';
  try {
    const res = await verifyLockPassword(password.value);
    const data = res.data || {};
    password.value = '';

    // 严格校验：仅当服务器确认"处于锁定态且验证通过并签发令牌"时才解锁
    if (data.success && data.locked === true && data.token) {
      sessionStorage.setItem('unlock_token', data.token);
      emit('unlocked', {
        token: data.token,
        idleTimeout: data.idleTimeout || 300
      });
      return;
    }

    // HTTP 200 但服务器声明未锁定（锁屏已被关闭/清除）：
    // 不能盲目解锁，通知父组件重新同步状态
    if (data.locked === false) {
      emit('unlocked', { serverUnlocked: true, idleTimeout: data.idleTimeout || 300 });
      return;
    }

    errorMsg.value = '解锁失败，请稍后再试';
  } catch (e) {
    const msg = e.response && e.response.data && e.response.data.error;
    errorMsg.value = msg === 'lock_required' ? '密码错误' : (msg || '解锁失败，请稍后再试');
    password.value = '';
    clearTimeout(errorTimer);
    errorTimer = setTimeout(() => {
      errorMsg.value = '';
    }, 2000);
    setTimeout(() => {
      if (passwordInput.value) passwordInput.value.focus();
    }, 50);
  } finally {
    verifying.value = false;
  }
}
</script>

<style scoped>
.lock-screen-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.15);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  min-height: 100vh;
  height: 100dvh;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  box-sizing: border-box;
  touch-action: manipulation;
}

.lock-card {
  width: 88%;
  max-width: 340px;
  background: rgba(30, 35, 45, 0.35);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  padding: 28px 24px 24px;
  text-align: center;
  color: #ffffff !important;
  position: relative;
}

.lock-icon {
  color: #ffffff;
  margin-bottom: 10px;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.35));
}

.lock-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
}

.lock-subtitle-flip {
  position: relative;
  height: 20px;
  margin: 6px 0 18px;
  transform-style: preserve-3d;
  transition: transform 0.6s ease;
  perspective: 600px;
}

.lock-subtitle-flip.is-error {
  transform: rotateY(180deg);
}

.flip-face {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  font-size: 0.85rem;
}

.flip-front {
  color: rgba(255, 255, 255, 0.85);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.flip-back {
  transform: rotateY(180deg);
  color: #f87171;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.lock-input-wrapper {
  position: relative;
}

.lock-input {
  width: 100%;
  padding: 11px 44px 11px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  font-size: 1rem;
  outline: none;
  box-sizing: border-box;
  text-align: center;
  letter-spacing: 0.2em;
  color: #ffffff;
  background: rgba(255, 255, 255, 0.12);
}

.lock-input::-ms-reveal,
.lock-input::-ms-clear {
  display: none;
}

.lock-input::placeholder {
  color: rgba(255, 255, 255, 0.45);
  letter-spacing: normal;
}

.lock-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25);
}

.toggle-eye {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.toggle-eye:hover {
  color: rgba(255, 255, 255, 0.9);
}

.lock-btn {
  width: 100%;
  margin-top: 14px;
  padding: 11px 0;
  border: none;
  border-radius: 10px;
  background: #2563eb;
  color: #ffffff;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.lock-btn:hover:not(:disabled) {
  background: #1d4ed8;
}

.lock-btn:disabled {
  opacity: 0.55;
  cursor: default;
}

@media (max-width: 480px) {
  .lock-card {
    padding: 24px 18px 20px;
  }
}
</style>
