<template>
  <div class="site-settings">
    <div class="settings-header">
      <div class="header-content">
        <h2 class="page-title">外观设置</h2>
        <p class="page-subtitle">配置首页背景、文字颜色和自定义代码</p>
      </div>
    </div>

    <div class="settings-card">
      <div class="form-row">
        <label class="form-label">PC 端背景图片地址</label>
        <input
          v-model="form.bg_url_pc"
          type="text"
          class="input"
          placeholder="例如：https://example.com/bg-pc.jpg"
        />
      </div>

      <div class="form-row">
        <label class="form-label">移动端背景图片地址</label>
        <input
          v-model="form.bg_url_mobile"
          type="text"
          class="input"
          placeholder="例如：https://example.com/bg-mobile.jpg"
        />
      </div>

      <div class="form-row">
        <label class="form-label">背景蒙版透明度（0 - 1）</label>
        <div class="range-row">
          <input
            v-model.number="form.bg_opacity"
            type="range"
            min="0"
            max="1"
            step="0.01"
            class="range-input"
          />
          <span class="range-value">{{ form.bg_opacity.toFixed(2) }}</span>
        </div>
      </div>

      <div class="form-row">
        <label class="form-label">卡片毛玻璃强度（0 - 1）</label>
        <div class="range-row">
          <input
            v-model.number="form.glass_opacity"
            type="range"
            min="0"
            max="1"
            step="0.01"
            class="range-input"
          />
          <span class="range-value">{{ form.glass_opacity.toFixed(2) }}</span>
        </div>
      </div>

      <div class="form-row preview-row">
        <label class="form-label">实时预览</label>
        <div class="preview-panel" :style="previewPanelStyles">
          <div class="preview-overlay" :style="previewOverlayStyles"></div>
          <div class="preview-menu" :style="previewMenuStyles">导航栏</div>
          <div class="preview-card" :style="previewCardStyles">
            <div class="preview-card-title">卡片预览</div>
            <div class="preview-card-subtitle">毛玻璃强度随滑动变化</div>
          </div>
        </div>
      </div>

      <div class="form-row">
        <label class="form-label">字体颜色模式</label>
        <select v-model="form.text_color_mode" class="select">
          <option value="black">黑色</option>
          <option value="white">白色</option>
        </select>
      </div>

      <div class="form-row">
        <label class="form-label">自定义代码（HTML / CSS / JS）</label>
        <textarea
          v-model="form.custom_code"
          class="textarea"
          rows="10"
        ></textarea>
      </div>

      <div class="form-actions">
        <button class="btn primary" @click="handleSave" :disabled="saving">
          {{ saving ? '保存中...' : '保存设置' }}
        </button>
        <span v-if="message" class="save-message">{{ message }}</span>
      </div>
    </div>

    <div class="settings-card lock-settings-card">
      <h3 class="lock-section-title">锁屏密码</h3>
      <p class="lock-section-desc">开启后，访客打开主页需输入密码才能查看内容；空闲超时或修改密码后会自动重新上锁。</p>

      <div class="form-row switch-row">
        <label class="form-label">启用锁屏</label>
        <button
          type="button"
          :class="['switch', { on: lockForm.enabled }]"
          @click="lockForm.enabled = !lockForm.enabled"
        >
          <span class="switch-knob"></span>
        </button>
      </div>

      <div class="form-row">
        <label class="form-label">空闲自动锁定（秒，10 - 86400）</label>
        <input v-model.number="lockForm.idleTimeout" type="number" min="10" max="86400" class="input" />
      </div>

      <div class="form-row" v-if="hasLockPassword">
        <label class="form-label">当前密码（修改密码时必填）</label>
        <input v-model="lockForm.currentPassword" type="password" class="input" autocomplete="off" />
      </div>

      <div class="form-row">
        <label class="form-label">{{ hasLockPassword ? '新密码（留空则不修改）' : '设置锁屏密码' }}</label>
        <input v-model="lockForm.newPassword" type="password" class="input" autocomplete="new-password" placeholder="至少 4 位" />
      </div>

      <div class="form-actions">
        <button class="btn primary" @click="handleSaveLock" :disabled="savingLock">
          {{ savingLock ? '保存中...' : '保存锁屏设置' }}
        </button>
        <span v-if="lockMessage" :class="['save-message', { 'save-error': !lockSuccess }]">{{ lockMessage }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { getSettings, updateSettings, updateLockConfig, getLockStatus } from '../../api';

const form = ref({
  bg_url_pc: '',
  bg_url_mobile: '',
  bg_opacity: 0.3,
  glass_opacity: 1,
  text_color_mode: 'black',
  custom_code: ''
});

const saving = ref(false);
const message = ref('');

const lockForm = ref({
  enabled: false,
  idleTimeout: 300,
  currentPassword: '',
  newPassword: ''
});
const hasLockPassword = ref(false);
const savingLock = ref(false);
const lockMessage = ref('');
const lockSuccess = ref(true);
const PREVIEW_CARD_BLUR_MAX = 10;
const PREVIEW_MENU_BLUR_MAX = 12;
const PREVIEW_GLASS_ALPHA_FIXED = 0;
const PREVIEW_GLASS_ALPHA_HOVER = 0;
const PREVIEW_SOFT_START = 0.04;
const PREVIEW_SOFT_VALUE = 0.12;
const PREVIEW_EASE_POWER = 1;

const previewBgUrl = computed(() => form.value.bg_url_mobile || form.value.bg_url_pc || '');

const clamp01 = (value) => {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
};

const smoothStrength = (value) => {
  const clamped = clamp01(value);
  if (clamped === 0) return 0;
  if (clamped <= PREVIEW_SOFT_START) {
    return (clamped / PREVIEW_SOFT_START) * PREVIEW_SOFT_VALUE;
  }
  const rest = (clamped - PREVIEW_SOFT_START) / (1 - PREVIEW_SOFT_START);
  return PREVIEW_SOFT_VALUE + Math.pow(rest, PREVIEW_EASE_POWER) * (1 - PREVIEW_SOFT_VALUE);
};

const previewOverlayOpacity = computed(() => smoothStrength(Number(form.value.bg_opacity)));
const previewGlassStrength = computed(() => smoothStrength(Number(form.value.glass_opacity)));

const previewPanelStyles = computed(() => {
  const url = previewBgUrl.value;
  if (!url) {
    return {
      backgroundImage: 'linear-gradient(135deg, #dbeafe 0%, #f8fafc 60%, #e0f2fe 100%)'
    };
  }
  return {
    backgroundImage: `url(${url})`
  };
});

const previewOverlayStyles = computed(() => ({
  background: `rgba(0, 0, 0, ${previewOverlayOpacity.value})`
}));

const previewMenuStyles = computed(() => {
  const strength = previewGlassStrength.value;
  const blur = (strength * PREVIEW_MENU_BLUR_MAX).toFixed(2);
  const filterValue = strength === 0 ? 'none' : `blur(${blur}px)`;
  const alpha = strength === 0 ? 0 : PREVIEW_GLASS_ALPHA_FIXED;
  return {
    background: `rgba(255, 255, 255, ${alpha})`,
    backdropFilter: filterValue,
    WebkitBackdropFilter: filterValue
  };
});

const previewCardStyles = computed(() => {
  const strength = previewGlassStrength.value;
  const blur = (strength * PREVIEW_CARD_BLUR_MAX).toFixed(2);
  const filterValue = strength === 0 ? 'none' : `blur(${blur}px)`;
  const alpha = strength === 0 ? 0 : PREVIEW_GLASS_ALPHA_FIXED;
  return {
    background: `rgba(255, 255, 255, ${alpha})`,
    backdropFilter: filterValue,
    WebkitBackdropFilter: filterValue
  };
});

onMounted(async () => {
  try {
    const res = await getSettings();
    const data = res.data || {};

    // 登录态却收到"匿名形态"数据（无任何 lock_ 字段）→ 令牌已过期，
    // 不能用缺失数据污染表单，走重新登录流程
    const hasToken = !!localStorage.getItem('token');
    if (hasToken && data.lock_enabled === undefined) {
      localStorage.removeItem('token');
      sessionStorage.setItem('loginError', '登录已过期，请重新登录');
      window.location.href = '/admin';
      return;
    }

    form.value.bg_url_pc = data.bg_url_pc || '';
    form.value.bg_url_mobile = data.bg_url_mobile || '';
    form.value.text_color_mode = data.text_color_mode || 'black';

    const bgOp = parseFloat(data.bg_opacity);
    form.value.bg_opacity = isNaN(bgOp) ? 0.3 : bgOp;

    const glassOp = parseFloat(data.glass_opacity);
    form.value.glass_opacity = isNaN(glassOp) ? 1 : glassOp;

    form.value.custom_code = data.custom_code || '';

    lockForm.value.enabled = data.lock_enabled === '1';
    const idleT = parseInt(data.lock_idle_timeout, 10);
    lockForm.value.idleTimeout = isNaN(idleT) ? 300 : idleT;

    try {
      const statusRes = await getLockStatus();
      hasLockPassword.value = !!(statusRes.data && statusRes.data.hasPassword);
    } catch (e) {
      console.error('加载锁屏状态失败', e);
    }
  } catch (e) {
    console.error('加载设置失败', e);
  }
});

async function handleSave() {
  if (saving.value) return;
  saving.value = true;
  message.value = '';

  try {
    const payload = {
      bg_url_pc: form.value.bg_url_pc,
      bg_url_mobile: form.value.bg_url_mobile,
      bg_opacity: String(form.value.bg_opacity),
      glass_opacity: String(form.value.glass_opacity),
      text_color_mode: form.value.text_color_mode,
      custom_code: form.value.custom_code
    };

    await updateSettings(payload);
    message.value = '已保存';
    setTimeout(() => {
      message.value = '';
    }, 2000);
  } catch (e) {
    console.error('保存设置失败', e);
    message.value = '保存失败，请稍后再试';
  } finally {
    saving.value = false;
  }
}

async function handleSaveLock() {
  if (savingLock.value) return;
  savingLock.value = true;
  lockMessage.value = '';

  try {
    const payload = {
      enabled: lockForm.value.enabled,
      idleTimeout: lockForm.value.idleTimeout
    };
    const newPwd = (lockForm.value.newPassword || '').trim();
    if (newPwd) {
      payload.newPassword = newPwd;
      payload.currentPassword = lockForm.value.currentPassword || '';
    }

    const res = await updateLockConfig(payload);
    lockSuccess.value = true;
    lockMessage.value = res.data && res.data.message ? res.data.message : '已保存';
    lockForm.value.currentPassword = '';
    lockForm.value.newPassword = '';
    try {
      const statusRes = await getLockStatus();
      hasLockPassword.value = !!(statusRes.data && statusRes.data.hasPassword);
    } catch (e) { /* ignore */ }
    setTimeout(() => {
      lockMessage.value = '';
    }, 2500);
  } catch (e) {
    lockSuccess.value = false;
    const msg = e.response && e.response.data && e.response.data.error;
    lockMessage.value = msg || '保存失败，请稍后再试';
  } finally {
    savingLock.value = false;
  }
}
</script>

<style scoped>
.site-settings {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 0 16px 16px;
  box-sizing: border-box;
}

.settings-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px 12px 0 0;
  padding: 12px 16px 10px;
  color: #ffffff;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
  box-sizing: border-box;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.5px;
}

