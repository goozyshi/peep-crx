<template>
  <div class="space-y-3 overflow-visible">
    <!-- 当前状况 + 快速记录 整合卡片 -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
      <!-- 当前时段状况 - 精简版 -->
      <div class="mb-3">
        <div class="flex items-center justify-between mb-2">
          <div class="flex flex-col">
            <h2 class="text-sm font-bold text-gray-900 flex items-center">
              <span class="text-base mr-1">🕐</span>
              当前状况
            </h2>
            <!-- 当前时间显示 -->
            <div class="text-xs text-gray-600 mt-0.5 font-mono">
              {{ formattedCurrentTime }}
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <!-- 日期类型标签 -->
            <div
              v-if="currentDateInfo"
              class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border"
              :class="getDateTypeStyle(currentDateInfo.type)"
            >
              <span class="mr-1">{{
                getDateTypeIcon(currentDateInfo.type)
              }}</span>
              <span>{{ getDateTypeDisplayName(currentDateInfo.type) }}</span>
            </div>
            <!-- 精度标签 -->
            <span
              v-if="currentPrediction"
              class="text-xs px-1.5 py-0.5 rounded font-medium"
              :class="getQualityColorClass(currentPrediction.dataQuality.level)"
            >
              {{ granularityText }}
            </span>
          </div>
        </div>

        <!-- 节假日名称显示 - 精简 -->
        <div
          v-if="
            currentDateInfo &&
            currentDateInfo.name &&
            (currentDateInfo.type === 'holiday' ||
              currentDateInfo.type === 'compensatory_holiday')
          "
          class="mb-2 text-xs text-gray-600 flex items-center"
        >
          <span class="mr-1">🎊</span>
          <span>{{ currentDateInfo.name }}</span>
          <span
            v-if="currentDateInfo.type === 'compensatory_holiday'"
            class="ml-1 text-orange-600"
            >(调休)</span
          >
        </div>

        <!-- 状态显示区域 -->
        <div v-if="isLoading" class="text-center py-3">
          <div class="inline-flex items-center">
            <div
              class="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"
            ></div>
            <span class="text-xs text-gray-600">分析中...</span>
          </div>
        </div>

        <div v-else-if="error" class="text-center py-2">
          <div class="text-red-600 text-xs">{{ error }}</div>
        </div>

        <div v-else-if="!currentPrediction" class="text-center py-2">
          <div class="text-xs text-gray-600">暂无数据，开始记录吧</div>
        </div>

        <div v-else class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="text-xl">
              {{ getBusyEmoji(currentPrediction.busyLevel) }}
            </div>
            <div>
              <div
                class="text-base font-bold"
                :class="getBusyLevelColorText(currentPrediction.busyLevel)"
              >
                {{ Math.round(currentPrediction.busyLevel) }}% 繁忙
              </div>
              <div class="text-xs text-gray-600">
                {{ getRecommendation(currentPrediction.busyLevel) }}
              </div>
            </div>
          </div>
          <div class="text-right text-xs text-gray-500">
            <div>
              {{ currentPrediction.dataQuality.icon }}
              {{ currentPrediction.sampleSize }}条
            </div>
            <div>{{ Math.round(currentPrediction.confidence * 100) }}%可信</div>
          </div>
        </div>
      </div>

      <!-- 快速记录区域 - 简化动画 -->
      <Transition
        name="fade-slide"
        enter-active-class="transition-all duration-200 ease-out"
        leave-active-class="transition-all duration-250 ease-in"
        enter-from-class="opacity-0 translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-1"
      >
        <div v-if="showQuickRecord" class="border-t border-gray-100 pt-3">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-xs font-bold text-gray-900 flex items-center">
              <span class="text-sm mr-1">🚀</span>
              快速记录现在的情况
            </h3>
            <div class="text-xs text-gray-500 font-mono">
              {{ formatTime(currentTime) }}
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2 mb-3">
            <button
              @click="handleQuickRecord(true)"
              :disabled="isRecordingAnimating"
              class="bg-red-600 hover:bg-red-700 disabled:opacity-75 disabled:cursor-not-allowed py-2 px-3 rounded-lg font-semibold transition-all text-xs flex flex-col items-center space-y-1"
              :class="{ 'animate-pulse': isRecordingAnimating }"
            >
              <div class="text-base">😔</div>
              <div>厕所满了</div>
            </button>
            <button
              @click="handleQuickRecord(false)"
              :disabled="isRecordingAnimating"
              class="bg-green-600 hover:bg-green-700 disabled:opacity-75 disabled:cursor-not-allowed py-2 px-3 rounded-lg font-semibold transition-all text-xs flex flex-col items-center space-y-1"
              :class="{ 'animate-pulse': isRecordingAnimating }"
            >
              <div class="text-base">😊</div>
              <div>有空位</div>
            </button>
          </div>

          <!-- 数据收集进度子卡片 - 移到快速记录底部 -->
          <div
            v-if="dataProgress && dataProgress.qualityLevel !== 'high'"
            class="bg-gray-50 rounded-lg p-2 border border-gray-200"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-medium text-gray-700 flex items-center">
                <span class="mr-1">📊</span>
                数据收集进度
              </span>
              <span class="text-xs text-gray-600"
                >{{ dataProgress.currentRecords }}/{{
                  dataProgress.targetRecords
                }}</span
              >
            </div>
            <div class="bg-gray-200 rounded-full h-1.5 mb-1">
              <div
                class="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                :style="{ width: dataProgress.progressPercentage + '%' }"
              ></div>
            </div>
            <div class="text-xs text-gray-600">
              {{ dataProgress.recommendations[0] }}
            </div>
          </div>

          <!-- 记录提示（当数据充足时显示） -->
          <div
            v-if="!dataProgress || dataProgress.qualityLevel === 'high'"
            class="text-xs text-gray-500 text-center"
          >
            记录越多，预测越准确
          </div>
        </div>
      </Transition>

      <!-- 记录成功后的提示 -->
      <Transition
        name="fade-in"
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 translate-y-1"
        enter-to-class="opacity-100 translate-y-0"
      >
        <div
          v-if="!showQuickRecord"
          class="border-t border-gray-100 pt-3 text-center"
        >
          <div class="text-green-600 text-sm mb-2">✅ 记录成功</div>
          <div class="text-xs text-gray-500">重新打开扩展时可以继续记录</div>
        </div>
      </Transition>
    </div>

    <!-- 最佳时段推荐 - 修复overflow问题 -->
    <div
      v-if="bestTimeSlots.length > 0"
      class="bg-white rounded-xl shadow-sm border border-gray-200 p-3 overflow-visible"
    >
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-bold text-gray-900 flex items-center">
          <span class="text-base mr-1">⭐</span>
          推荐时段
        </h3>
        <div class="text-xs text-gray-500">
          {{ bestTimeSlots.length }}个推荐
        </div>
      </div>

      <div class="grid grid-cols-1 gap-2 overflow-visible">
        <div
          v-for="(slot, index) in bestTimeSlots"
          :key="slot.prediction.timeSlot"
          class="relative flex items-center justify-between p-2 rounded-lg border transition-all duration-200 cursor-pointer hover:scale-[1.01] overflow-visible"
          :class="getBusyLevelStyle(slot.prediction.busyLevel)"
          @mouseenter="expandedSlot = index"
          @mouseleave="expandedSlot = null"
        >
          <!-- 排名 -->
          <div
            class="absolute -top-1 -left-1 w-4 h-4 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center text-[10px] z-10"
          >
            {{ index + 1 }}
          </div>

          <div class="flex-1 min-w-0 ml-2">
            <div class="flex items-center justify-between">
              <div class="text-xs font-semibold truncate">
                {{ slot.prediction.timeSlot }}
              </div>
              <div class="text-lg ml-2">
                {{ getBusyEmoji(slot.prediction.busyLevel) }}
              </div>
            </div>
            <div
              class="flex items-center justify-between text-xs opacity-75 mt-0.5"
            >
              <span>{{ Math.round(slot.prediction.busyLevel) }}%繁忙</span>
              <span
                >{{ slot.prediction.sampleSize }}条 · 评分{{
                  Math.round(slot.score * 100)
                }}</span
              >
            </div>
          </div>

          <!-- 鼠标悬浮详情 - 最高层级，简洁数据布局 -->
          <Teleport to="body">
            <div
              v-if="expandedSlot === index"
              class="fixed px-2 py-1.5 bg-white border border-gray-300 rounded shadow-lg text-xs pointer-events-none"
              :style="{
                zIndex: 9999,
                left: '10px',
                top: `${180 + index * 60}px`,
                width: '200px',
              }"
            >
              <!-- 简化的数据展示 -->
              <div class="space-y-1">
                <div class="flex justify-between items-center">
                  <span class="text-gray-600">置信度</span>
                  <span class="font-semibold text-blue-600"
                    >{{ Math.round(slot.prediction.confidence * 100) }}%</span
                  >
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-600">样本</span>
                  <span class="font-semibold"
                    >{{ slot.prediction.sampleSize }}条</span
                  >
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-600">评分</span>
                  <span class="font-semibold text-green-600">{{
                    Math.round(slot.score * 100)
                  }}</span>
                </div>
              </div>

              <!-- 简化指示箭头 -->
              <div
                class="absolute left-0 top-2 w-0 h-0 border-t-2 border-b-2 border-r-2 border-transparent border-r-gray-300 -translate-x-0.5"
              ></div>
            </div>
          </Teleport>
        </div>
      </div>
    </div>

    <!-- 精简使用提示 -->
    <div class="bg-blue-50 rounded-xl p-3 border border-blue-100">
      <div class="flex items-start space-x-2">
        <div class="text-blue-600 text-xl">💡</div>
        <div class="text-blue-700 text-xs">
          <div class="space-y-1">
            <div>🟢 空闲 🟡 适中 🔴 繁忙</div>
            <div class="text-gray-600">
              记录越多精度越高（100+条可达10分钟精度）
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import {
  StorageManager,
  PredictionEngine,
  DataQualityUtils,
  ChineseCalendar,
  ComponentCleanup,
} from "../utils";
import type {
  Location,
  PredictionResult,
  BestTimeSlot,
  DataCollectionProgress,
  TimeGranularity,
  ChineseDateType,
  ChineseDateInfo,
} from "../types";

