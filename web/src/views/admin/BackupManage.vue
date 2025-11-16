<template>
  <div class="backup-manage">
    <div class="backup-card">
      <h2 class="card-title">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2566d8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        导出备份
      </h2>
      <p class="card-desc">
        点击下面的按钮，将您当前的所有数据（包括栏目、卡片、用户、广告和友链）下载为一个 `backup.json` 文件。
        请妥善保管这个文件。
      </p>
      <button class="btn" @click="handleExport" :disabled="isExporting">
        {{ isExporting ? '正在导出...' : '导出现有数据' }}
      </button>
    </div>

    <div class="backup-card import-card">
      <h2 class="card-title">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 5 17 10"/><line x1="12" y1="5" x2="12" y2="21"/></svg>
        导入备份 (危险操作)
      </h2>
      <p class="card-desc warning">
        <strong>警告：</strong> 导入备份文件将会**彻底清空并覆盖**当前数据库中的所有数据！此操作不可逆，请在导入前确认您已备份好当前数据。
      </p>
      
      <div class="import-controls">
        <input 
          type="file" 
          @change="onFileSelected" 
          accept=".json"
          ref="fileInput"
          class="file-input"
        />
        <button 
          class="btn btn-danger" 
          @click="handleImport" 
          :disabled="!selectedFile || isImporting"
        >
          {{ isImporting ? '正在导入...' : '导入并覆盖' }}
        </button>
      </div>
      <p v-if="selectedFile" class="file-name">
        已选择文件: {{ selectedFile.name }}
      </p>
      
      <div v-if="message" :class="['message', messageType]">
        {{ message }}
      </div>
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
const messageType = ref('success'); // 'success' 或 'error'

async function handleExport() {
  isExporting.value = true;
  message.value = '';
  try {
    const response = await exportBackup();
    const header = response.headers['content-disposition'];
    let filename = 'nav-backup.json';
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
    message.value = '导出成功！';
    messageType.value = 'success';
  } catch (error) {
    console.error('导出失败:', error);
    message.value = '导出失败: ' + (error.response?.data?.error || error.message);
    messageType.value = 'error';
  } finally {
    isExporting.value = false;
  }
}

function onFileSelected(event) {
  selectedFile.value = event.target.files[0] || null;
  message.value = ''; 
}

async function handleImport() {
  if (!selectedFile.value) {
    alert('请先选择一个 .json 备份文件。');
    return;
  }
  const confirmation = prompt('这是一个极度危险的操作，将清空所有数据！\n\n请输入 "确认导入" 来继续：');
  if (confirmation !== '确认导入') {
    alert('操作已取消。');
    return;
  }

  isImporting.value = true;
  message.value = '正在导入...';
  messageType.value = 'success';

  try {
    const formData = new FormData();
    formData.append('backupFile', selectedFile.value);
    const response = await importBackup(formData);
    message.value = response.data.message || '导入成功！请刷新页面查看新数据。';
    messageType.value = 'success';
    selectedFile.value = null;
    if (fileInput.value) {
      fileInput.value.value = ''; 
    }
    alert('导入成功！您的所有数据已被覆盖。建议您刷新整个后台页面。');
  } catch (error) {
    console.error('导入失败:', error);
    message.value = '导入失败: ' + (error.response?.data?.error || error.message);
    messageType.value = 'error';
  } finally {
    isImporting.value = false;
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
.message {
  margin-top: 20px;
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
</style>