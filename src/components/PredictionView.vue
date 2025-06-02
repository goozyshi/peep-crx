<template>
  <div class="space-y-4">
    <!-- 数据收集进度（数据不足时显示） -->
    <div
      v-if="dataProgress && dataProgress.qualityLevel !== 'high'"
      class="bg-white rounded-2xl shadow-card border border-gray-100 p-4"
    >
      <div class="flex items-start space-x-3">
        <div class="text-2xl">📊</div>
        <div class="flex-1">
          <h3 class="font-bold text-gray-900 mb-2">数据收集进度</h3>
          <div class="bg-gray-200 rounded-full h-2 mb-3">
            <div
              class="bg-blue-600 h-2 rounded-full transition-all duration-300"
              :style="{ width: dataProgress.progressPercentage + '%' }"
            ></div>
          </div>
          <div class="text-sm text-gray-700 mb-2">
            已收集 {{ dataProgress.currentRecords }} /
            {{ dataProgress.targetRecords }} 条记录 ({{
              Math.round(dataProgress.progressPercentage)
            }}%)
          </div>
          <ul class="text-xs text-gray-600 space-y-1">
            <li
              v-for="tip in dataProgress.recommendations"
              :key="tip"
              class="flex items-start"
            >
              <span class="text-blue-500 mr-2">•</span>
              <span>{{ tip }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- 当前时段预测 -->
    <div class="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
      <div class="text-center">
        <h2
          class="text-lg font-bold text-gray-900 mb-4 flex items-center justify-center"
        >
          <span class="text-xl mr-2">🕐</span>
          当前时段状况
        </h2>

        <div v-if="isLoading" class="py-8">
          <div class="relative mx-auto w-12 h-12">
            <div
              class="absolute inset-0 rounded-full border-4 border-primary-100"
            ></div>
            <div
              class="absolute inset-0 rounded-full border-4 border-primary-600 border-t-transparent animate-spin"
            ></div>
          </div>
          <p class="text-gray-600 mt-3 font-medium text-sm">正在分析数据...</p>
        </div>

        <div v-else-if="error" class="py-8">
          <div class="text-4xl mb-3">⚠️</div>
          <div class="bg-danger-50 border border-danger-200 rounded-xl p-3">
            <p class="text-danger-700 font-medium text-sm">{{ error }}</p>
          </div>
        </div>

        <div v-else-if="!currentPrediction" class="py-8">
          <div class="text-4xl mb-4">📊</div>
          <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <h3 class="font-bold text-gray-900 mb-2">暂无数据</h3>
            <p class="text-gray-600 text-sm">
              开始记录厕所使用情况，<br />
              系统将为您生成智能预测
            </p>
          </div>
        </div>

        <div v-else>
          <div class="space-y-4">
            <div class="text-6xl">
              {{ getBusyEmoji(currentPrediction.busyLevel) }}
            </div>
            <div
              class="rounded-xl p-4 border"
              :class="getBusyLevelStyle(currentPrediction.busyLevel)"
            >
              <div class="text-3xl font-bold mb-1">
                {{ Math.round(currentPrediction.busyLevel) }}% 繁忙
              </div>
              <div class="text-sm font-medium opacity-90">
                {{ getRecommendation(currentPrediction.busyLevel) }}
              </div>
            </div>

            <!-- 数据质量指示器 -->
            <div
              class="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium border"
              :class="getQualityColorClass(currentPrediction.dataQuality.level)"
            >
              <span class="mr-2">{{ currentPrediction.dataQuality.icon }}</span>
              <span>{{ currentPrediction.dataQuality.text }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 最佳时段推荐 -->
    <div
      v-if="bestTimeSlots.length > 0"
      class="bg-white rounded-2xl shadow-card border border-gray-100 p-4"
    >
      <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center">
        <span class="text-xl mr-2">⭐</span>
        推荐时段
        <span
          class="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full"
        >
          {{ granularityText }}
        </span>
      </h3>

      <div class="space-y-3">
        <div
          v-for="(slot, index) in bestTimeSlots"
          :key="slot.prediction.timeSlot"
          class="relative p-4 rounded-xl border transition-all duration-200 cursor-pointer hover:scale-[1.02]"
          :class="getBusyLevelStyle(slot.prediction.busyLevel)"
          @click="toggleSlotDetails(index)"
        >
          <!-- 排名徽章 -->
          <div
            class="absolute -top-2 -left-2 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center"
          >
            {{ index + 1 }}
          </div>

          <div class="flex items-center justify-between">
            <div>
              <div class="font-bold text-sm mb-1">
                {{ slot.prediction.timeSlot }}
              </div>
              <div class="text-xs opacity-75 mb-2">{{ slot.reason }}</div>
              <div class="flex items-center space-x-3 text-xs">
                <span class="font-semibold"
                  >{{ Math.round(slot.prediction.busyLevel) }}% 繁忙</span
                >
                <span
                  :class="
                    getQualityColorClass(
                      slot.prediction.dataQuality.level
                    ).split(' ')[0]
                  "
                >
                  {{ slot.prediction.dataQuality.icon }}
                  {{ slot.prediction.sampleSize }}条数据
                </span>
              </div>
            </div>

            <div class="text-right">
              <div class="text-2xl mb-1">
                {{ getBusyEmoji(slot.prediction.busyLevel) }}
              </div>
              <div class="text-xs opacity-75">
                评分 {{ Math.round(slot.score * 100) }}
              </div>
            </div>
          </div>

          <!-- 展开的详细信息 -->
          <div
            v-if="expandedSlot === index"
            class="mt-4 pt-4 border-t border-black/10 text-xs space-y-2"
          >
            <div class="grid grid-cols-2 gap-4">
              <div>
                <span class="font-medium">置信度:</span>
                {{ Math.round(slot.prediction.confidence * 100) }}%
              </div>
              <div>
                <span class="font-medium">数据颗粒度:</span>
                {{ granularityText }}
              </div>
              <div>
                <span class="font-medium">预测时间:</span>
                {{ formatTime(slot.prediction.startTime) }}
              </div>
              <div>
                <span class="font-medium">样本数量:</span>
                {{ slot.prediction.sampleSize }} 条
              </div>
            </div>
            <div class="mt-3 p-2 bg-black/5 rounded">
              <span class="font-medium">数据质量:</span>
              {{ slot.prediction.dataQuality.text }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 使用提示 -->
    <div class="bg-primary-50 rounded-2xl p-4 border border-primary-100">
      <div class="flex items-start space-x-3">
        <div class="text-primary-600 text-xl">💡</div>
        <div class="text-primary-700">
          <div class="font-bold mb-3 text-lg">使用提示：</div>
          <ul class="space-y-2 text-sm">
            <li class="flex items-start">
              <span class="text-green-500 mr-3 mt-1">🟢</span>
              <span>绿色时段：空位较多，强烈推荐</span>
            </li>
            <li class="flex items-start">
              <span class="text-yellow-500 mr-3 mt-1">🟡</span>
              <span>黄色时段：适中，可以前往</span>
            </li>
            <li class="flex items-start">
              <span class="text-red-500 mr-3 mt-1">🔴</span>
              <span>红色时段：较忙，建议避开</span>
            </li>
            <li class="flex items-start">
              <span class="text-purple-500 mr-3 mt-1">📈</span>
              <span>记录越多，精度越高（最高10分钟精度）</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from "vue";
import { StorageManager, PredictionEngine, DataQualityUtils } from "../utils";
import type {
  Location,
  PredictionResult,
  BestTimeSlot,
  DataCollectionProgress,
  TimeGranularity,
} from "../types";

// Props
const props = defineProps<{
  currentLocation: Location | null;
}>();

// 组件状态
const bestTimeSlots = ref<BestTimeSlot[]>([]);
const currentPrediction = ref<PredictionResult | null>(null);
const dataProgress = ref<DataCollectionProgress | null>(null);
const isLoading = ref(false);
const error = ref<string>("");
const expandedSlot = ref<number | null>(null);

// 计算属性
const granularityText = computed(() => {
  if (!currentPrediction.value) return "";
  switch (currentPrediction.value.granularity) {
    case "10min":
      return "10分钟精度";
    case "15min":
      return "15分钟精度";
    case "30min":
      return "30分钟精度";
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
    error.value = "加载预测数据失败";
    console.error("Load predictions error:", err);
  } finally {
    isLoading.value = false;
  }
};

// 切换时段详情展示
const toggleSlotDetails = (index: number) => {
  expandedSlot.value = expandedSlot.value === index ? null : index;
};

// 获取忙碌程度的样式
const getBusyLevelStyle = (level: number) => {
  if (level >= 70)
    return "bg-gradient-to-br from-red-100 to-red-200 text-red-800 border-red-300 hover:from-red-200 hover:to-red-300";
  if (level >= 50)
    return "bg-gradient-to-br from-orange-100 to-orange-200 text-orange-800 border-orange-300 hover:from-orange-200 hover:to-orange-300";
  if (level >= 30)
    return "bg-gradient-to-br from-yellow-100 to-yellow-200 text-yellow-800 border-yellow-300 hover:from-yellow-200 hover:to-yellow-300";
  return "bg-gradient-to-br from-green-100 to-green-200 text-green-800 border-green-300 hover:from-green-200 hover:to-green-300";
};

// 获取数据质量颜色类
const getQualityColorClass = (level: string) => {
  return DataQualityUtils.getQualityColorClass(level as any);
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
  if (level >= 70) return "建议等待或稍后再来";
  if (level >= 50) return "可能需要等待";
  if (level >= 30) return "适中，可以前往";
  return "空位较多，推荐时段";
};

// 格式化时间
const formatTime = (date: Date) => {
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
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

onMounted(() => {
  loadPredictions();
});
</script>
