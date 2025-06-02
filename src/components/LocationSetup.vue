<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
    <!-- 简化的标题 -->
    <div class="text-center mb-4" v-if="isFirstSetup">
      <h2 class="text-base font-bold text-gray-900 mb-1">设置厕所位置</h2>
      <p class="text-xs text-gray-600">填写位置信息开始使用</p>
    </div>

    <div class="text-center mb-4" v-else>
      <h3
        class="text-sm font-bold text-gray-900 mb-1 flex items-center justify-center"
      >
        <span class="mr-1">➕</span>
        添加新位置
      </h3>
    </div>

    <form @submit.prevent="submitLocation" class="space-y-3">
      <!-- 位置名称 -->
      <div>
        <label
          class="block text-xs font-medium text-gray-700 mb-1 flex items-center"
        >
          <span class="mr-1">📍</span>
          位置名称
        </label>
        <input
          v-model="locationName"
          type="text"
          placeholder="例如：公司3楼厕所"
          class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm"
          required
        />
      </div>

      <!-- 坑位数量 -->
      <div>
        <label
          class="block text-xs font-medium text-gray-700 mb-1 flex items-center"
        >
          <span class="mr-1">🚽</span>
          坑位数量
        </label>
        <div class="flex items-center space-x-2">
          <button
            type="button"
            @click="totalStalls = Math.max(1, totalStalls - 1)"
            class="w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-colors"
          >
            −
          </button>
          <input
            v-model.number="totalStalls"
            type="number"
            min="1"
            max="20"
            class="flex-1 text-center px-2 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
          />
          <button
            type="button"
            @click="totalStalls = Math.min(20, totalStalls + 1)"
            class="w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-colors"
          >
            +
          </button>
        </div>
        <p class="text-xs text-gray-500 mt-1 text-center">
          大便坑位数（不含小便池）
        </p>
      </div>

      <!-- 错误提示 -->
      <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-2">
        <div class="flex items-center">
          <span class="text-red-600 mr-1">⚠️</span>
          <p class="text-red-700 text-xs">{{ error }}</p>
        </div>
      </div>

      <!-- 提交按钮 -->
      <button
        type="submit"
        :disabled="isSubmitting"
        class="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
      >
        <span v-if="isSubmitting" class="flex items-center justify-center">
          <div
            class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"
          ></div>
          添加中...
        </span>
        <span v-else-if="isFirstSetup">🚀 开始使用</span>
        <span v-else>➕ 添加位置</span>
      </button>
    </form>

    <!-- 首次使用的简化说明 -->
    <div v-if="isFirstSetup" class="mt-3 pt-3 border-t border-gray-100">
      <div class="bg-blue-50 rounded-lg p-2 border border-blue-100">
        <div class="flex items-start space-x-2">
          <div class="text-blue-600 text-sm">💡</div>
          <div class="text-blue-800 text-xs">
            <div class="font-medium mb-1">说明：</div>
            <ul class="space-y-0.5">
              <li>• 准确填写坑位数量有助于提升预测精度</li>
              <li>• 数据仅保存在本地，保护隐私</li>
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
    error.value = "添加失败，请重试";
    console.error("Add location error:", err);
  } finally {
    isSubmitting.value = false;
  }
};
</script>