.page-subtitle {
  margin: 0;
  font-size: 0.85rem;
  opacity: 0.9;
}

.settings-card {
  background: #ffffff;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.08);
  padding: 20px 20px 24px;
  box-sizing: border-box;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.form-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #111827;
}

.input,
.select {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  font-size: 0.9rem;
  outline: none;
  box-sizing: border-box;
}

.input:focus,
.select:focus,
.textarea:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
}

.textarea {
  width: 100%;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  font-size: 0.9rem;
  font-family: Consolas, Menlo, Monaco, monospace;
  resize: vertical;
  box-sizing: border-box;
  white-space: pre;
}

.range-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.range-input {
  flex: 1;
}

.range-value {
  min-width: 40px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-size: 0.9rem;
  color: #374151;
}

.preview-row {
  margin-top: 6px;
}

.preview-panel {
  position: relative;
  width: 100%;
  min-height: 160px;
  border-radius: 12px;
  overflow: hidden;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  box-sizing: border-box;
}

.preview-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.preview-menu {
  position: relative;
  z-index: 1;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: #111827;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.35),
    inset 0 -1px 0 rgba(255, 255, 255, 0.08);
}

.preview-card {
  position: relative;
  z-index: 1;
  flex: 1;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  color: #111827;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.35),
    inset 0 -1px 0 rgba(255, 255, 255, 0.08);
}