// Props
const props = defineProps<{
  currentLocation: Location | null;
}>();

// 添加 emit 定义
const emit = defineEmits<{
  "quick-record": [isFull: boolean];
}>();

// 组件状态
const bestTimeSlots = ref<BestTimeSlot[]>([]);
const currentPrediction = ref<PredictionResult | null>(null);
const dataProgress = ref<DataCollectionProgress | null>(null);
const currentDateInfo = ref<ChineseDateInfo | null>(null);
const isLoading = ref(false);
const error = ref<string>("");
const expandedSlot = ref<number | null>(null);

// 快速记录卡片显示状态
const showQuickRecord = ref(true);
const isRecordingAnimating = ref(false);

// 当前时间状态
const currentTime = ref(new Date());

// 性能优化 - 组件清理管理器
const cleanup = new ComponentCleanup();

// 计算属性
const granularityText = computed(() => {
  if (!currentPrediction.value) return "";
  switch (currentPrediction.value.granularity) {
    case "10min":
      return "10分钟";
    case "15min":
      return "15分钟";
    case "30min":
      return "30分钟";
    default:
      return "";
  }
});

// 格式化当前时间显示
const formattedCurrentTime = computed(() => {
  return currentTime.value.toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
});

// 更新当前时间
const updateCurrentTime = () => {
  currentTime.value = new Date();
};

