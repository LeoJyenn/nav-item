<template>
  <div class="upload-manage">
    <div class="upload-header">
      <div class="header-content">
        <h2 class="page-title">图片上传管理</h2>
      </div>
      <div class="upload-add">
        <input
          type="file"
          accept="image/*"
          class="input file-input"
          @change="onFileChange"
        />
        <input
          v-model="remark"
          placeholder="备注（可选，用于说明这张图片用途）"
          class="input"
        />
        <button class="btn btn-block" @click="handleUpload">
          上传图片
        </button>
      </div>
    </div>

    <div class="upload-section">
      <h3 class="section-title">已上传的图片</h3>

      <!-- 桌面端：表格布局 -->
      <div v-if="!isMobile" class="upload-card">
        <table class="upload-table">
          <thead>
            <tr>
              <th>预览</th>
              <th>图片链接</th>
              <th>备注</th>
              <th>上传时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="img in images" :key="img.id">
              <td class="preview-cell">
                <img :src="img.url" alt="" class="preview-image" />
              </td>
              <td>
                <div class="input-with-copy">
                  <input
                    :value="fullUrl(img.url)"
                    class="table-input"
                    readonly
                  />
                  <button
                    class="btn btn-copy btn-icon"
                    type="button"
                    :class="{ copied: copiedId === img.id }"
                    @click="copyLink(fullUrl(img.url), img.id)"
                    title="复制链接"
                  >
                    <svg
                      class="copy-icon"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path
                        d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                      ></path>
                    </svg>
                  </button>
                </div>
              </td>
              <td>
                <span class="remark-text">{{ img.remark || '-' }}</span>
              </td>
              <td>
                <span class="time-text">{{ formatTime(img.created_at) }}</span>
              </td>
              <td class="td-actions">
                <button
                  class="btn btn-danger btn-icon"
                  @click="deleteImage(img.id)"
                  title="删除"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
                    />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              </td>
            </tr>
            <tr v-if="!images.length">
              <td colspan="5" class="empty-cell">暂无图片</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 移动端：卡片布局 -->
      <div v-else class="upload-list-mobile">
        <div
          v-for="img in images"
          :key="img.id"
          class="upload-item"
        >
          <div class="upload-item-header">
            <div class="upload-item-preview">
              <img :src="img.url" alt="" class="preview-image-mobile" />
            </div>
            <button
              class="btn btn-danger btn-icon btn-icon-mobile"
              @click="deleteImage(img.id)"
              title="删除"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path
                  d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"
                />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          </div>

          <div class="upload-item-row">
            <span class="item-label">图片链接</span>
            <div class="input-with-copy">
              <input
                :value="fullUrl(img.url)"
                class="table-input-mobile"
                readonly
              />
              <button
                class="btn btn-copy btn-icon btn-icon-mobile"
                type="button"
                :class="{ copied: copiedId === img.id }"
                @click="copyLink(fullUrl(img.url), img.id)"
                title="复制链接"
              >
                <svg
                  class="copy-icon-mobile"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path
                    d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                  ></path>
                </svg>
              </button>
            </div>
          </div>

          <div class="upload-item-row">
            <span class="item-label">备注</span>
            <span class="item-value">{{ img.remark || '-' }}</span>
          </div>

          <div class="upload-item-row">
            <span class="item-label">上传时间</span>
            <span class="item-value">{{ formatTime(img.created_at) }}</span>
          </div>
        </div>

        <div v-if="!images.length" class="empty-cell-mobile">
          暂无图片
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import {
  uploadImageWithRemark,
  getUploadImages,
  deleteUploadImage
} from '../../api';

const file = ref(null);
const remark = ref('');
const images = ref([]);
const copiedId = ref(null);
let copiedTimer = null;

const isMobile = ref(false);

const updateIsMobile = () => {
  if (typeof window === 'undefined') return;
  isMobile.value = window.innerWidth <= 768;
};

const onFileChange = (e) => {
  const f = e.target.files && e.target.files[0];
  file.value = f || null;
};

const loadImages = async () => {
  const res = await getUploadImages();
  images.value = res.data;
};

const handleUpload = async () => {
  if (!file.value) {
    alert('请先选择一张图片');
    return;
  }
  try {
    await uploadImageWithRemark(file.value, remark.value);
    file.value = null;
    remark.value = '';
    const fileInput = document.querySelector('.file-input');
    if (fileInput) fileInput.value = '';
    loadImages();
  } catch (e) {
    console.error(e);
    alert('图片上传失败，请稍后重试');
  }
};

const fullUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return window.location.origin + url;
};

const copyLink = async (text, id) => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const scrollY = window.scrollY || window.pageYOffset || 0;

      const tempInput = document.createElement('textarea');
      tempInput.value = text;
      tempInput.setAttribute('readonly', '');
      tempInput.style.position = 'fixed';
      tempInput.style.top = '-9999px';
      tempInput.style.left = '-9999px';
      tempInput.style.opacity = '0';
      tempInput.style.pointerEvents = 'none';

      document.body.appendChild(tempInput);
      tempInput.select();

      try {
        document.execCommand('copy');
      } catch (e) {
        console.warn('document.execCommand 复制失败', e);
      }

      if (window.getSelection) {
        const sel = window.getSelection();
        if (sel && sel.removeAllRanges) {
          sel.removeAllRanges();
        }
      }
      document.body.removeChild(tempInput);
      window.scrollTo(0, scrollY);
    }

    copiedId.value = id;
    if (copiedTimer) clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => {
      copiedId.value = null;
    }, 1000);
  } catch (e) {
    console.warn('复制失败', e);
    alert('复制失败，请手动复制');
  }
};

