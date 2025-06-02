<template>
  <div class="bg-white rounded-xl shadow-lg p-6">
    <div class="text-center mb-6" v-if="isFirstSetup">
      <h2 class="text-xl font-bold text-gray-800 mb-2">🎯 设置你的第一个位置</h2>
      <p class="text-gray-600 text-sm">告诉我们你常去的厕所位置和坑位数量</p>
    </div>
    
    <div class="text-center mb-6" v-else>
      <h3 class="text-lg font-semibold text-gray-800 mb-2">➕ 添加新位置</h3>
      <p class="text-gray-600 text-sm">设置新的厕所位置</p>
    </div>
    
    <form @submit.prevent="submitLocation" class="space-y-4">
      <!-- 位置名称 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          📍 位置名称
        </label>
        <input
          v-model="locationName"
          type="text"
          placeholder="例如：公司3楼男厕所"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          required
        />
      </div>
      
      <!-- 坑位数量 -->
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">
          🚽 坑位数量
        </label>
        <div class="flex items-center space-x-4">
          <button
            type="button"
            @click="totalStalls = Math.max(1, totalStalls - 1)"
            class="w-10 h-10 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold"
          >
            -
          </button>
          <input
            v-model.number="totalStalls"
            type="number"
            min="1"
            max="20"
            class="flex-1 text-center px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="button"
            @click="totalStalls = Math.min(20, totalStalls + 1)"
            class="w-10 h-10 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold"
          >
            +
          </button>
        </div>
        <p class="text-xs text-gray-500 mt-1">大便坑位数量（不包括小便池）</p>
      </div>
      
      <!-- 错误提示 -->
      <div v-if="error" class="bg-red-50 border border-red-200 rounded-lg p-3">
        <p class="text-red-700 text-sm">{{ error }}</p>
      </div>
      
      <!-- 提交按钮 -->
      <button
        type="submit"
        :disabled="isSubmitting"
        class="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white py-3 px-4 rounded-lg font-medium transition-colors"
      >
        <span v-if="isSubmitting">添加中...</span>
        <span v-else-if="isFirstSetup">🚀 开始使用</span>
        <span v-else">➕ 添加位置</span>
      </button>
    </form>
    
    <!-- 首次使用的额外说明 -->
    <div v-if="isFirstSetup" class="mt-6 pt-6 border-t border-gray-200">
      <div class="bg-yellow-50 rounded-lg p-4">
        <div class="flex items-start space-x-3">
          <div class="text-yellow-500 text-lg">⚠️</div>
          <div class="text-sm text-yellow-700">
            <div class="font-semibold mb-1">重要提示：</div>
            <ul class="space-y-1 text-xs">
              <li>• 只需要设置一次，后续可以添加更多位置</li>
              <li>• 坑位数量影响预测准确性，请如实填写</li>
              <li>• 所有数据仅存储在您的设备上</li>
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
  'location-added': [location: Location];
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
    emit('location-added', location);
    
  } catch (err) {
    error.value = "添加位置失败，请重试";
    console.error("Add location error:", err);
  } finally {
    isSubmitting.value = false;
  }
};
</script>
