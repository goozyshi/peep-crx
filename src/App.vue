<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import RecordForm from "./components/RecordForm.vue";
import PredictionView from "./components/PredictionView.vue";
import LocationSetup from "./components/LocationSetup.vue";
import { StorageManager } from "./utils";
import type { Location } from "./types";

// 应用状态
const isFirstTime = ref(true);
const currentLocation = ref<Location | null>(null);
const allLocations = ref<Location[]>([]);
const currentTab = ref("predict");
const showLocationPicker = ref(false);

// 统计数据
const totalRecords = ref(0);

// 组件引用
const recordFormRef = ref<InstanceType<typeof RecordForm>>();
const predictionViewRef = ref<InstanceType<typeof PredictionView>>();

// 计算属性
const showMainInterface = computed(
  () => !isFirstTime.value && currentLocation.value
);

// 检查是否首次使用
const checkFirstTime = async () => {
  try {
    const locations = await StorageManager.getLocations();
    allLocations.value = locations;

    if (locations.length === 0) {
      isFirstTime.value = true;
    } else {
      isFirstTime.value = false;
      // 设置当前位置为第一个位置
      currentLocation.value = locations[0];
      await loadStats();
    }
  } catch (error) {
    console.error("Check first time error:", error);
  }
};

// 首次设置完成
const onFirstSetupComplete = async (location: Location) => {
  isFirstTime.value = false;
  currentLocation.value = location;
  allLocations.value = [location];
  await loadStats();

  // 刷新组件数据
  if (recordFormRef.value) {
    recordFormRef.value.loadData();
  }
  if (predictionViewRef.value) {
    predictionViewRef.value.loadData();
  }
};

// 切换位置
const switchLocation = async (location: Location) => {
  currentLocation.value = location;
  showLocationPicker.value = false;

  // 刷新组件数据
  if (recordFormRef.value) {
    recordFormRef.value.setCurrentLocation();
  }
  if (predictionViewRef.value) {
    predictionViewRef.value.setCurrentLocation();
  }
};

// 新增位置
const onLocationAdded = async (location: Location) => {
  allLocations.value.push(location);
  currentLocation.value = location;
  await loadStats();

  // 刷新组件数据
  if (recordFormRef.value) {
    recordFormRef.value.loadData();
  }
  if (predictionViewRef.value) {
    predictionViewRef.value.loadData();
  }
};

// 加载统计数据
const loadStats = async () => {
  try {
    const records = await StorageManager.getRecords();
    totalRecords.value = records.length;
  } catch (error) {
    console.error("Load stats error:", error);
  }
};

// 快速记录厕所状态
const quickRecord = async (isFull: boolean) => {
  if (!currentLocation.value) return;

  try {
    await StorageManager.saveRecord({
      id: Date.now().toString(),
      timestamp: Date.now(),
      locationId: currentLocation.value.id,
      result: isFull ? "full" : "available",
    });

    await loadStats();

    // 显示成功提示
    const message = isFull ? "已记录：厕所满了 😔" : "已记录：有空位 😊";

    // 简单的toast提示（可以替换为更好的toast组件）
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.className =
      "fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50";
    document.body.appendChild(toast);

    setTimeout(() => {
      document.body.removeChild(toast);
    }, 2000);
  } catch (error) {
    console.error("Quick record error:", error);
  }
};