.preview-card-title {
  font-size: 0.95rem;
  font-weight: 600;
}

.preview-card-subtitle {
  font-size: 0.8rem;
  color: #4b5563;
}

.form-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
}

.btn {
  border: none;
  border-radius: 999px;
  padding: 8px 18px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
}

.btn.primary {
  background: #2563eb;
  color: #ffffff;
}

.btn.primary:hover {
  background: #1d4ed8;
}

.btn.primary:disabled {
  opacity: 0.6;
  cursor: default;
}

.save-message {
  font-size: 0.85rem;
  color: #16a34a;
}

.save-error {
  color: #dc2626;
}

.lock-settings-card {
  margin-top: 16px;
  border-radius: 12px;
}

.lock-section-title {
  margin: 0 0 4px;
  font-size: 1.05rem;
  font-weight: 700;
  color: #111827;
}

.lock-section-desc {
  margin: 0 0 16px;
  font-size: 0.8rem;
  color: #6b7280;
}

.switch-row {
  flex-direction: row !important;
  align-items: center;
  justify-content: space-between;
}

.switch {
  width: 46px;
  height: 26px;
  border-radius: 999px;
  border: none;
  background: #d1d5db;
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
  padding: 0;
  flex-shrink: 0;
}

.switch.on {
  background: #2563eb;
}

.switch-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s;
}

.switch.on .switch-knob {
  transform: translateX(20px);
}

@media (max-width: 768px) {
  .site-settings {
    padding: 0 8px 8px;
  }

  .settings-header {
    padding: 10px 12px 8px;
    border-radius: 12px 12px 0 0;
  }

  .settings-card {
    padding: 16px 12px 18px;
  }
}

</style>