const formatTime = (t) => {
  if (!t) return '';
  return String(t);
};

const deleteImage = async (id) => {
  try {
    await deleteUploadImage(id);
    loadImages();
  } catch (e) {
    console.error(e);
    alert('删除失败，请稍后重试');
  }
};

onMounted(() => {
  updateIsMobile();
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', updateIsMobile);
  }
  loadImages();
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateIsMobile);
  }
});
</script>

<style scoped>
.upload-manage {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 0;
  box-sizing: border-box;
}

/* 顶部渐变头部：改为圆角卡片风格，和友链/广告一致 */
.upload-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 14px 18px;
  margin: 0 16px 18px;
  color: white;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
  box-sizing: border-box;
}

.header-content {
  margin-bottom: 8px;
}

.page-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.5px;
}

/* 顶部表单区域 */
.upload-add {
  width: 100%;
  display: grid;
  grid-template-columns: 2fr 3fr 1.2fr;
  gap: 8px;
  box-sizing: border-box;
}

.input {
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #d0d7e2;
  background: #fff;
  color: #222;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  box-sizing: border-box;
  width: 100%;
  height: 36px;
}

.file-input {
  padding: 6px 8px;
}

.input:focus {
  outline: none;
  border-color: #399dff;
  box-shadow: 0 0 0 2px rgba(57, 157, 255, 0.1);
}

/* 按钮样式：统一圆角 8px 风格 */
.btn {
  padding: 0 12px;
  min-width: 96px;
  border: none;
  border-radius: 8px;
  background: #399dff;
  color: white;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
  transition: background 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 36px;
  box-sizing: border-box;
}

.btn-block {
  width: 100%;
}

.btn:hover {
  background: #2d7dd2;
}

.btn-icon {
  width: 36px;
  min-width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 6px;
}

.btn-danger {
  background: #ef4444;
}

.btn-danger:hover {
  background: #dc2626;
}

.btn-copy {
  background: #4b5563;
}

.btn-copy:hover {
  background: #4b5563; /* 移除 hover 变蓝 */
}

.btn-copy.copied {
  background: #16a34a;
}

/* 列表整体区域 */
.upload-section {
  margin-bottom: 24px;
  padding: 0 16px;
  box-sizing: border-box;
}

.section-title {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0 0 8px;
  color: #111827;
}

/* 桌面端白色卡片容器：改成圆角+阴影 */
.upload-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
  padding: 16px;
}

/* 表格布局 */
.upload-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.upload-table th,
.upload-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  box-sizing: border-box;
  word-break: break-all;
}

.upload-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
  white-space: nowrap;
}

.upload-table th:nth-child(1),
.upload-table td:nth-child(1) {
  width: 90px;
}

.upload-table th:nth-child(2),
.upload-table td:nth-child(2) {
  width: 35%;
}

.upload-table td:nth-child(2) {
  white-space: normal;
}

.upload-table th:nth-child(5),
.upload-table td:nth-child(5) {
  width: 10%;
  text-align: center;
}

.preview-cell {
  text-align: center;
}

.preview-image {
  max-width: 80px;
  max-height: 52px;
  object-fit: contain;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

/* 桌面端表格里的输入框 */
.table-input {
  width: 100%;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #222;
  font-size: 0.85rem;
  box-sizing: border-box;
  height: 32px;
}

.table-input:focus {
  outline: none;
  border-color: #399dff;
  box-shadow: 0 0 0 2px rgba(57, 157, 255, 0.1);
}

.input-with-copy {
  display: flex;
  align-items: center;
  gap: 6px;
}

.input-with-copy .table-input,
.input-with-copy .table-input-mobile {
  flex: 1;
}

.copy-icon {
  width: 14px;
  height: 14px;
}

.remark-text,
.time-text {
  font-size: 0.85rem;
  color: #374151;
}

.empty-cell {
  text-align: center;
  padding: 16px;
  color: #9ca3af;
  font-size: 0.9rem;
}

.td-actions {
  text-align: center;
}

/* ========= 移动端卡片布局 ========= */
.upload-list-mobile {
  width: 100%;
  box-sizing: border-box;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.upload-item {
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
  padding: 10px 12px;
  box-sizing: border-box;
}

.upload-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.upload-item-preview {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-image-mobile {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  object-fit: contain;
  background: #fff;
}

.upload-item-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 6px;
}

.item-label {
  font-size: 12px;
  color: #6b7280;
}

.item-value {
  font-size: 13px;
  color: #111827;
  word-break: break-all;
}

.table-input-mobile {
  width: 100%;
  padding: 6px 8px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #222;
  font-size: 0.8rem;
  box-sizing: border-box;
  height: 32px;
}

.table-input-mobile:focus {
  outline: none;
  border-color: #399dff;
  box-shadow: 0 0 0 2px rgba(57, 157, 255, 0.1);
}

.btn-icon-mobile {
  width: 32px;
  min-width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 6px;
}

.copy-icon-mobile {
  width: 13px;
  height: 13px;
}

.empty-cell-mobile {
  text-align: center;
  padding: 16px 0;
  color: #9ca3af;
  font-size: 0.9rem;
}

/* 移动端整体 */
@media (max-width: 768px) {
  .upload-header {
    padding: 12px 10px;
    margin: 0 10px 12px;
    border-radius: 12px;
  }

  .upload-add {
    grid-template-columns: 1fr;
  }

  .upload-section {
    padding: 0 10px;
  }

  .upload-card {
    display: none;
  }

  .btn {
    min-width: 80px;
    height: 32px;
    font-size: 0.8rem;
  }

  .input {
    font-size: 0.8rem;
    height: 32px;
  }
}
</style>
