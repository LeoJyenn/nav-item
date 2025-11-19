<template>
  <div class="user-manage">
    <!-- 顶部渐变头部 -->
    <div class="user-header">
      <div class="header-content">
        <h2 class="page-title">用户与密码管理</h2>
      </div>
    </div>

    <!-- 中间白色卡片 -->
    <div class="user-card">
      <div class="inner-card">
        <div class="password-section">
          <h3 class="section-title">修改登录密码</h3>
          <p class="section-desc">为保障账号安全，建议定期更换密码，并保证至少 6 位长度。</p>

          <div class="password-form">
            <div class="form-group">
              <label>当前密码</label>
              <input
                v-model="oldPassword"
                type="password"
                placeholder="请输入当前密码"
                class="input"
              />
            </div>

            <div class="form-group">
              <label>新密码</label>
              <input
                v-model="newPassword"
                type="password"
                placeholder="请输入新密码（至少 6 位）"
                class="input"
              />
            </div>

            <div class="form-group">
              <label>确认新密码</label>
              <input
                v-model="confirmPassword"
                type="password"
                placeholder="请再次输入新密码"
                class="input"
              />
            </div>

            <div class="form-actions">
              <button @click="handleChangePassword" class="btn" :disabled="loading">
                {{ loading ? '修改中...' : '修改密码' }}
              </button>
            </div>

            <p v-if="message" :class="['message', messageType]">
              {{ message }}
            </p>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { getUserProfile, changePassword } from "../../api";

const oldPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const message = ref("");
const messageType = ref("success");
const userInfo = ref({});

onMounted(async () => {
  try {
    const response = await getUserProfile();
    userInfo.value = response.data;
  } catch (error) {
    console.error("获取用户信息失败:", error);
  }
});

async function handleChangePassword() {
  if (!oldPassword.value || !newPassword.value || !confirmPassword.value) {
    showMessage("请填写所有密码字段", "error");
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    showMessage("两次输入的新密码不一致", "error");
    return;
  }

  if (newPassword.value.length < 6) {
    showMessage("新密码长度至少 6 位", "error");
    return;
  }

  loading.value = true;
  message.value = "";

  try {
    await changePassword(oldPassword.value, newPassword.value);
    showMessage("密码修改成功", "success");

    oldPassword.value = "";
    newPassword.value = "";
    confirmPassword.value = "";
  } catch (error) {
    showMessage(error.response?.data?.message || "密码修改失败", "error");
  } finally {
    loading.value = false;
  }
}

function showMessage(text, type) {
  message.value = text;
  messageType.value = type;

  if (text === "密码修改成功" && type === "success") {
    setTimeout(() => {
      message.value = "2 秒后自动退出登录，请使用新密码重新登录...";
      setTimeout(() => {
        localStorage.removeItem("token");
        window.location.reload();
      }, 2000);
    }, 500);
  } else {
    setTimeout(() => (message.value = ""), 3000);
  }
}
</script>

<style scoped>
.user-manage {
  width: 100%;
  display: flex;
  flex-direction: column;
}

/* 顶部渐变头部（圆角 + 阴影） */
.user-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 14px 18px;
  margin: 0 16px 18px;
  color: white;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
}

.page-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
}

/* 中间白色内容卡片 */
.user-card {
  width: 100%;
  padding: 0 16px;
  display: flex;
  justify-content: center;
  box-sizing: border-box;
}

.inner-card {
  width: 100%;
  max-width: 520px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.08);
  padding: 22px 24px;
}

/* 标题 */
.section-title {
  text-align: center;
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 6px;
}

.section-desc {
  text-align: center;
  font-size: 0.9rem;
  color: #6b7280;
  margin-bottom: 18px;
}

/* 表单 */
.form-group {
  margin-bottom: 16px;
}

.input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #d0d7e2;
  font-size: 0.95rem;
  transition: 0.2s;
}

.input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
}

/* 按钮 */
.btn {
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 999px;
  padding: 10px 26px;
  font-size: 1rem;
  cursor: pointer;
  transition: 0.2s;
}

.btn:hover:not(:disabled) {
  background: #1d4ed8;
  transform: translateY(-1px);
}

.btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

/* 提示信息 */
.message {
  margin-top: 16px;
  padding: 10px;
  border-radius: 8px;
  font-size: 0.85rem;
}

.message.success {
  background: #d1fae5;
  color: #065f46;
}

.message.error {
  background: #fee2e2;
  color: #b91c1c;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .user-header {
    margin: 0 10px 12px;
  }

  .inner-card {
    padding: 18px 14px;
  }

  .btn {
    width: 100%;
  }
}
</style>
