<template>
  <div class="space-y-4">
    <!-- 当前时段预测 -->
    <div class="bg-white rounded-xl shadow-lg p-6">
      <div class="text-center">
        <h2 class="text-lg font-semibold text-gray-800 mb-4">
          🕐 当前时段预测
        </h2>

        <div v-if="isLoading" class="py-8">
          <div
            class="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"
          ></div>
          <p class="text-gray-500 mt-2">加载中...</p>
        </div>

        <div v-else-if="error" class="py-8 text-red-500">
          {{ error }}
        </div>

        <div v-else-if="predictions.length === 0" class="py-8">
          <div class="text-4xl mb-3">📊</div>
          <h3 class="font-semibold text-gray-800 mb-2">暂无数据</h3>
          <p class="text-gray-500 text-sm">
            开始记录厕所使用情况，<br />
            系统将为您生成智能预测
          </p>
        </div>

        <div v-else>
          <div v-if="getCurrentPrediction()" class="space-y-4">
            <div class="text-5xl">
              {{ getBusyEmoji(getCurrentPrediction()!.busyLevel) }}
            </div>
            <div>
              <div class="text-2xl font-bold text-gray-800">
                {{ Math.round(getCurrentPrediction()!.busyLevel) }}% 繁忙
              </div>
              <div class="text-sm text-gray-600 mt-1">
                {{ getRecommendation(getCurrentPrediction()!.busyLevel) }}
              </div>
            </div>
          </div>

          <div v-else class="space-y-4">
            <div class="text-4xl">❓</div>
            <div>
              <div class="font-semibold text-gray-800">当前时段数据不足</div>
              <div class="text-sm text-gray-600 mt-1">请查看下方全天预测</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 全天预测时段 -->
    <div
      v-if="predictions.length > 0"
      class="bg-white rounded-xl shadow-lg p-6"
    >
      <h3 class="text-lg font-semibold text-gray-800 mb-4">📅 全天预测时段</h3>

      <div class="grid grid-cols-2 gap-3">
        <div
          v-for="prediction in predictions"
          :key="prediction.timeSlot"
          :class="[
            'p-3 rounded-lg border text-center transition-all',
            getBusyLevelStyle(prediction.busyLevel),
          ]"
        >
          <div class="font-semibold text-sm">{{ prediction.timeSlot }}</div>
          <div class="text-lg my-1">
            {{ getBusyEmoji(prediction.busyLevel) }}
          </div>
          <div class="text-xs">{{ Math.round(prediction.busyLevel) }}%</div>
        </div>
      </div>

      <!-- 图例 -->
      <div class="mt-4 pt-4 border-t border-gray-200">
        <div class="text-xs text-gray-600 mb-2">繁忙程度图例：</div>
        <div class="flex justify-between text-xs">
          <span class="flex items-center"
            ><span class="w-2 h-2 bg-green-400 rounded-full mr-1"></span
            >空闲</span
          >
          <span class="flex items-center"
            ><span class="w-2 h-2 bg-yellow-400 rounded-full mr-1"></span
            >适中</span
          >
          <span class="flex items-center"
            ><span class="w-2 h-2 bg-orange-400 rounded-full mr-1"></span
            >繁忙</span
          >
          <span class="flex items-center"
            ><span class="w-2 h-2 bg-red-400 rounded-full mr-1"></span
            >拥挤</span
          >
        </div>
      </div>
    </div>

    <!-- 使用提示 -->
    <div class="bg-blue-50 rounded-xl p-4 border border-blue-200">
      <div class="flex items-start space-x-3">
        <div class="text-blue-500 text-lg">💡</div>
        <div class="text-sm text-blue-700">
          <div class="font-semibold mb-1">使用提示：</div>
          <ul class="space-y-1 text-xs">
            <li>• 绿色时段：空位较多，推荐前往</li>
            <li>• 红色时段：建议避开或等待</li>
            <li>• 数据基于历史记录，仅供参考</li>
            <li>• 记录越多，预测越准确</li>
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
  if (level >= 80) return "bg-red-100 text-red-700 border-red-200";
  if (level >= 60) return "bg-orange-100 text-orange-700 border-orange-200";
  if (level >= 40) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-green-100 text-green-700 border-green-200";
};

// 获取忙碌程度的emoji
const getBusyEmoji = (level: number) => {
  if (level >= 80) return "🔴";
  if (level >= 60) return "🟠";
  if (level >= 40) return "🟡";
  return "🟢";
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
