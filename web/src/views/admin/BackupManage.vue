<template>
  <div class="backup-manage">
    <div class="backup-card">
      <h2 class="card-title">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2566d8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        导出备份
      </h2>
      <p class="card-desc">
        点击下面的按钮，将当前所有数据（栏目、卡片、用户、广告、友链等）以及上传的图片打包为一个
        <code>.zip</code> 文件，请妥善保存这个备份文件。
      </p>
      <button class="btn" @click="handleExport" :disabled="isExporting || isImporting">
        {{ isExporting ? '正在导出...' : '导出现有数据' }}
      </button>
    </div>

    <div v-if="showProgress || message" class="center-status">
      <div v-if="showProgress" class="progress-wrapper">
        <div class="progress-bar">
          <div class="progress-inner" :style="{ width: progress + '%' }"></div>
        </div>
        <span class="progress-text">
          {{ progressMode === 'export' ? '正在导出备份文件…' : '正在导入并覆盖数据…' }}
          ({{ Math.round(progress) }}%)
        </span>
      </div>
      <div v-if="message" :class="['message', messageType]">
        {{ message }}
      </div>
    </div>

    <div class="backup-card import-card">
      <h2 class="card-title">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 5 17 10"/>
          <line x1="12" y1="5" x2="12" y2="21"/>
        </svg>
        导入备份
      </h2>
      <p class="card-desc warning">
        <strong>警告：</strong>
        导入备份文件会<strong>彻底清空并覆盖</strong>当前数据库和上传图片！此操作不可逆，请确保已经导出并保存了当前备份。
      </p>
      
      <div class="import-controls">
        <input 
          type="file" 
          @change="onFileSelected" 
          accept=".zip"
          ref="fileInput"
          class="file-input"
        />
        <button 
          class="btn btn-danger" 
          @click="handleImport" 
          :disabled="!selectedFile || isImporting || isExporting"
        >
          {{ isImporting ? '正在导入...' : '导入并覆盖' }}
        </button>
      </div>

      <p v-if="selectedFile" class="file-name">
        已选择文件: {{ selectedFile.name }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { exportBackup, importBackup } from '../../api';

const isExporting = ref(false);
const isImporting = ref(false);
const selectedFile = ref(null);
const fileInput = ref(null);
const message = ref('');
const messageType = ref('success');

const progress = ref(0);
const showProgress = ref(false);
const progressMode = ref(null);
let fakeTimer = null;

function resetProgress() {
  if (fakeTimer) {
    clearInterval(fakeTimer);
    fakeTimer = null;
  }
  showProgress.value = false;
  progressMode.value = null;
  progress.value = 0;
}

async function handleExport() {
  if (isExporting.value || isImporting.value) return;

  isExporting.value = true;
  message.value = '';
  messageType.value = 'success';
  progressMode.value = 'export';
  showProgress.value = true;
  progress.value = 0;
  if (fakeTimer) {
    clearInterval(fakeTimer);
    fakeTimer = null;
  }

  try {
    const response = await exportBackup(event => {
      if (event && event.lengthComputable) {
        if (fakeTimer) {
          clearInterval(fakeTimer);
          fakeTimer = null;
        }
        const percent = Math.round((event.loaded / event.total) * 100);
        progress.value = percent;
      } else {
        if (!fakeTimer) {
          fakeTimer = setInterval(() => {
            if (progress.value < 90) {
              const delta = Math.random() * 8 + 2;
              const next = progress.value + delta;
              progress.value = next > 90 ? 90 : next;
            }
          }, 300);
        }
      }
    });

    if (progress.value < 100) {
      progress.value = 100;
    }

    const header = response.headers['content-disposition'];
    let filename = 'nav-backup.zip';
    if (header) {
      const parts = header.split(';');
      const filenamePart = parts.find(part => part.trim().startsWith('filename='));
      if (filenamePart) {
        filename = filenamePart.split('=')[1].trim().replace(/"/g, '');
      }
    }

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    message.value = '导出成功。';
    messageType.value = 'success';
  } catch (error) {
    console.error('导出失败:', error);
    message.value = '导出失败: ' + (error.response?.data?.error || error.message);
    messageType.value = 'error';
  } finally {
    isExporting.value = false;
    if (fakeTimer) {
      clearInterval(fakeTimer);
      fakeTimer = null;
    }
    setTimeout(() => {
      resetProgress();
    }, 600);
  }
}

function onFileSelected(event) {
  selectedFile.value = event.target.files[0] || null;
  message.value = '';
}

async function handleImport() {
  if (!selectedFile.value) {
    message.value = '请先选择一个 .zip 备份文件。';
    messageType.value = 'error';
    return;
  }

  const ok = window.confirm(
    '此操作将清空当前所有数据并用备份文件完全覆盖！\n\n是否确认继续导入？'
  );
  if (!ok) {
    message.value = '已取消导入操作。';
    messageType.value = 'error';
    return;
  }

  if (isImporting.value || isExporting.value) return;

  isImporting.value = true;
  message.value = '正在导入，请稍候…';
  messageType.value = 'success';
  progressMode.value = 'import';
  showProgress.value = true;
  progress.value = 0;
  if (fakeTimer) {
    clearInterval(fakeTimer);
    fakeTimer = null;
  }

  try {
    const formData = new FormData();
    formData.append('backupFile', selectedFile.value);

    const response = await importBackup(formData, event => {
      if (event && event.lengthComputable) {
        if (fakeTimer) {
          clearInterval(fakeTimer);
          fakeTimer = null;
        }
        const percent = Math.round((event.loaded / event.total) * 100);
        progress.value = percent;
      } else {
        if (!fakeTimer) {
          fakeTimer = setInterval(() => {
            if (progress.value < 90) {
              const delta = Math.random() * 8 + 2;
              const next = progress.value + delta;
              progress.value = next > 90 ? 90 : next;
            }
          }, 300);
        }
      }
    });

    if (progress.value < 100) {
      progress.value = 100;
    }

    message.value = response.data.message || '导入成功！';
    messageType.value = 'success';

    selectedFile.value = null;
    if (fileInput.value) {
      fileInput.value.value = '';
    }
  } catch (error) {
    console.error('导入失败:', error);
    message.value = '导入失败: ' + (error.response?.data?.error || error.message);
    messageType.value = 'error';
  } finally {
    isImporting.value = false;
    if (fakeTimer) {
      clearInterval(fakeTimer);
      fakeTimer = null;
    }
    setTimeout(() => {
      resetProgress();
    }, 600);
  }
}
</script>

<style scoped>
.backup-manage {
  max-width: 900px;
  width: 95%;
  margin: 20px auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.backup-card {
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

.import-card .card-title {
  color: #e74c3c;
}

.card-desc.warning {
  color: #c0392b;
  background: #fff0f0;
  border: 1px solid #f5c6cb;
  padding: 12px;
  border-radius: 8px;
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
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.btn:hover:not(:disabled) {
  background: #174ea6;
}

.btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.btn-danger {
  background: #e74c3c;
}

.btn-danger:hover:not(:disabled) {
  background: #c0392b;
}

.import-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.file-input {
  font-size: 0.9rem;
  padding: 8px 0;
}

.file-input::file-selector-button {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid #d0d7e2;
  background: #f8f9fa;
  color: #333;
  cursor: pointer;
  transition: all 0.2s;
}

.file-input::file-selector-button:hover {
  background: #e9ecef;
}

.file-name {
  margin-top: 12px;
  font-style: italic;
  color: #555;
}

.center-status {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.progress-wrapper {
  margin: 0;
  padding: 0 4px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
}

.progress-inner {
  height: 100%;
  background: linear-gradient(90deg, #2566d8, #4f8cff);
  border-radius: 999px;
  transition: width 0.2s ease;
}

.progress-text {
  font-size: 0.9rem;
  color: #4b5563;
}

.message {
  padding: 12px;
  border-radius: 8px;
  font-weight: 500;
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

@media (max-width: 768px) {
  .backup-card {
    padding: 16px 14px;
  }
  .import-controls {
    flex-direction: column;
    align-items: stretch;
  }
  .btn,
  .file-input {
    width: 100%;
  }
}
</style>
