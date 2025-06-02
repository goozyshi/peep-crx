<template>
  <div class="space-y-4">
    <!-- 详细记录按钮 -->
    <div class="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
      <h2
        class="text-lg font-bold text-gray-900 mb-4 text-center flex items-center justify-center"
      >
        <span class="text-xl mr-2">📝</span>
        详细记录
      </h2>

      <div class="grid grid-cols-2 gap-4">
        <button
          @click="addRecord(true)"
          :disabled="!currentLocation || isLoading"
          class="bg-danger-600 hover:bg-danger-700 disabled:bg-gray-400 text-white py-4 px-3 rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow-md disabled:shadow-none"
        >
          <div class="text-2xl mb-2">😔</div>
          <div class="text-sm">厕所满了</div>
          <div class="text-xs opacity-90 mt-1">记录拥挤状态</div>
        </button>

        <button
          @click="addRecord(false)"
          :disabled="!currentLocation || isLoading"
          class="bg-success-600 hover:bg-success-700 disabled:bg-gray-400 text-white py-4 px-3 rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow-md disabled:shadow-none"
        >
          <div class="text-2xl mb-2">😊</div>
          <div class="text-sm">有空位</div>
          <div class="text-xs opacity-90 mt-1">记录空闲状态</div>
        </button>
      </div>

      <div v-if="isLoading" class="text-center mt-4">
        <div class="relative mx-auto w-6 h-6">
          <div
            class="absolute inset-0 rounded-full border-2 border-primary-200"
          ></div>
          <div
            class="absolute inset-0 rounded-full border-2 border-primary-600 border-t-transparent animate-spin"
          ></div>
        </div>
        <p class="text-gray-600 mt-2 font-medium text-sm">记录中...</p>
      </div>
    </div>

    <!-- 最近记录 -->
    <div
      v-if="recentRecords.length > 0"
      class="bg-white rounded-2xl shadow-card border border-gray-100 p-4"
    >
      <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center">
        <span class="text-xl mr-2">⏰</span>
        最近记录
      </h3>

      <div class="space-y-2">
        <div
          v-for="record in recentRecords"
          :key="record.id"
          class="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-gray-100 transition-all duration-200"
        >
          <div class="flex items-center space-x-3">
            <div class="text-xl">
              {{
                record.result === "full" || record.result === "occupied"
                  ? "😔"
                  : "😊"
              }}
            </div>
            <div>
              <div class="font-semibold text-gray-900 text-sm">
                {{
                  record.result === "full" || record.result === "occupied"
                    ? "厕所满了"
                    : "有空位"
                }}
              </div>
              <div class="text-xs text-gray-600">
                {{ formatTime(record.timestamp) }}
              </div>
            </div>
          </div>

          <button
            @click="deleteRecord(record.id)"
            class="text-danger-500 hover:text-danger-700 p-1 rounded-lg hover:bg-danger-50 transition-all duration-200"
            title="删除记录"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              ></path>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div
      v-else-if="!isLoading"
      class="bg-white rounded-2xl shadow-card border border-gray-100 p-5 text-center"
    >
      <div class="text-4xl mb-4">📊</div>
      <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
        <h3 class="font-bold text-gray-900 mb-2">暂无记录</h3>
        <p class="text-gray-600 text-sm">
          开始记录厕所使用情况，<br />
          帮助系统学习并生成预测
        </p>
      </div>
    </div>

    <!-- 记录统计卡片 -->
    <div
      v-if="recentRecords.length > 0"
      class="bg-gradient-to-r from-primary-50 to-primary-100 rounded-2xl p-4 border border-primary-200"
    >
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <div class="text-xl">📈</div>
          <div>
            <div class="font-bold text-primary-800 text-sm">记录统计</div>
            <div class="text-xs text-primary-700">
              最近{{ recentRecords.length }}条记录
            </div>
          </div>
        </div>
        <div class="text-right">
          <div class="text-xl font-bold text-primary-800">
            {{ getSuccessRate() }}%
          </div>
          <div class="text-xs text-primary-700">空位成功率</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { StorageManager } from "../utils";
import type { Location, ToiletRecord } from "../types";

// Props
const props = defineProps<{
  currentLocation: Location | null;
}>();

// 组件状态
const recentRecords = ref<ToiletRecord[]>([]);
const isLoading = ref(false);

// 计算成功率
const getSuccessRate = () => {
  if (recentRecords.value.length === 0) return 0;
  const availableCount = recentRecords.value.filter(
    (r) => r.result === "available"
  ).length;
  return Math.round((availableCount / recentRecords.value.length) * 100);
};

// 添加记录
const addRecord = async (isFull: boolean) => {
  if (!props.currentLocation) return;

  isLoading.value = true;

  try {
    await StorageManager.saveRecord({
      id: Date.now().toString(),
      timestamp: Date.now(),
      locationId: props.currentLocation.id,
      result: isFull ? "full" : "available",
    });

    await loadRecentRecords();

    // 显示成功提示
    const message = isFull ? "记录成功：厕所满了" : "记录成功：有空位";
    showToast(message);
  } catch (error) {
    console.error("Add record error:", error);
    showToast("记录失败，请重试", "error");
  } finally {
    isLoading.value = false;
  }
};

// 加载最近记录
const loadRecentRecords = async () => {
  if (!props.currentLocation) return;

  try {
    const allRecords = await StorageManager.getRecordsByLocation(
      props.currentLocation.id
    );
    // 获取最近10条记录
    recentRecords.value = allRecords
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);
  } catch (error) {
    console.error("Load recent records error:", error);
  }
};

// 删除记录
const deleteRecord = async (recordId: string) => {
  if (!confirm("确定要删除这条记录吗？")) return;

  try {
    await StorageManager.deleteRecord(recordId);
    await loadRecentRecords();
    showToast("删除成功");
  } catch (error) {
    console.error("Delete record error:", error);
    showToast("删除失败", "error");
  }
};

// 格式化时间
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// 简单的toast提示
const showToast = (message: string, type: string = "success") => {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.className = `fixed top-3 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-xl shadow-xl z-50 font-medium text-sm ${
    type === "error" ? "bg-danger-600 text-white" : "bg-gray-900 text-white"
  }`;
  document.body.appendChild(toast);

  setTimeout(() => {
    if (document.body.contains(toast)) {
      document.body.removeChild(toast);
    }
  }, 2000);
};

// 暴露方法给父组件
const loadData = loadRecentRecords;
const setCurrentLocation = () => loadRecentRecords();

defineExpose({
  loadData,
  setCurrentLocation,
});

// 监听位置变化
watch(() => props.currentLocation, loadRecentRecords, { immediate: true });

onMounted(() => {
  loadRecentRecords();
});
</script>
