<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import RecordForm from "./components/RecordForm.vue";
import PredictionView from "./components/PredictionView.vue";
import LocationSetup from "./components/LocationSetup.vue";
import {
  StorageManager,
  ChineseCalendar,
  ComponentCleanup,
  PerformanceUtils,
} from "./utils";
import type { Location, ChineseDateType, ChineseDateInfo } from "./types";

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

// 节假日相关数据
const upcomingHolidays = ref<ChineseDateInfo[]>([]);
const currentMonthSpecialDates = ref<ChineseDateInfo[]>([]);

// 性能优化 - 组件清理管理器
const cleanup = new ComponentCleanup();

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
      "fixed top-3 left-1/2 transform -translate-x-1/2 bg-gray-900  px-4 py-2 rounded-xl shadow-xl z-50 font-medium text-sm";
    document.body.appendChild(toast);

    setTimeout(() => {
      document.body.removeChild(toast);
    }, 2000);
  } catch (error) {
    console.error("Quick record error:", error);
  }
};

// 计算预测精度
const getPredictionAccuracy = () => {
  if (totalRecords.value >= 100) return 95;
  if (totalRecords.value >= 50) return 85;
  if (totalRecords.value >= 30) return 75;
  if (totalRecords.value >= 20) return 65;
  if (totalRecords.value >= 10) return 55;
  return 45;
};

// 加载节假日信息
const loadHolidayInfo = () => {
  upcomingHolidays.value = ChineseCalendar.getUpcomingHolidays(3);
  currentMonthSpecialDates.value =
    ChineseCalendar.getCurrentMonthSpecialDates();
};

// 定期更新节假日信息（每小时检查一次）
const startHolidayInfoUpdater = () => {
  cleanup.createTimer(
    () => {
      loadHolidayInfo();
      console.log("节假日信息已更新");
    },
    3600000,
    true
  ); // 1小时 = 3600000ms
};

// 格式化节假日日期
const formatHolidayDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });
};

// 格式化特殊日期
const formatSpecialDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.getDate() + "日";
};

// 获取日期类型图标
const getDateTypeIcon = (type: ChineseDateType) => {
  return ChineseCalendar.getDateTypeIcon(type);
};

onMounted(() => {
  checkFirstTime();
  loadHolidayInfo();
  startHolidayInfoUpdater();

  // 输出性能调试信息
  console.log("App组件已挂载");
  console.log("性能工具调试信息:", PerformanceUtils.getDebugInfo());
});

// 组件卸载时清理
onUnmounted(() => {
  cleanup.cleanup();
  PerformanceUtils.clearAllTimers();
  console.log("App组件已卸载，所有定时器已清理");
});
</script>

