<template>
  <div class="site-settings">
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
        <label class="form-label">卡片毛玻璃透明度（0 - 1）</label>
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

      <div class="form-row">
        <label class="form-label">字体颜色模式</label>
        <select v-model="form.text_color_mode" class="select">
          <option value="auto">自动（根据背景蒙版透明度）</option>
          <option value="black">始终黑色</option>
          <option value="white">始终白色</option>
        </select>
      </div>

      <div class="form-row">
        <label class="form-label">自定义 CSS</label>
        <textarea
          v-model="form.custom_css"
          class="textarea"
          rows="8"
          placeholder="可以在这里写自定义 CSS，例如：
.home-container { font-size: 15px; }"
        ></textarea>
      </div>

      <div class="form-actions">
        <button class="btn primary" @click="handleSave" :disabled="saving">
          {{ saving ? '保存中...' : '保存设置' }}
        </button>
        <span v-if="message" class="save-message">{{ message }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getSettings, updateSettings } from '../../api';

const form = ref({
  bg_url_pc: '',
  bg_url_mobile: '',
  bg_opacity: 1,
  glass_opacity: 1,
  custom_css: '',
  text_color_mode: 'auto'
});

const saving = ref(false);
const message = ref('');

onMounted(async () => {
  try {
    const res = await getSettings();
    const data = res.data || {};

    form.value.bg_url_pc = data.bg_url_pc || '';
    form.value.bg_url_mobile = data.bg_url_mobile || '';
    form.value.custom_css = data.custom_css || '';
    form.value.text_color_mode = data.text_color_mode || 'auto';

    const bgOp = parseFloat(data.bg_opacity);
    form.value.bg_opacity = isNaN(bgOp) ? 1 : bgOp;

    const glassOp = parseFloat(data.glass_opacity);
    form.value.glass_opacity = isNaN(glassOp) ? 1 : glassOp;
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
      custom_css: form.value.custom_css,
      text_color_mode: form.value.text_color_mode
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
</script>

<style scoped>
.site-settings {
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
  padding: 16px;
  box-sizing: border-box;
}

.settings-card {
  background: #ffffff;
  border-radius: 12px;
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

@media (max-width: 768px) {
  .site-settings {
    padding: 8px;
  }

  .settings-card {
    padding: 16px 12px 18px;
  }
}
</style>