onMounted(() => {
  checkFirstTime();
});
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <div class="container mx-auto p-4 max-w-md">
      <!-- 首次使用引导 -->
      <div v-if="isFirstTime" class="text-center">
        <div class="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div class="text-6xl mb-4">🚽</div>
          <h1 class="text-2xl font-bold text-gray-800 mb-2">
            欢迎使用 PeepCRX
          </h1>
          <p class="text-gray-600 mb-6">智能洗手间空位预测助手</p>

          <div class="bg-blue-50 rounded-lg p-4 mb-6 text-left">
            <h3 class="font-semibold text-blue-800 mb-2">🎯 如何使用：</h3>
            <ul class="text-sm text-blue-700 space-y-1">
              <li>• 首次设置你常去的厕所位置</li>
              <li>• 每次去厕所发现没位置时记录一下</li>
              <li>• 系统会学习并预测最佳如厕时间</li>
              <li>• 避开高峰期，提升如厕体验</li>
            </ul>
          </div>
        </div>

        <LocationSetup
          :is-first-setup="true"
          @location-added="onFirstSetupComplete"
        />
      </div>

      <!-- 主界面 -->
      <div v-else-if="showMainInterface">
        <!-- 头部 - 位置选择器 -->
        <header class="mb-6">
          <div class="bg-white rounded-xl shadow-lg p-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="text-2xl">🚽</div>
                <div>
                  <h1 class="font-bold text-gray-800">PeepCRX</h1>
                  <p class="text-xs text-gray-500">智能预测助手</p>
                </div>
              </div>

              <!-- 位置切换按钮 -->
              <button
                @click="showLocationPicker = !showLocationPicker"
                class="flex items-center space-x-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg transition-colors"
              >
                <span class="text-sm font-medium"
                  >📍 {{ currentLocation?.name }}</span
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
                    d="M19 9l-7 7-7-7"
                  ></path>
                </svg>
              </button>
            </div>

            <!-- 位置选择下拉 -->
            <div v-if="showLocationPicker" class="mt-4 border-t pt-4">
              <div class="space-y-2">
                <button
                  v-for="location in allLocations"
                  :key="location.id"
                  @click="switchLocation(location)"
                  :class="[
                    'w-full text-left px-3 py-2 rounded-lg transition-colors',
                    location.id === currentLocation?.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'hover:bg-gray-100',
                  ]"
                >
                  <div class="font-medium">{{ location.name }}</div>
                  <div class="text-sm text-gray-500">
                    {{ location.totalStalls }} 个坑位
                  </div>
                </button>

                <!-- 添加新位置按钮 -->
                <button
                  @click="currentTab = 'settings'"
                  class="w-full text-left px-3 py-2 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-300 text-gray-500 hover:text-blue-500"
                >
                  <div class="text-center">
                    <span class="text-lg">+</span>
                    <div class="text-sm">添加新位置</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- 快速记录按钮 -->
        <div class="mb-6">
          <div class="bg-white rounded-xl shadow-lg p-4">
            <h3 class="font-semibold text-gray-800 mb-3 text-center">
              🚀 快速记录当前状态
            </h3>
            <div class="grid grid-cols-2 gap-3">
              <button
                @click="quickRecord(true)"
                class="bg-red-500 hover:bg-red-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                😔 厕所满了
              </button>
              <button
                @click="quickRecord(false)"
                class="bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                😊 有空位
              </button>
            </div>
          </div>
        </div>

        <!-- 导航标签 -->
        <nav class="flex bg-white rounded-xl shadow-lg mb-6 overflow-hidden">
          <button
            @click="currentTab = 'predict'"
            :class="[
              'flex-1 py-3 px-4 text-sm font-medium transition-colors',
              currentTab === 'predict'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50',
            ]"
          >
            <div class="text-lg mb-1">🔮</div>
            <div>预测时段</div>
          </button>
          <button
            @click="currentTab = 'record'"
            :class="[
              'flex-1 py-3 px-4 text-sm font-medium transition-colors border-l border-gray-200',
              currentTab === 'record'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50',
            ]"
          >
            <div class="text-lg mb-1">📝</div>
            <div>详细记录</div>
          </button>
          <button
            @click="currentTab = 'settings'"
            :class="[
              'flex-1 py-3 px-4 text-sm font-medium transition-colors border-l border-gray-200',
              currentTab === 'settings'
                ? 'bg-blue-500 text-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50',
            ]"
          >
            <div class="text-lg mb-1">⚙️</div>
            <div>设置</div>
          </button>
        </nav>

        <!-- 内容区域 -->
        <main>
          <!-- 预测页面 -->
          <div v-if="currentTab === 'predict'">
            <PredictionView
              ref="predictionViewRef"
              :current-location="currentLocation"
            />
          </div>

          <!-- 记录页面 -->
          <div v-if="currentTab === 'record'">
            <RecordForm
              ref="recordFormRef"
              :current-location="currentLocation"
            />
          </div>

          <!-- 设置页面 -->
          <div v-if="currentTab === 'settings'" class="space-y-4">
            <LocationSetup
              :is-first-setup="false"
              @location-added="onLocationAdded"
            />

            <!-- 使用统计 -->
            <div class="bg-white rounded-xl shadow-lg p-4">
              <h3 class="text-lg font-semibold text-gray-800 mb-4">
                📊 使用统计
              </h3>
              <div class="grid grid-cols-2 gap-4 text-center">
                <div class="bg-blue-50 rounded-lg p-4">
                  <div class="text-2xl font-bold text-blue-600">
                    {{ totalRecords }}
                  </div>
                  <div class="text-sm text-blue-600 mt-1">总记录数</div>
                </div>
                <div class="bg-green-50 rounded-lg p-4">
                  <div class="text-2xl font-bold text-green-600">
                    {{ allLocations.length }}
                  </div>
                  <div class="text-sm text-green-600 mt-1">位置数量</div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <!-- 底部信息 -->
        <footer class="text-center mt-8 text-xs text-gray-500">
          <p>🔒 数据仅本地存储，保护您的隐私</p>
          <p class="mt-1">Version 0.1.0 | Made with ❤️</p>
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 添加一些过渡动画 */
.container {
  transition: all 0.3s ease;
}

/* Toast动画可以通过CSS类来优化 */
@keyframes slideInDown {
  from {
    transform: translate(-50%, -100%);
    opacity: 0;
  }
  to {
    transform: translate(-50%, 0);
    opacity: 1;
  }
}

/* 可以为toast添加动画类 */
.toast-enter {
  animation: slideInDown 0.3s ease;
}
</style>
