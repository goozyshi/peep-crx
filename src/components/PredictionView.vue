<template>
  <div class="space-y-4">
    <!-- 当前时段预测 -->
    <div class="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
      <div class="text-center">
        <h2
          class="text-lg font-bold text-gray-900 mb-4 flex items-center justify-center"
        >
          <span class="text-xl mr-2">🕐</span>
          当前时段预测
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

        <div v-else-if="predictions.length === 0" class="py-8">
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
          <div v-if="getCurrentPrediction()" class="space-y-4">
            <div class="text-6xl">
              {{ getBusyEmoji(getCurrentPrediction()!.busyLevel) }}
            </div>
            <div class="bg-primary-50 rounded-xl p-4 border border-primary-100">
              <div class="text-3xl font-bold text-primary-800 mb-1">
                {{ Math.round(getCurrentPrediction()!.busyLevel) }}% 繁忙
              </div>
              <div class="text-gray-700 font-medium">
                {{ getRecommendation(getCurrentPrediction()!.busyLevel) }}
              </div>
            </div>
          </div>

          <div v-else class="space-y-4">
            <div class="text-4xl">❓</div>
            <div class="bg-warning-50 rounded-xl p-4 border border-warning-200">
              <div class="font-bold text-gray-900 mb-1">当前时段数据不足</div>
              <div class="text-gray-700 text-sm">请查看下方全天预测</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 全天预测时段 -->
    <div
      v-if="predictions.length > 0"
      class="bg-white rounded-2xl shadow-card border border-gray-100 p-4"
    >
      <h3 class="text-lg font-bold text-gray-900 mb-4 flex items-center">
        <span class="text-xl mr-2">📅</span>
        全天预测时段
      </h3>

      <div class="grid grid-cols-2 gap-2">
        <div
          v-for="prediction in predictions"
          :key="prediction.timeSlot"
          :class="[
            'p-3 rounded-xl border text-center transition-all duration-200 cursor-pointer hover:scale-105',
            getBusyLevelStyle(prediction.busyLevel),
          ]"
        >
          <div class="font-bold text-xs mb-1">{{ prediction.timeSlot }}</div>
          <div class="text-lg mb-1">
            {{ getBusyEmoji(prediction.busyLevel) }}
          </div>
          <div class="text-xs font-semibold">
            {{ Math.round(prediction.busyLevel) }}%
          </div>
          <div class="text-xs opacity-75">
            {{ getBusyLevelText(prediction.busyLevel) }}
          </div>
        </div>
      </div>

      <!-- 图例 -->
      <div class="mt-4 pt-4 border-t border-gray-100">
        <div class="text-xs text-gray-700 mb-2 font-medium">繁忙程度图例：</div>
        <div class="grid grid-cols-4 gap-1 text-xs">
          <div
            class="flex flex-col items-center p-2 bg-success-50 rounded-lg border border-success-200"
          >
            <span class="w-2 h-2 bg-success-500 rounded-full mb-1"></span>
            <span class="text-success-700 font-medium">空闲</span>
          </div>
          <div
            class="flex flex-col items-center p-2 bg-warning-50 rounded-lg border border-warning-200"
          >
            <span class="w-2 h-2 bg-warning-500 rounded-full mb-1"></span>
            <span class="text-warning-700 font-medium">适中</span>
          </div>
          <div
            class="flex flex-col items-center p-2 bg-warning-50 rounded-lg border border-warning-300"
          >
            <span class="w-2 h-2 bg-warning-600 rounded-full mb-1"></span>
            <span class="text-warning-800 font-medium">繁忙</span>
          </div>
          <div
            class="flex flex-col items-center p-2 bg-danger-50 rounded-lg border border-danger-200"
          >
            <span class="w-2 h-2 bg-danger-500 rounded-full mb-1"></span>
            <span class="text-danger-700 font-medium">拥挤</span>
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
              <span>绿色时段：空位较多，推荐前往</span>
            </li>
            <li class="flex items-start">
              <span class="text-red-500 mr-3 mt-1">🔴</span>
              <span>红色时段：建议避开或等待</span>
            </li>
            <li class="flex items-start">
              <span class="text-blue-500 mr-3 mt-1">📊</span>
              <span>数据基于历史记录，仅供参考</span>
            </li>
            <li class="flex items-start">
              <span class="text-purple-500 mr-3 mt-1">📈</span>
              <span>记录越多，预测越准确</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from "vue";
import { StorageManager, PredictionEngine } from "../utils";
import type { Location, PredictionResult } from "../types";

// Props
const props = defineProps<{
  currentLocation: Location | null;
}>();

// 组件状态
const predictions = ref<PredictionResult[]>([]);
const isLoading = ref(false);
const error = ref<string>("");

// 获取当前时间段的预测
const getCurrentPrediction = () => {
  const now = new Date();
  const currentHour = now.getHours();
  return predictions.value.find((p) => {
    const [start] = p.timeSlot.split("-").map((t) => parseInt(t));
    return currentHour >= start && currentHour < start + 1;
  });
};

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
      predictions.value = [];
      return;
    }

    const engine = new PredictionEngine(
      records,
      props.currentLocation.totalStalls
    );
    predictions.value = engine.generateHourlyPredictions();
  } catch (err) {
    error.value = "加载预测数据失败";
    console.error("Load predictions error:", err);
  } finally {
    isLoading.value = false;
  }
};

// 获取忙碌程度的样式
const getBusyLevelStyle = (level: number) => {
  if (level >= 80)
    return "bg-gradient-to-br from-red-100 to-red-200 text-red-800 border-red-300 hover:from-red-200 hover:to-red-300";
  if (level >= 60)
    return "bg-gradient-to-br from-orange-100 to-orange-200 text-orange-800 border-orange-300 hover:from-orange-200 hover:to-orange-300";
  if (level >= 40)
    return "bg-gradient-to-br from-yellow-100 to-yellow-200 text-yellow-800 border-yellow-300 hover:from-yellow-200 hover:to-yellow-300";
  return "bg-gradient-to-br from-green-100 to-green-200 text-green-800 border-green-300 hover:from-green-200 hover:to-green-300";
};

// 获取忙碌程度的emoji
const getBusyEmoji = (level: number) => {
  if (level >= 80) return "🔴";
  if (level >= 60) return "🟠";
  if (level >= 40) return "🟡";
  return "🟢";
};

// 获取忙碌程度文本
const getBusyLevelText = (level: number) => {
  if (level >= 80) return "拥挤";
  if (level >= 60) return "繁忙";
  if (level >= 40) return "适中";
  return "空闲";
};

// 获取建议文本
const getRecommendation = (level: number) => {
  if (level >= 80) return "建议等待或稍后再来";
  if (level >= 60) return "可能需要等待";
  if (level >= 40) return "适中，可以前往";
  return "空位较多，推荐时段";
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