<template>
  <div class="popup-container">
    <div class="container mx-auto p-2 max-w-full">
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

      <!-- 主界面 - 简化版 -->
      <div v-else-if="showMainInterface" class="animate-fade-in space-y-3">
        <!-- 头部 - 紧凑版 -->
        <header>
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <div class="text-lg">🚽</div>
                <div>
                  <h1 class="font-bold text-gray-900 text-sm">PeepCRX</h1>
                  <p class="text-xs text-gray-600">智能预测</p>
                </div>
              </div>

              <!-- 位置选择器 -->
              <button
                @click="showLocationPicker = !showLocationPicker"
                class="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded-lg transition-colors text-xs font-medium"
              >
                <span>📍 {{ currentLocation?.name }}</span>
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

            <!-- 位置下拉菜单 -->
            <div
              v-if="showLocationPicker"
              class="mt-3 pt-3 border-t border-gray-100"
            >
              <div class="space-y-1">
                <button
                  v-for="location in allLocations"
                  :key="location.id"
                  @click="switchLocation(location)"
                  :class="[
                    'w-full text-left px-2 py-1 rounded text-xs font-medium transition-all',
                    location.id === currentLocation?.id
                      ? 'bg-blue-600 '
                      : 'hover:bg-gray-50 text-gray-900',
                  ]"
                >
                  <div class="font-semibold">{{ location.name }}</div>
                  <div
                    :class="
                      location.id === currentLocation?.id
                        ? 'text-primary-500'
                        : 'text-gray-500'
                    "
                    class="text-xs"
                  >
                    {{ location.totalStalls }} 个坑位
                  </div>
                </button>

                <button
                  @click="
                    currentTab = 'settings';
                    showLocationPicker = false;
                  "
                  class="w-full px-2 py-1 rounded border border-dashed border-gray-300 hover:border-blue-400 text-gray-700 hover:text-blue-700 transition-all text-xs"
                >
                  + 添加新位置
                </button>
              </div>
            </div>

            <!-- 视觉降级的导航 -->
            <div class="mt-3 pt-3 border-t border-gray-100">
              <div class="flex items-center justify-center space-x-1">
                <button
                  @click="currentTab = 'predict'"
                  :class="[
                    'px-2 py-1 rounded text-xs font-medium transition-all',
                    currentTab === 'predict'
                      ? 'bg-gray-100 text-gray-800'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
                  ]"
                >
                  预测
                </button>
                <span class="text-gray-300 text-xs">|</span>
                <button
                  @click="currentTab = 'record'"
                  :class="[
                    'px-2 py-1 rounded text-xs font-medium transition-all',
                    currentTab === 'record'
                      ? 'bg-gray-100 text-gray-800'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
                  ]"
                >
                  记录
                </button>
                <span class="text-gray-300 text-xs">|</span>
                <button
                  @click="currentTab = 'settings'"
                  :class="[
                    'px-2 py-1 rounded text-xs font-medium transition-all',
                    currentTab === 'settings'
                      ? 'bg-gray-100 text-gray-800'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
                  ]"
                >
                  设置
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- 快速记录 - 紧凑版 -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
          <h3
            class="font-bold text-gray-900 mb-2 text-xs flex items-center justify-center"
          >
            <span class="text-sm mr-1">🚀</span>
            快速记录
          </h3>
          <div class="grid grid-cols-2 gap-2">
            <button
              @click="quickRecord(true)"
              class="bg-red-600 hover:bg-red-700 py-2 px-2 rounded-lg font-semibold transition-all text-xs"
            >
              <div class="text-base mb-0.5">😔</div>
              <div>厕所满了</div>
            </button>
            <button
              @click="quickRecord(false)"
              class="bg-green-600 hover:bg-green-700 py-2 px-2 rounded-lg font-semibold transition-all text-xs"
            >
              <div class="text-base mb-0.5">😊</div>
              <div>有空位</div>
            </button>
          </div>
        </div>

        <!-- 内容区域 -->
        <main>
          <div v-if="currentTab === 'predict'">
            <PredictionView
              ref="predictionViewRef"
              :current-location="currentLocation"
            />
          </div>

          <div v-if="currentTab === 'record'" class="space-y-3">
            <div
              class="bg-white rounded-xl shadow-sm border border-gray-200 p-3"
            >
              <h3
                class="text-sm font-bold text-gray-900 mb-3 flex items-center"
              >
                <span class="text-base mr-1">📝</span>
                详细记录
              </h3>
              <RecordForm
                ref="recordFormRef"
                :current-location="currentLocation"
              />
            </div>
          </div>

          <div v-if="currentTab === 'settings'" class="space-y-3">
            <!-- 位置管理 -->
            <div
              class="bg-white rounded-xl shadow-sm border border-gray-200 p-3"
            >
              <h3
                class="text-sm font-bold text-gray-900 mb-3 flex items-center"
              >
                <span class="text-base mr-1">📍</span>
                位置管理
              </h3>
              <LocationSetup
                :is-first-setup="false"
                @location-added="onLocationAdded"
              />
            </div>

            <!-- 使用统计 - 简化版 -->
            <div
              class="bg-white rounded-xl shadow-sm border border-gray-200 p-3"
            >
              <h3
                class="text-sm font-bold text-gray-900 mb-3 flex items-center"
              >
                <span class="text-base mr-1">📊</span>
                数据统计
              </h3>

              <!-- 核心统计数据 -->
              <div class="grid grid-cols-3 gap-2 text-center mb-3">
                <div class="bg-blue-50 rounded-lg p-2 border border-blue-100">
                  <div class="text-lg font-bold text-blue-700">
                    {{ totalRecords }}
                  </div>
                  <div class="text-xs text-blue-600 font-medium">记录数</div>
                </div>
                <div class="bg-green-50 rounded-lg p-2 border border-green-100">
                  <div class="text-lg font-bold text-green-700">
                    {{ allLocations.length }}
                  </div>
                  <div class="text-xs text-green-600 font-medium">位置数</div>
                </div>
                <div
                  class="bg-purple-50 rounded-lg p-2 border border-purple-100"
                >
                  <div class="text-lg font-bold text-purple-700">
                    {{ getPredictionAccuracy() }}%
                  </div>
                  <div class="text-xs text-purple-600 font-medium">
                    预测精度
                  </div>
                </div>
              </div>

              <!-- 精度等级 -->
              <div class="bg-gray-50 rounded-lg p-2">
                <div class="text-xs font-medium text-gray-900 mb-2">
                  精度等级
                </div>
                <div class="space-y-1">
                  <div class="flex items-center justify-between text-xs">
                    <div class="flex items-center">
                      <div
                        class="w-2 h-2 bg-orange-500 rounded-full mr-2"
                      ></div>
                      <span class="text-gray-700">初级 (0-20条)</span>
                    </div>
                    <span class="text-gray-600 font-mono">30分钟</span>
                  </div>
                  <div class="flex items-center justify-between text-xs">
                    <div class="flex items-center">
                      <div
                        class="w-2 h-2 bg-yellow-500 rounded-full mr-2"
                      ></div>
                      <span class="text-gray-700">中级 (20-30条)</span>
                    </div>
                    <span class="text-gray-600 font-mono">30分钟</span>
                  </div>
                  <div class="flex items-center justify-between text-xs">
                    <div class="flex items-center">
                      <div class="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                      <span class="text-gray-700">高级 (30-100条)</span>
                    </div>
                    <span class="text-gray-600 font-mono">15分钟</span>
                  </div>
                  <div class="flex items-center justify-between text-xs">
                    <div class="flex items-center">
                      <div class="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
                      <span class="text-gray-700">专家 (100+条)</span>
                    </div>
                    <span class="text-gray-600 font-mono">10分钟</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <!-- 极简底部信息 -->
        <footer class="text-center">
          <div class="text-xs text-gray-500 py-1">🔒 本地存储 · v0.2.0</div>
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Chrome扩展popup容器 */
.popup-container {
  width: 360px;
  height: 480px;
  min-height: 480px;
  max-height: 480px;
  overflow-y: auto;
  background: linear-gradient(to bottom right, #f9fafb, #eff6ff);
}

/* 响应式调整 */
@media (max-height: 500px) {
  .popup-container {
    height: 400px;
    min-height: 400px;
    max-height: 400px;
  }
}

/* 滚动条样式优化 */
.popup-container::-webkit-scrollbar {
  width: 4px;
}

.popup-container::-webkit-scrollbar-track {
  background: transparent;
}

.popup-container::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 2px;
}

.popup-container::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* 确保内容不会超出边界 */
.container {
  max-width: 100%;
  box-sizing: border-box;
}

/* 修复按钮和输入框在固定宽度下的显示 */
button,
input,
select {
  box-sizing: border-box;
}

/* 防止文字溢出 */
.truncate-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
