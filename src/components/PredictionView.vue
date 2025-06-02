<template>
  <div class="space-y-3">
    <!-- 数据收集进度 + 当前状况 合并卡片 -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-3">
      <!-- 当前时段状况 -->
      <div class="mb-3">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center space-x-2">
            <h2 class="text-sm font-bold text-gray-900 flex items-center">
              <span class="text-base mr-1">🕐</span>
              当前状况
            </h2>
            <!-- 日期类型标签 -->
            <div
              v-if="currentDateInfo"
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
              :class="getDateTypeStyle(currentDateInfo.type)"
            >
              <span class="mr-1">{{
                getDateTypeIcon(currentDateInfo.type)
              }}</span>
              <span>{{ getDateTypeDisplayName(currentDateInfo.type) }}</span>
            </div>
          </div>
          <span
            v-if="currentPrediction"
            class="text-xs px-2 py-1 rounded-full font-medium"
            :class="getQualityColorClass(currentPrediction.dataQuality.level)"
          >
            {{ granularityText }}
          </span>
        </div>

        <!-- 节假日名称显示 -->
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

        <div v-if="isLoading" class="text-center py-4">
          <div class="inline-flex items-center">
            <div
              class="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"
            ></div>
            <span class="text-xs text-gray-600">分析中...</span>
          </div>
        </div>

        <div v-else-if="error" class="text-center py-3">
          <div class="text-red-600 text-xs">{{ error }}</div>
        </div>

        <div v-else-if="!currentPrediction" class="text-center py-3">
          <div class="text-xs text-gray-600">暂无数据，开始记录吧</div>
        </div>

        <div v-else class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <div class="text-2xl">
              {{ getBusyEmoji(currentPrediction.busyLevel) }}
            </div>
            <div>
              <div
                class="text-lg font-bold"
                :class="getBusyLevelColorText(currentPrediction.busyLevel)"
              >
                {{ Math.round(currentPrediction.busyLevel) }}% 繁忙
              </div>
              <div class="text-xs text-gray-600">
                {{ getRecommendation(currentPrediction.busyLevel) }}
              </div>
              <!-- 根据日期类型给出不同建议 -->
              <div v-if="currentDateInfo" class="text-xs text-gray-500 mt-0.5">
                {{
                  getDateTypeRecommendation(
                    currentDateInfo.type,
                    currentPrediction.busyLevel
                  )
                }}
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

      <!-- 数据收集进度条（数据不足时显示） -->
      <div
        v-if="dataProgress && dataProgress.qualityLevel !== 'high'"
        class="border-t border-gray-100 pt-3"
      >
        <div class="flex items-center justify-between mb-1">
          <span class="text-xs font-medium text-gray-700">数据收集进度</span>
          <span class="text-xs text-gray-600"
            >{{ dataProgress.currentRecords }}/{{
              dataProgress.targetRecords
            }}</span
          >
        </div>
        <div class="bg-gray-200 rounded-full h-1.5 mb-2">
          <div
            class="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
            :style="{ width: dataProgress.progressPercentage + '%' }"
          ></div>
        </div>
        <div class="text-xs text-gray-600">
          {{ dataProgress.recommendations[0] }}
        </div>
      </div>
    </div>

    <!-- 最佳时段推荐 - 紧凑网格 -->
    <div
      v-if="bestTimeSlots.length > 0"
      class="bg-white rounded-xl shadow-sm border border-gray-200 p-3"
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

      <div class="grid grid-cols-1 gap-2">
        <div
          v-for="(slot, index) in bestTimeSlots"
          :key="slot.prediction.timeSlot"
          class="relative flex items-center justify-between p-2 rounded-lg border transition-all duration-200 cursor-pointer hover:scale-[1.01]"
          :class="getBusyLevelStyle(slot.prediction.busyLevel)"
          @click="toggleSlotDetails(index)"
        >
          <!-- 排名 -->
          <div
            class="absolute -top-1 -left-1 w-4 h-4 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center text-[10px]"
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

          <!-- 展开详情 -->
          <div
            v-if="expandedSlot === index"
            class="absolute top-full left-0 right-0 mt-1 p-2 bg-white border rounded-lg shadow-lg z-10 text-xs"
          >
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span class="font-medium">置信度:</span>
                {{ Math.round(slot.prediction.confidence * 100) }}%
              </div>
              <div>
                <span class="font-medium">预测时间:</span>
                {{ formatTime(slot.prediction.startTime) }}
              </div>
            </div>
            <div class="mt-1 text-xs text-gray-600">{{ slot.reason }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 精简使用提示 -->
    <div class="bg-blue-50 rounded-xl p-3 border border-blue-100">
      <div class="flex items-start space-x-2">
        <div class="text-blue-600 text-sm">💡</div>
        <div class="text-blue-700 text-xs">
          <div class="font-medium mb-1">提示：</div>
          <div class="space-y-1">
            <div>🟢空闲 🟡适中 🔴繁忙 · 点击时段查看详情</div>
            <div>记录越多精度越高（100+条可达10分钟精度）</div>
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

// 组件状态
const bestTimeSlots = ref<BestTimeSlot[]>([]);
const currentPrediction = ref<PredictionResult | null>(null);
const dataProgress = ref<DataCollectionProgress | null>(null);
const currentDateInfo = ref<ChineseDateInfo | null>(null);
const isLoading = ref(false);
const error = ref<string>("");
const expandedSlot = ref<number | null>(null);

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
    bestTimeSlots.value = engine.generateBestTimeSlots(5);

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

// 切换时段详情展示
const toggleSlotDetails = (index: number) => {
  expandedSlot.value = expandedSlot.value === index ? null : index;
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
