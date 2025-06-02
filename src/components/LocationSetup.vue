<template>
  <div class="bg-white rounded-2xl shadow-google border border-gray-200 p-5">
    <div class="text-center mb-6" v-if="isFirstSetup">
      <h2 class="text-xl font-bold text-gray-900 mb-2">
        🎯 设置你的第一个位置
      </h2>
      <p class="text-gray-700 text-sm">告诉我们你常去的厕所位置和坑位数量</p>
    </div>

    <div class="text-center mb-6" v-else>
      <h3
        class="text-lg font-bold text-gray-900 mb-2 flex items-center justify-center"
      >
        <span class="text-xl mr-2">➕</span>
        添加新位置
      </h3>
      <p class="text-gray-700 text-sm">设置新的厕所位置</p>
    </div>

    <form @submit.prevent="submitLocation" class="space-y-4">
      <!-- 位置名称 -->
      <div>
        <label
          class="block text-sm font-bold text-gray-800 mb-2 flex items-center"
        >
          <span class="text-base mr-2">📍</span>
          位置名称
        </label>
        <input
          v-model="locationName"
          type="text"
          placeholder="例如：公司3楼男厕所"
          class="input w-full px-3 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-sm"
          required
        />
      </div>

      <!-- 坑位数量 -->
      <div>
        <label
          class="block text-sm font-bold text-gray-800 mb-2 flex items-center"
        >
          <span class="text-base mr-2">🚽</span>
          坑位数量
        </label>
        <div class="flex items-center space-x-3">
          <!-- Google Blue按钮 -->
          <button
            type="button"
            @click="totalStalls = Math.max(1, totalStalls - 1)"
            class="btn btn-google-blue w-10 h-10 rounded-xl font-bold"
          >
            −
          </button>
          <input
            v-model.number="totalStalls"
            type="number"
            min="1"
            max="20"
            class="input flex-1 text-center px-3 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-bold"
          />
          <button
            type="button"
            @click="totalStalls = Math.min(20, totalStalls + 1)"
            class="btn btn-google-blue w-10 h-10 rounded-xl font-bold"
          >
            +
          </button>
        </div>
        <p class="text-xs text-gray-600 mt-1 text-center">
          大便坑位数量（不包括小便池）
        </p>
      </div>

      <!-- 错误提示 - Google Red -->
      <div
        v-if="error"
        class="bg-red-50 border-2 border-red-200 rounded-xl p-3"
      >
        <div class="flex items-center">
          <span class="text-google-red text-lg mr-2">⚠️</span>
          <p class="text-red-700 font-medium text-sm">{{ error }}</p>
        </div>
      </div>

      <!-- 提交按钮 - Google Blue -->
      <button
        type="submit"
        :disabled="isSubmitting"
        class="btn btn-google-blue w-full py-3 px-4 rounded-xl font-bold disabled:opacity-50"
      >
        <span v-if="isSubmitting" class="flex items-center justify-center">
          <div
            class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"
          ></div>
          添加中...
        </span>
        <span v-else-if="isFirstSetup" class="flex items-center justify-center">
          <span class="text-lg mr-2">🚀</span>
          开始使用
        </span>
        <span v-else class="flex items-center justify-center">
          <span class="text-lg mr-2">➕</span>
          添加位置
        </span>
      </button>
    </form>

    <!-- 首次使用的额外说明 - Google Yellow -->
    <div v-if="isFirstSetup" class="mt-6 pt-4 border-t border-gray-200">
      <div class="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
        <div class="flex items-start space-x-3">
          <div class="text-google-yellow text-lg">⚠️</div>
          <div class="text-yellow-800">
            <div class="font-bold mb-2 text-sm">重要提示：</div>
            <ul class="space-y-1 text-xs">
              <li class="flex items-start">
                <span class="text-google-yellow mr-2 mt-0.5 font-bold">•</span>
                <span>只需要设置一次，后续可以添加更多位置</span>
              </li>
              <li class="flex items-start">
                <span class="text-google-yellow mr-2 mt-0.5 font-bold">•</span>
                <span>坑位数量影响预测准确性，请如实填写</span>
              </li>
              <li class="flex items-start">
                <span class="text-google-yellow mr-2 mt-0.5 font-bold">•</span>
                <span>所有数据仅存储在您的设备上</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { StorageManager } from "../utils";
import type { Location } from "../types";

// Props
defineProps<{
  isFirstSetup: boolean;
}>();

// Events
const emit = defineEmits<{
  "location-added": [location: Location];
}>();

// 表单状态
const locationName = ref("");
const totalStalls = ref(3);
const isSubmitting = ref(false);
const error = ref("");

// 提交表单
const submitLocation = async () => {
  if (!locationName.value.trim()) {
    error.value = "请输入位置名称";
    return;
  }

  if (totalStalls.value < 1 || totalStalls.value > 20) {
    error.value = "坑位数量必须在1-20之间";
    return;
  }

  isSubmitting.value = true;
  error.value = "";

  try {
    const location: Location = {
      id: Date.now().toString(),
      name: locationName.value.trim(),
      totalStalls: totalStalls.value,
      createdAt: Date.now(),
    };

    await StorageManager.addLocation(location);

    // 重置表单
    locationName.value = "";
    totalStalls.value = 3;

    // 通知父组件
    emit("location-added", location);
  } catch (err) {
    error.value = "添加位置失败，请重试";
    console.error("Add location error:", err);
  } finally {
    isSubmitting.value = false;
  }
};
</script>