// 启动时间更新器
const startTimeUpdater = () => {
  // 每秒更新一次当前时间
  cleanup.createTimer(updateCurrentTime, 1000, true);
};

// 处理快速记录 - 简化动画
const handleQuickRecord = async (isFull: boolean) => {
  isRecordingAnimating.value = true;

  // 触发父组件的记录逻辑
  emit("quick-record", isFull);

  // 缩短延迟时间，快速隐藏卡片
  setTimeout(() => {
    showQuickRecord.value = false;
    isRecordingAnimating.value = false;
  }, 300); // 0.3秒后隐藏
};

// 加载预测数据
const loadPredictions = async () => {
  if (!props.currentLocation) return;

  isLoading.value = true;
  error.value = "";

  try {
    // 获取当前日期信息
    currentDateInfo.value = ChineseCalendar.getDateInfo(new Date());

    const records = await StorageManager.getRecordsByLocation(
      props.currentLocation.id
    );

    if (records.length === 0) {
      bestTimeSlots.value = [];
      currentPrediction.value = null;
      dataProgress.value = DataQualityUtils.getDataCollectionProgress(0);
      return;
    }

    const engine = new PredictionEngine(
      records,
      props.currentLocation.totalStalls
    );

    // 获取最佳时段
    bestTimeSlots.value = engine.generateBestTimeSlots(3);

    // 获取当前时段预测
    currentPrediction.value = engine.getCurrentPrediction();

    // 获取数据收集进度
    dataProgress.value = engine.getDataCollectionProgress();
  } catch (err) {
    error.value = "加载失败";
    console.error("Load predictions error:", err);
  } finally {
    isLoading.value = false;
  }
};

