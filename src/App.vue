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
const showFunctionMenu = ref(false);

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
      "fixed top-3 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-xl shadow-xl z-50 font-medium text-sm";
    document.body.appendChild(toast);

    setTimeout(() => {
      document.body.removeChild(toast);
    }, 2000);
  } catch (error) {
    console.error("Quick record error:", error);
  }
};

// 切换功能标签
const switchTab = (tab: string) => {
  currentTab.value = tab;
  showFunctionMenu.value = false;
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
    <div class="container mx-auto max-w-full">
      <!-- 首次使用引导 -->
      <div v-if="isFirstTime" class="text-center animate-fade-in p-4">
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

      <!-- 主界面 - 整合工具栏版 -->
      <div v-else-if="showMainInterface" class="animate-fade-in">
        <!-- 整合工具栏 -->
        <header class="bg-white border-b border-gray-200 p-2">
          <div class="flex items-center justify-between">
            <!-- 左侧：Logo + 位置选择 -->
            <div class="flex items-center space-x-2 min-w-0 flex-1">
              <div class="flex items-center space-x-1 flex-shrink-0">
                <div class="font-bold text-gray-900 leading-none text-2xl">
                  🚽 PeepCRX
                </div>
              </div>

              <!-- 位置选择器 - 超紧凑版 -->
              <div class="relative min-w-0 flex-1">
                <button
                  @click="
                    showLocationPicker = !showLocationPicker;
                    showFunctionMenu = false;
                  "
                  class="flex items-center space-x-1 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-xs w-full justify-between min-w-0"
                >
                  <span class="text-gray-700 truncate flex-1 text-left"
                    >📍 {{ currentLocation?.name }}</span
                  >
                  <svg
                    class="w-2.5 h-2.5 text-gray-500 transition-transform flex-shrink-0"
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

                <!-- 位置下拉菜单 -->
                <div
                  v-if="showLocationPicker"
                  class="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-20 w-full min-w-32"
                >
                  <div class="p-2 space-y-1">
                    <button
                      v-for="location in allLocations"
                      :key="location.id"
                      @click="switchLocation(location)"
                      :class="[
                        'w-full text-left px-2 py-1 rounded text-xs transition-all',
                        location.id === currentLocation?.id
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'hover:bg-gray-50 text-gray-900',
                      ]"
                    >
                      <div class="font-semibold truncate">
                        {{ location.name }}
                      </div>
                      <div
                        :class="
                          location.id === currentLocation?.id
                            ? 'text-blue-500'
                            : 'text-gray-500'
                        "
                        class="text-xs"
                      >
                        {{ location.totalStalls }} 个坑位
                      </div>
                    </button>

                    <button
                      @click="
                        switchTab('settings');
                        showLocationPicker = false;
                      "
                      class="w-full px-2 py-1 rounded border border-dashed border-gray-300 hover:border-blue-400 text-gray-700 hover:text-blue-700 transition-all text-xs"
                    >
                      + 添加新位置
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 右侧：功能菜单 -->
            <div class="relative flex-shrink-0">
              <button
                @click="
                  showFunctionMenu = !showFunctionMenu;
                  showLocationPicker = false;
                "
                class="flex items-center text-gray-600 hover:text-gray-900 transition-colors p-1"
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
                    d="M4 6h16M4 12h16M4 18h16"
                  ></path>
                </svg>
              </button>

              <!-- 功能下拉菜单 -->
              <div
                v-if="showFunctionMenu"
                class="absolute top-full right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-20 w-24"
              >
                <div class="p-1">
                  <button
                    @click="switchTab('predict')"
                    :class="[
                      'w-full text-left px-3 py-2 rounded text-xs transition-all flex items-center space-x-2',
                      currentTab === 'predict'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'hover:bg-gray-50 text-gray-700',
                    ]"
                  >
                    <span class="text-xs">🔮</span>
                    <span>预测</span>
                  </button>
                  <button
                    @click="switchTab('record')"
                    :class="[
                      'w-full text-left px-3 py-2 rounded text-xs transition-all flex items-center space-x-2',
                      currentTab === 'record'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'hover:bg-gray-50 text-gray-700',
                    ]"
                  >
                    <span class="text-xs">📝</span>
                    <span>记录</span>
                  </button>
                  <button
                    @click="switchTab('settings')"
                    :class="[
                      'w-full text-left px-3 py-2 rounded text-xs transition-all flex items-center space-x-2',
                      currentTab === 'settings'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'hover:bg-gray-50 text-gray-700',
                    ]"
                  >
                    <span class="text-xs">⚙️</span>
                    <span>设置</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        <!-- 内容区域 - 无额外边距 -->
        <main class="p-3">
          <!-- 预测视图 - 默认显示 -->
          <div v-if="currentTab === 'predict'">
            <PredictionView
              ref="predictionViewRef"
              :current-location="currentLocation"
              @quick-record="quickRecord"
            />
          </div>

          <!-- 记录视图 -->
          <div v-if="currentTab === 'record'">
            <div
              class="bg-white rounded-xl shadow-sm border border-gray-200 p-3"
            >
              <h3
                class="text-sm font-bold text-gray-900 mb-3 flex items-center"
              >
                <span class="text-base mr-2">📝</span>
                详细记录
              </h3>
              <RecordForm
                ref="recordFormRef"
                :current-location="currentLocation"
              />
            </div>
          </div>

          <!-- 设置视图 -->
          <div v-if="currentTab === 'settings'" class="space-y-3">
            <!-- 位置管理 -->
            <div
              class="bg-white rounded-xl shadow-sm border border-gray-200 p-3"
            >
              <h3
                class="text-sm font-bold text-gray-900 mb-3 flex items-center"
              >
                <span class="text-base mr-2">📍</span>
                位置管理
              </h3>
              <LocationSetup
                :is-first-setup="false"
                @location-added="onLocationAdded"
              />
            </div>

            <!-- 使用统计 -->
            <div
              class="bg-white rounded-xl shadow-sm border border-gray-200 p-3"
            >
              <h3
                class="text-sm font-bold text-gray-900 mb-3 flex items-center"
              >
                <span class="text-base mr-2">📊</span>
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

              <!-- 精度等级说明 -->
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
        <footer class="text-center pb-2">
          <div class="text-xs text-gray-500">🔒 所有数据本地存储 · v0.2.1</div>
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
  width: 0px;
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

/* 下拉菜单点击外部关闭 */
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

/* 确保下拉菜单在合适的层级 */
.relative {
  position: relative;
}
</style>
