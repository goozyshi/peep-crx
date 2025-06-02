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

  await loadStats();
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
    if (currentLocation.value) {
      const records = await StorageManager.getRecordsByLocation(
        currentLocation.value.id
      );
      totalRecords.value = records.length;
    } else {
      const records = await StorageManager.getRecords();
      totalRecords.value = records.length;
    }
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

    // 刷新预测数据
    if (predictionViewRef.value) {
      predictionViewRef.value.loadData();
    }

    // 显示成功提示
    const message = isFull ? "已记录：厕所满了 😔" : "已记录：有空位 😊";

    // 简单的toast提示
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.className =
      "fixed top-3 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-xl shadow-xl z-50 font-medium text-sm";
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
  <div class="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
    <div class="container mx-auto p-3 max-w-md">
      <!-- 首次使用引导 -->
      <div v-if="isFirstTime" class="text-center animate-fade-in">
        <div
          class="bg-white rounded-2xl shadow-card border border-gray-100 p-6 mb-4"
        >
          <div class="text-6xl mb-4 animate-bounce">🚽</div>
          <h1 class="text-2xl font-bold text-gray-900 mb-2">
            欢迎使用 PeepCRX
          </h1>
          <p class="text-gray-700 mb-6">智能洗手间空位预测助手</p>

          <div
            class="bg-blue-50 rounded-xl p-4 mb-6 text-left border border-blue-100"
          >
            <h3 class="font-bold text-blue-900 mb-3 flex items-center text-sm">
              <span class="text-lg mr-2">🎯</span>
              如何使用：
            </h3>
            <ul class="text-blue-800 space-y-2 text-sm">
              <li class="flex items-start">
                <span class="text-blue-600 mr-2 mt-0.5 font-bold">•</span>
                <span>首次设置你常去的厕所位置</span>
              </li>
              <li class="flex items-start">
                <span class="text-blue-600 mr-2 mt-0.5 font-bold">•</span>
                <span>每次去厕所发现没位置时记录一下</span>
              </li>
              <li class="flex items-start">
                <span class="text-blue-600 mr-2 mt-0.5 font-bold">•</span>
                <span>系统会学习并预测最佳如厕时间</span>
              </li>
              <li class="flex items-start">
                <span class="text-blue-600 mr-2 mt-0.5 font-bold">•</span>
                <span>数据越多，预测越准确（建议30+条记录）</span>
              </li>
            </ul>
          </div>
        </div>

        <LocationSetup
          :is-first-setup="true"
          @location-added="onFirstSetupComplete"
        />
      </div>

      <!-- 主界面 -->
      <div v-else-if="showMainInterface" class="animate-fade-in">
        <!-- 头部 - 位置选择器 -->
        <header class="mb-4">
          <div
            class="bg-white rounded-2xl shadow-card border border-gray-100 p-4"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div class="text-2xl">🚽</div>
                <div>
                  <h1 class="font-bold text-gray-900 text-lg">PeepCRX</h1>
                  <p class="text-xs text-gray-600">智能预测助手</p>
                </div>
              </div>

              <!-- 位置切换按钮 -->
              <button
                @click="showLocationPicker = !showLocationPicker"
                class="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md font-medium"
              >
                <span class="text-sm">📍 {{ currentLocation?.name }}</span>
                <svg
                  class="w-3 h-3 transition-transform"
                  :class="{ 'rotate-180': showLocationPicker }"
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
            <div
              v-if="showLocationPicker"
              class="mt-4 pt-3 border-t border-gray-100"
            >
              <div class="space-y-2">
                <button
                  v-for="location in allLocations"
                  :key="location.id"
                  @click="switchLocation(location)"
                  :class="[
                    'w-full text-left px-3 py-2 rounded-lg transition-all duration-200 font-medium',
                    location.id === currentLocation?.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'hover:bg-gray-50 border border-gray-100 text-gray-900',
                  ]"
                >
                  <div class="font-semibold text-sm">{{ location.name }}</div>
                  <div
                    :class="
                      location.id === currentLocation?.id
                        ? 'text-blue-100'
                        : 'text-gray-600'
                    "
                    class="text-xs"
                  >
                    {{ location.totalStalls }} 个坑位
                  </div>
                </button>

                <!-- 添加新位置按钮 -->
                <button
                  @click="
                    currentTab = 'settings';
                    showLocationPicker = false;
                  "
                  class="w-full px-3 py-2 rounded-lg border border-dashed border-gray-300 hover:border-blue-400 text-gray-700 hover:text-blue-700 transition-all duration-200 hover:bg-blue-50"
                >
                  <div class="text-center">
                    <span class="text-lg">+</span>
                    <div class="text-xs font-medium">添加新位置</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- 快速记录按钮 -->
        <div class="mb-4">
          <div
            class="bg-white rounded-2xl shadow-card border border-gray-100 p-4"
          >
            <h3
              class="font-bold text-gray-900 mb-3 text-center text-sm flex items-center justify-center"
            >
              <span class="text-base mr-2">🚀</span>
              快速记录当前状态
            </h3>
            <div class="grid grid-cols-2 gap-3">
              <button
                @click="quickRecord(true)"
                class="bg-red-600 hover:bg-red-700 text-white py-3 px-3 rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <div class="text-xl mb-1">😔</div>
                <div class="text-sm">厕所满了</div>
                <div class="text-xs opacity-90">记录拥挤状态</div>
              </button>
              <button
                @click="quickRecord(false)"
                class="bg-green-600 hover:bg-green-700 text-white py-3 px-3 rounded-xl font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <div class="text-xl mb-1">😊</div>
                <div class="text-sm">有空位</div>
                <div class="text-xs opacity-90">记录空闲状态</div>
              </button>
            </div>
          </div>
        </div>

        <!-- 导航标签 -->
        <nav
          class="bg-white rounded-2xl shadow-card border border-gray-100 mb-4 overflow-hidden"
        >
          <div class="flex">
            <button
              @click="currentTab = 'predict'"
              :class="[
                'flex-1 py-3 px-3 text-xs font-semibold transition-all duration-200',
                currentTab === 'predict'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50',
              ]"
            >
              <div class="text-base mb-1">🔮</div>
              <div>智能预测</div>
            </button>
            <button
              @click="currentTab = 'record'"
              :class="[
                'flex-1 py-3 px-3 text-xs font-semibold transition-all duration-200 border-l border-gray-100',
                currentTab === 'record'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50',
              ]"
            >
              <div class="text-base mb-1">📝</div>
              <div>详细记录</div>
            </button>
            <button
              @click="currentTab = 'settings'"
              :class="[
                'flex-1 py-3 px-3 text-xs font-semibold transition-all duration-200 border-l border-gray-100',
                currentTab === 'settings'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50',
              ]"
            >
              <div class="text-base mb-1">⚙️</div>
              <div>设置</div>
            </button>
          </div>
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
            <div
              class="bg-white rounded-2xl shadow-card border border-gray-100 p-4"
            >
              <h3
                class="text-lg font-bold text-gray-900 mb-4 flex items-center"
              >
                <span class="text-xl mr-2">📊</span>
                使用统计
              </h3>
              <div class="grid grid-cols-2 gap-3 text-center">
                <div class="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <div class="text-2xl font-bold text-blue-700">
                    {{ totalRecords }}
                  </div>
                  <div class="text-xs text-blue-600 mt-1 font-medium">
                    当前位置记录数
                  </div>
                </div>
                <div class="bg-green-50 rounded-xl p-4 border border-green-100">
                  <div class="text-2xl font-bold text-green-700">
                    {{ allLocations.length }}
                  </div>
                  <div class="text-xs text-green-600 mt-1 font-medium">
                    位置数量
                  </div>
                </div>
              </div>

              <!-- 数据质量提示 - 更新精度说明 -->
              <div class="mt-4 p-3 bg-gray-50 rounded-xl">
                <div class="text-sm font-medium text-gray-900 mb-2">
                  预测精度指南：
                </div>
                <div class="text-xs text-gray-700 space-y-1">
                  <div class="flex items-center">
                    <span
                      class="w-2 h-2 bg-orange-500 rounded-full mr-2"
                    ></span>
                    <span>0-20条：30分钟精度，基础预测</span>
                  </div>
                  <div class="flex items-center">
                    <span
                      class="w-2 h-2 bg-yellow-500 rounded-full mr-2"
                    ></span>
                    <span>20-30条：30分钟精度，中等可靠</span>
                  </div>
                  <div class="flex items-center">
                    <span class="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                    <span>30-100条：15分钟精度，高可靠</span>
                  </div>
                  <div class="flex items-center">
                    <span class="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                    <span>100+条：10分钟精度，最高精度</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <!-- 底部信息 -->
        <footer class="text-center mt-6 text-xs text-gray-600">
          <div class="bg-white/80 rounded-xl p-3 border border-gray-100">
            <p class="flex items-center justify-center">
              <span class="text-green-600 mr-1">🔒</span>
              数据仅本地存储，保护您的隐私
            </p>
            <p class="mt-1">
              Version 0.2.0 | Made with <span class="text-red-600">❤️</span>
            </p>
          </div>
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped>
button:focus {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}
</style>