// 检查日期变化 - 使用rAF替代setInterval
const startDateChecker = () => {
  let lastDateString = currentDateInfo.value?.date || "";

  const checkDateChange = () => {
    const newDateInfo = ChineseCalendar.getDateInfo(new Date());
    const newDateString = newDateInfo.date;

    if (newDateString !== lastDateString) {
      console.log("日期发生变化:", lastDateString, "->", newDateString);
      currentDateInfo.value = newDateInfo;
      lastDateString = newDateString;

      // 日期变化时重新加载预测
      loadPredictions();
    }
  };

  // 每分钟检查一次日期变化（60000ms），使用页面可见性感知
  cleanup.createTimer(checkDateChange, 60000, true);
};

// 获取忙碌程度的样式
const getBusyLevelStyle = (level: number) => {
  if (level >= 70)
    return "bg-red-50 text-red-800 border-red-200 hover:bg-red-100";
  if (level >= 50)
    return "bg-orange-50 text-orange-800 border-orange-200 hover:bg-orange-100";
  if (level >= 30)
    return "bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100";
  return "bg-green-50 text-green-800 border-green-200 hover:bg-green-100";
};

// 获取忙碌程度的文字颜色
const getBusyLevelColorText = (level: number) => {
  if (level >= 70) return "text-red-700";
  if (level >= 50) return "text-orange-700";
  if (level >= 30) return "text-yellow-700";
  return "text-green-700";
};

// 获取数据质量颜色类
const getQualityColorClass = (level: string) => {
  switch (level) {
    case "high":
      return "text-green-700 bg-green-100 border-green-200";
    case "medium":
      return "text-yellow-700 bg-yellow-100 border-yellow-200";
    case "low":
      return "text-orange-700 bg-orange-100 border-orange-200";
    default:
      return "text-gray-700 bg-gray-100 border-gray-200";
  }
};

// 获取忙碌程度的emoji
const getBusyEmoji = (level: number) => {
  if (level >= 70) return "🔴";
  if (level >= 50) return "🟠";
  if (level >= 30) return "🟡";
  return "🟢";
};

// 获取建议文本
const getRecommendation = (level: number) => {
  if (level >= 70) return "建议等待";
  if (level >= 50) return "可能等待";
  if (level >= 30) return "可以前往";
  return "推荐时段";
};

// 格式化时间
const formatTime = (date: Date) => {
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// 获取日期类型样式
const getDateTypeStyle = (type: ChineseDateType) => {
  return ChineseCalendar.getDateTypeStyle(type);
};

// 获取日期类型显示名称
const getDateTypeDisplayName = (type: ChineseDateType) => {
  return ChineseCalendar.getDateTypeDisplayName(type);
};

// 获取日期类型图标
const getDateTypeIcon = (type: ChineseDateType) => {
  return ChineseCalendar.getDateTypeIcon(type);
};

// 根据日期类型给出建议
const getDateTypeRecommendation = (
  type: ChineseDateType,
  busyLevel: number
) => {
  switch (type) {
    case "workday":
      if (busyLevel > 70) return "工作日高峰期，建议错峰";
      return "工作日正常时段";
    case "weekend":
      return "周末时段，相对宽松";
    case "holiday":
      return "节假日，使用模式可能异常";
    case "makeup_workday":
      if (busyLevel > 60) return "调休工作日，可能比平时更忙";
      return "调休工作日";
    case "compensatory_holiday":
      return "调休假期，享受假期时光";
    default:
      return "";
  }
};

// 暴露方法给父组件
const loadData = loadPredictions;
const setCurrentLocation = () => loadPredictions();

defineExpose({
  loadData,
  setCurrentLocation,
});

// 监听位置变化
watch(() => props.currentLocation, loadPredictions, { immediate: true });

// 组件挂载
onMounted(() => {
  // 重新打开扩展时显示快速记录卡片
  showQuickRecord.value = true;

  // 启动时间更新器
  startTimeUpdater();

  loadPredictions();
  startDateChecker();

  // 输出性能调试信息
  console.log(
    "PredictionView组件已挂载，活跃定时器数:",
    cleanup.constructor.name
  );
});

// 组件卸载时清理所有定时器
onUnmounted(() => {
  cleanup.cleanup();
  console.log("PredictionView组件已卸载，所有定时器已清理");
});
</script>

<style scoped>
/* 简化的淡入淡出动画 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.fade-in-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.fade-in-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
</style>
