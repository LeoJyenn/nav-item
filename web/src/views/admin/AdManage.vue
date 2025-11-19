<template>
  <div class="ad-manage">
    <div class="ad-header">
      <div class="header-content">
        <h2 class="page-title">广告管理</h2>
      </div>
      <div class="ad-add">
        <input
          v-model="newAdImg"
          placeholder="广告图片链接"
          class="input"
        />
        <input
          v-model="newAdUrl"
          placeholder="广告跳转链接"
          class="input"
        />
        <select v-model="newAdPos" class="input">
          <option value="left">左侧广告</option>
          <option value="right">右侧广告</option>
        </select>
        <button class="btn btn-block" @click="handleAddAd">
          添加广告
        </button>
      </div>
    </div>

    <div class="ad-section">
      <h3 class="section-title">左侧广告列表</h3>
      <div class="ad-card">
        <table class="ad-table">
          <thead>
            <tr>
              <th>图片链接</th>
              <th>跳转链接</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ad in leftAds" :key="ad.id">
              <td>
                <input
                  v-model="ad.img"
                  @blur="updateAd(ad)"
                  class="table-input"
                  placeholder="广告图片链接"
                />
              </td>
              <td>
                <input
                  v-model="ad.url"
                  @blur="updateAd(ad)"
                  class="table-input"
                  placeholder="广告跳转链接"
                />
              </td>
              <td class="td-actions">
                <button
                  class="btn btn-danger btn-icon"
                  @click="deleteAd(ad.id)"
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
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="ad-section">
      <h3 class="section-title">右侧广告列表</h3>
      <div class="ad-card">
        <table class="ad-table">
          <thead>
            <tr>
              <th>图片链接</th>
              <th>跳转链接</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ad in rightAds" :key="ad.id">
              <td>
                <input
                  v-model="ad.img"
                  @blur="updateAd(ad)"
                  class="table-input"
                  placeholder="广告图片链接"
                />
              </td>
              <td>
                <input
                  v-model="ad.url"
                  @blur="updateAd(ad)"
                  class="table-input"
                  placeholder="广告跳转链接"
                />
              </td>
              <td class="td-actions">
                <button
                  class="btn btn-danger btn-icon"
                  @click="deleteAd(ad.id)"
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
                    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import {
  getAds,
  addAd as apiAddAd,
  updateAd as apiUpdateAd,
  deleteAd as apiDeleteAd
} from '../../api';

const leftAds = ref([]);
const rightAds = ref([]);

const newAdImg = ref('');
const newAdUrl = ref('');
const newAdPos = ref('left');

onMounted(loadAds);

async function loadAds() {
  const res = await getAds();
  leftAds.value = res.data.filter(ad => ad.position === 'left');
  rightAds.value = res.data.filter(ad => ad.position === 'right');
}

async function handleAddAd() {
  if (!newAdImg.value || !newAdUrl.value) return;

  await apiAddAd({
    position: newAdPos.value,
    img: newAdImg.value,
    url: newAdUrl.value
  });

  newAdImg.value = '';
  newAdUrl.value = '';
  newAdPos.value = 'left';

  loadAds();
}

async function updateAd(ad) {
  await apiUpdateAd(ad.id, {
    img: ad.img,
    url: ad.url
  });
}

async function deleteAd(id) {
  await apiDeleteAd(id);
  loadAds();
}
</script>

<style scoped>
.ad-manage {
  width: 100%;
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 0;
  box-sizing: border-box;
}

.ad-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 12px 16px 14px;
  color: white;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
  width: calc(100% - 32px);
  margin: 0 auto 8px;
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

.ad-add {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  box-sizing: border-box;
}

.section-title {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 16px 0 8px;
  color: #111827;
}

.ad-section {
  margin-bottom: 24px;
  padding: 0 16px;
  box-sizing: border-box;
}

.ad-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(15, 23, 42, 0.08);
  width: 100%;
  box-sizing: border-box;
  padding: 8px 0;
}

.ad-table {
  width: 100%;
  border-collapse: collapse;
}

.ad-table th,
.ad-table td {
  padding: 8px 12px;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  box-sizing: border-box;
}

.ad-table th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
}

.ad-table th:nth-child(1),
.ad-table td:nth-child(1) {
  width: 40%;
}

.ad-table th:nth-child(2),
.ad-table td:nth-child(2) {
  width: 45%;
}

.ad-table th:nth-child(3),
.ad-table td:nth-child(3) {
  width: 15%;
}

.td-actions {
  text-align: center;
}

.input {
  padding: 8px 10px;
  border-radius: 4px;
  border: 1px solid #d0d7e2;
  background: #fff;
  color: #222;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  box-sizing: border-box;
  width: 100%;
  height: 36px;
}

.table-input {
  width: 100%;
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #222;
  font-size: 0.85rem;
  transition: all 0.2s ease;
  box-sizing: border-box;
  height: 32px;
}

.table-input:focus,
.input:focus {
  outline: none;
  border-color: #399dff;
  box-shadow: 0 0 0 2px rgba(57, 157, 255, 0.1);
}

.btn {
  padding: 0 12px;
  min-width: 96px;
  border: none;
  border-radius: 4px;
  background: #399dff;
  color: white;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.9rem;
  transition: all 0.2s;
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

.btn-icon {
  width: 36px;
  min-width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 4px;
}

.btn:hover {
  background: #2d7dd2;
  transform: translateY(-1px);
}

.btn-danger {
  background: #ef4444;
}

.btn-danger:hover {
  background: #dc2626;
}

@media (max-width: 768px) {
  .ad-header {
    padding: 12px 10px 10px;
    width: calc(100% - 20px);
    margin: 0 auto 8px;
  }

  .ad-add {
    grid-template-columns: repeat(2, 1fr);
  }

  .ad-section {
    padding: 0 10px;
  }

  .ad-card {
    padding: 4px 0;
  }

  .ad-table {
    width: 100%;
    table-layout: fixed;
  }

  .ad-table th,
  .ad-table td {
    padding: 6px 8px;
    font-size: 0.8rem;
    word-break: break-all;
  }

  .btn {
    min-width: 80px;
    height: 32px;
    font-size: 0.8rem;
  }

  .btn-icon {
    width: 32px;
    min-width: 32px;
    height: 32px;
  }

  .input {
    font-size: 0.8rem;
    height: 32px;
  }
}
</style>
