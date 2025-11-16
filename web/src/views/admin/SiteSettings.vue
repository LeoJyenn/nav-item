<template>
  <div class="settings-manage">
    <div class="settings-card">
      <h2 class="card-title">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2566d8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m-8-4V7l8-4m0 14l8-4"/></svg>
        网站外观设置
      </h2>
      <p class="card-desc">
        在这里设置您网站的背景图、透明度和自定义CSS。
      </p>

      <div class="form-group">
        <label for="bg_pc">电脑端 (PC) 背景图 URL</label>
        <input 
          id="bg_pc"
          v-model="settings.bg_url_pc" 
          placeholder="https://example.com/pc_background.jpg" 
          class="input"
        />
        <p class="input-hint">推荐横屏图片 (例如 1920x1080)。</p>
      </div>

      <div class="form-group">
        <label for="bg_mobile">移动端背景图 URL</label>
        <input 
          id="bg_mobile"
          v-model="settings.bg_url_mobile" 
          placeholder="https://example.com/mobile_background.jpg" 
          class="input"
        />
        <p class="input-hint">推荐竖屏图片 (例如 1080x1920)。如果留空，手机将使用默认背景图。</p>
      </div>

      <div class="form-group">
        <label for="bg_opacity">
          背景蒙版透明度: {{ Number(settings.bg_opacity).toFixed(2) }}
        </label>
        <input 
          id="bg_opacity"
          type="range"
          v-model.number="settings.bg_opacity" 
          min="0.0"
          max="1.0"
          step="0.01"
          class="slider"
        />
        <p class="input-hint">值越大，背景图片越清晰，内容可能越难看清。</p>
      </div>

      <div class="form-group">
        <label for="custom_css">自定义 CSS</label>
        <textarea 
          id="custom_css"
          v-model="settings.custom_css" 
          placeholder="/* 您的自定义样式 */&#10;body {&#10;  /* 示例: 更改背景 */&#10;  /* background-color: #f0f0f0 !important; */&#10;}" 
          class="input textarea"
          rows="10"
        ></textarea>
        <p class="input-hint">您在这里编写的CSS将被应用到网站的每一个页面。</p>
      </div>

      <div class="form-actions">
        <button class="btn" @click="saveSettings" :disabled="isLoading">
          {{ isLoading ? '保存中...' : '保存设置' }}
        </button>
      </div>
      
      <div v-if="message" :class="['message', messageType]">
        {{ message }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getSettings, updateSettings } from '../../api';

const settings = ref({
  bg_url_pc: '',
  bg_url_mobile: '',
  bg_opacity: 0.15,
  custom_css: '/* 自定义样式 */'
});
const isLoading = ref(false);
const message = ref('');
const messageType = ref('success');

onMounted(async () => {
  isLoading.value = true;
  try {
    const response = await getSettings();
    settings.value = {
        ...settings.value, 
        ...response.data   
    };
    settings.value.bg_opacity = parseFloat(settings.value.bg_opacity); 
  } catch (error) {
    message.value = '加载设置失败: ' + error.message;
    messageType.value = 'error';
  } finally {
    isLoading.value = false;
  }
});

async function saveSettings() {
  isLoading.value = true;
  message.value = '';
  try {
    const dataToSave = {
        ...settings.value,
        bg_opacity: String(settings.value.bg_opacity)
    };
    await updateSettings(dataToSave);
    message.value = '设置已成功保存！';
    messageType.value = 'success';
    setTimeout(() => { message.value = ''; }, 3000); // 自动消失
  } catch (error) {
    message.value = '保存失败: ' + (error.response?.data?.error || error.message);
    messageType.value = 'error';
    setTimeout(() => { message.value = ''; }, 5000); // 自动消失
  } finally {
    isLoading.value = false;
  }
}
</script>

<style scoped>
.settings-manage {
  max-width: 900px;
  width: 95%;
  margin: 20px auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.settings-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 24px 32px;
}
.card-title {
  font-size: 1.75rem;
  font-weight: 600;
  color: #333;
  margin-top: 0;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.card-desc {
  font-size: 1rem;
  color: #555;
  line-height: 1.6;
  margin-bottom: 24px;
}
.form-group {
  margin-bottom: 20px;
}
.form-group label {
  display: block;
  font-size: 1rem;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}
.input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #d0d7e2;
  background: #fff;
  color: #222;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  box-sizing: border-box; 
}
.input:focus {
  outline: none;
  border-color: #399dff;
  box-shadow: 0 0 0 3px rgba(57, 157, 255, 0.1);
}
.input-hint {
  font-size: 0.85rem;
  color: #666;
  margin-top: 6px;
}
.textarea {
  font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  min-height: 150px;
  resize: vertical;
}
.slider {
  width: 100%;
  -webkit-appearance: none;
  appearance: none;
  height: 8px;
  background: #eaf1ff;
  border-radius: 5px;
  outline: none;
  opacity: 0.7;
  transition: opacity .2s;
}
.slider:hover {
  opacity: 1;
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  background: #2566d8;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 5px rgba(0,0,0,0.2);
}
.slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  background: #2566d8;
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 0 5px rgba(0,0,0,0.2);
}
.form-actions {
  margin-top: 16px;
  border-top: 1px solid #e3e6ef;
  padding-top: 20px;
}
.btn {
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  background: #2566d8;
  color: white;
  cursor: pointer;
  font-weight: 500;
  font-size: 1rem;
  transition: all 0.2s;
}
.btn:hover:not(:disabled) {
  background: #174ea6;
}
.btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
.message {
  margin-top: 20px;
  padding: 12px;
  border-radius: 8px;
  font-weight: 500;
  opacity: 1;
  transition: opacity 0.5s ease;
}
.message.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}
.message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}
</style>