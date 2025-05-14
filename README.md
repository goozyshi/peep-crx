# 洗手间最佳时间预测应用产品文档

## 1. 产品概述

"厕所时间助手"是一款基于用户协作的智能应用，通过收集洗手间坑位状态记录，使用轻量级统计算法预测未来最佳使用时段，帮助用户避开拥挤时间，提升如厕体验。

## 2. 核心功能

- 记录洗手间坑位可用状态及对应时间
- 基于 Simple-statistics 算法进行时间段预估
- 使用增量计算提升性能
- 考虑坑位数量差异进行数据归一化
- 智能管理数据时效性(保留 3 个月内数据)
- 可视化展示各时段可用性概率

## 3. 数据模型设计

### 3.1 基础数据结构

```typescript
// 用户记录的原始数据
interface ToiletRecord {
  id: string; // 记录唯一ID
  timestamp: number; // 记录时间戳
  totalStalls: number; // 总坑位数量
  availableStalls: number; // 可用坑位数量
  locationId: string; // 位置ID
  userId: string; // 用户ID
  weekday: number; // 星期几(0-6)
  hour: number; // 小时(0-23)
  minute: number; // 分钟(0-59)
}

// 增量统计数据结构
interface TimeSlotStats {
  timeSlotKey: string; // 时间段键(格式: 星期-小时-分钟)
  lastUpdated: number; // 最后更新时间
  totalRecords: number; // 记录总数

  // 使用率数据 (1 - 可用率)
  avgUsageRate: number; // 平均使用率
  recentWeightedAvg: number; // 近期加权平均

  // 坑位分类统计
  byStallCounts: {
    [stallCount: number]: {
      // 按坑位数分组
      totalRecords: number; // 该分组记录数
      avgUsageRate: number; // 该分组平均使用率
    };
  };

  // 数据质量指标
  dataConsistency: number; // 数据一致性(0-1)
  confidence: number; // 置信度(0-1)
}
```

### 3.2 预测结果结构

```typescript
// 时间段预测结果
interface TimeSlotPrediction {
  timeSlotKey: string; // 时间段标识
  date: Date; // 日期时间
  probability: number; // 有空位概率(0-1)
  confidence: number; // 预测置信度(0-1)
  sampleSize: number; // 样本数量
  isRecommended: boolean; // 是否推荐时段
}
```

## 4. 增量计算实现

### 4.1 统计数据增量更新

```typescript
import * as ss from "simple-statistics";

// 时间段键生成
const getTimeSlotKey = (date: Date): string => {
  return `${date.getDay()}-${date.getHours()}-${
    Math.floor(date.getMinutes() / 30) * 30
  }`;
};

// 增量更新统计数据
const updateStatsIncrementally = (newRecord: ToiletRecord): void => {
  const usageRate = 1 - newRecord.availableStalls / newRecord.totalStalls;
  const timeSlotKey = getTimeSlotKey(new Date(newRecord.timestamp));

  // 获取现有统计数据
  const statsMap: Record<string, TimeSlotStats> = JSON.parse(
    localStorage.getItem("timeSlotStats") || "{}"
  );

  // 获取或创建时间段统计
  if (!statsMap[timeSlotKey]) {
    statsMap[timeSlotKey] = {
      timeSlotKey,
      lastUpdated: Date.now(),
      totalRecords: 0,
      avgUsageRate: 0,
      recentWeightedAvg: 0,
      byStallCounts: {},
      dataConsistency: 1,
      confidence: 0,
    };
  }

  const stats = statsMap[timeSlotKey];

  // 更新整体统计
  const oldTotal = stats.totalRecords;
  const newTotal = oldTotal + 1;

  // 计算新的平均使用率(增量方式)
  const newAvgUsageRate =
    (stats.avgUsageRate * oldTotal + usageRate) / newTotal;

  // 更新总体统计
  stats.avgUsageRate = newAvgUsageRate;
  stats.totalRecords = newTotal;

  // 计算近期加权平均(给近期数据更高权重)
  const decayFactor = 0.8; // 衰减因子(0.8表示老数据权重为80%)
  stats.recentWeightedAvg =
    stats.recentWeightedAvg * decayFactor + usageRate * (1 - decayFactor);

  // 更新按坑位数量的分组统计
  const stallCountKey = newRecord.totalStalls.toString();
  if (!stats.byStallCounts[stallCountKey]) {
    stats.byStallCounts[stallCountKey] = {
      totalRecords: 0,
      avgUsageRate: 0,
    };
  }

  const stallStats = stats.byStallCounts[stallCountKey];
  const oldStallTotal = stallStats.totalRecords;
  const newStallTotal = oldStallTotal + 1;

  // 更新坑位分组平均使用率
  stallStats.avgUsageRate =
    (stallStats.avgUsageRate * oldStallTotal + usageRate) / newStallTotal;
  stallStats.totalRecords = newStallTotal;

  // 使用simple-statistics计算数据一致性
  // 收集最近50条该时间段记录计算标准差
  const recentRecords = getRecentTimeSlotRecords(timeSlotKey, 50);
  if (recentRecords.length >= 5) {
    const usageRates = recentRecords.map(
      (r) => 1 - r.availableStalls / r.totalStalls
    );
    const stdDev = ss.standardDeviation(usageRates);
    const mean = ss.mean(usageRates);

    // 变异系数(CV) = 标准差/均值，越小表示数据越一致
    const cv = mean !== 0 ? stdDev / mean : 0;
    stats.dataConsistency = 1 / (1 + cv * 3); // 转换为0-1范围的一致性指标
  }

  // 更新置信度(基于样本量和数据一致性)
  stats.confidence = Math.min(
    0.95,
    0.3 + 0.6 * (newTotal / 50) * stats.dataConsistency
  );

  // 更新最后更新时间
  stats.lastUpdated = Date.now();

  // 保存更新后的统计
  statsMap[timeSlotKey] = stats;
  localStorage.setItem("timeSlotStats", JSON.stringify(statsMap));
};

// 获取最近特定时间段的记录(用于计算标准差)
const getRecentTimeSlotRecords = (
  timeSlotKey: string,
  limit: number
): ToiletRecord[] => {
  const allRecords: ToiletRecord[] = JSON.parse(
    localStorage.getItem("toiletRecords") || "[]"
  );

  return allRecords
    .filter((r) => getTimeSlotKey(new Date(r.timestamp)) === timeSlotKey)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
};
```

### 4.2 数据压缩与归档

```typescript
// 定期压缩旧数据
const compressOldData = (): void => {
  const allRecords: ToiletRecord[] = JSON.parse(
    localStorage.getItem("toiletRecords") || "[]"
  );
  const threeMonthsAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

  // 区分新旧数据
  const recentRecords = allRecords.filter((r) => r.timestamp >= threeMonthsAgo);
  const oldRecords = allRecords.filter((r) => r.timestamp < threeMonthsAgo);

  // 保留最近3个月数据
  localStorage.setItem("toiletRecords", JSON.stringify(recentRecords));

  // 如果有旧数据，确保其统计已合并至统计表
  if (oldRecords.length > 0) {
    oldRecords.forEach((record) => {
      // 使用增量更新方法处理旧记录
      updateStatsIncrementally(record);
    });

    console.log(`已压缩${oldRecords.length}条旧记录到统计数据`);
  }
};
```

## 5. 时间段预测算法 (Simple-statistics)

### 5.1 考虑坑位数量的预测实现

```typescript
import * as ss from "simple-statistics";

// 预测特定时间段的可用性
const predictTimeSlot = (
  targetDate: Date,
  stallsCount: number,
  locationId: string
): TimeSlotPrediction => {
  const timeSlotKey = getTimeSlotKey(targetDate);

  // 获取统计数据
  const statsMap: Record<string, TimeSlotStats> = JSON.parse(
    localStorage.getItem("timeSlotStats") || "{}"
  );
  const stats = statsMap[timeSlotKey];

  // 如果没有该时间段的数据，使用相邻时间段估计
  if (!stats || stats.totalRecords < 3) {
    return predictFromSimilarTimeSlots(targetDate, stallsCount, locationId);
  }

  // 查找匹配坑位数量的统计，或最相似的
  const relevantStallStats = findRelevantStallStats(
    stats.byStallCounts,
    stallsCount
  );

  // 计算预测结果
  let predictedProbability: number;
  let confidence: number;

  if (relevantStallStats) {
    // 使用匹配的坑位数量统计
    predictedProbability = 1 - relevantStallStats.avgUsageRate;

    // 该分组数据量较少时，与整体平均值加权融合
    if (relevantStallStats.totalRecords < 10) {
      const overallProb = 1 - stats.avgUsageRate;
      const weight = relevantStallStats.totalRecords / 10;
      predictedProbability =
        predictedProbability * weight + overallProb * (1 - weight);
    }

    // 调整置信度
    confidence = Math.min(
      0.9,
      stats.confidence *
        (relevantStallStats.totalRecords / stats.totalRecords) *
        1.5
    );
  } else {
    // 无匹配坑位数据，使用整体平均值
    predictedProbability = 1 - stats.avgUsageRate;
    confidence = stats.confidence * 0.7; // 降低置信度
  }

  // 创建预测结果
  return {
    timeSlotKey,
    date: targetDate,
    probability: Math.max(0, Math.min(1, predictedProbability)), // 确保在0-1范围内
    confidence,
    sampleSize: stats.totalRecords,
    isRecommended: false,
  };
};

// 查找最匹配的坑位数量统计
const findRelevantStallStats = (
  stallsStats: Record<string, { totalRecords: number; avgUsageRate: number }>,
  targetStalls: number
): { totalRecords: number; avgUsageRate: number } | null => {
  const stallCounts = Object.keys(stallsStats).map(Number);
  if (stallCounts.length === 0) return null;

  // 精确匹配
  if (stallsStats[targetStalls]) {
    return stallsStats[targetStalls];
  }

  // 查找最相似的坑位数量
  let bestMatch = stallCounts[0];
  let bestSimilarity = getSimilarityScore(bestMatch, targetStalls);

  stallCounts.forEach((count) => {
    const similarity = getSimilarityScore(count, targetStalls);
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = count;
    }
  });

  // 相似度过低则不使用
  if (bestSimilarity < 0.3) return null;

  return stallsStats[bestMatch];
};

// 计算两个坑位数量的相似度
const getSimilarityScore = (count1: number, count2: number): number => {
  // 小规模设施差异敏感度高
  if (count1 <= 3 || count2 <= 3) {
    return count1 === count2 ? 1.0 : 0.1;
  }

  // 中等规模设施
  if (count1 <= 10 || count2 <= 10) {
    return Math.max(0, 1 - Math.abs(count1 - count2) / 5);
  }

  // 大规模设施
  return Math.max(
    0,
    1 - Math.abs(count1 - count2) / Math.max(count1, count2) / 0.3
  );
};

// 从相似时间段预测
const predictFromSimilarTimeSlots = (
  targetDate: Date,
  stallsCount: number,
  locationId: string
): TimeSlotPrediction => {
  const targetWeekday = targetDate.getDay();
  const targetHour = targetDate.getHours();
  const targetMinute = Math.floor(targetDate.getMinutes() / 30) * 30;

  // 获取所有时间段统计
  const statsMap: Record<string, TimeSlotStats> = JSON.parse(
    localStorage.getItem("timeSlotStats") || "{}"
  );

  // 计算与目标时间段的相似度
  const timeSlotSimilarities = Object.values(statsMap).map((stats) => {
    const [weekday, hour, minute] = stats.timeSlotKey.split("-").map(Number);

    // 计算时间相似度
    let timeSimilarity = 0;

    // 同一天加权高
    if (weekday === targetWeekday) {
      timeSimilarity += 0.5;

      // 小时接近度
      const hourDiff = Math.abs(hour - targetHour);
      if (hourDiff === 0) {
        timeSimilarity += 0.4;

        // 分钟接近度
        const minuteDiff = Math.abs(minute - targetMinute);
        if (minuteDiff === 0) {
          timeSimilarity += 0.1;
        }
      } else if (hourDiff === 1) {
        timeSimilarity += 0.2;
      } else if (hourDiff === 2) {
        timeSimilarity += 0.1;
      }
    } else {
      // 工作日/周末相似性
      const isTargetWeekend = targetWeekday === 0 || targetWeekday === 6;
      const isStatsWeekend = weekday === 0 || weekday === 6;

      if (isTargetWeekend === isStatsWeekend) {
        timeSimilarity += 0.2;

        // 小时接近度
        const hourDiff = Math.abs(hour - targetHour);
        if (hourDiff === 0) {
          timeSimilarity += 0.2;
        } else if (hourDiff === 1) {
          timeSimilarity += 0.1;
        }
      }
    }

    return {
      stats,
      similarity: timeSimilarity,
    };
  });

  // 按相似度排序
  timeSlotSimilarities.sort((a, b) => b.similarity - a.similarity);

  // 取前3个最相似的时间段进行加权平均
  const topSimilar = timeSlotSimilarities.slice(0, 3);

  if (topSimilar.length === 0) {
    // 无统计数据时返回默认值
    return {
      timeSlotKey: getTimeSlotKey(targetDate),
      date: targetDate,
      probability: 0.5,
      confidence: 0.1,
      sampleSize: 0,
      isRecommended: false,
    };
  }

  // 计算加权平均
  let totalWeight = 0;
  let weightedProbabilitySum = 0;
  let maxConfidence = 0;
  let totalSamples = 0;

  topSimilar.forEach(({ stats, similarity }) => {
    if (similarity < 0.1) return;

    const relevantStallStats = findRelevantStallStats(
      stats.byStallCounts,
      stallsCount
    );
    const usageRate = relevantStallStats
      ? relevantStallStats.avgUsageRate
      : stats.avgUsageRate;

    const probability = 1 - usageRate;
    const adjustedConfidence = stats.confidence * similarity;

    weightedProbabilitySum += probability * similarity;
    totalWeight += similarity;
    maxConfidence = Math.max(maxConfidence, adjustedConfidence);
    totalSamples += stats.totalRecords;
  });

  if (totalWeight === 0) {
    // 防止除零错误
    return {
      timeSlotKey: getTimeSlotKey(targetDate),
      date: targetDate,
      probability: 0.5,
      confidence: 0.1,
      sampleSize: 0,
      isRecommended: false,
    };
  }

  // 计算最终结果
  const avgProbability = weightedProbabilitySum / totalWeight;

  // 返回预测结果
  return {
    timeSlotKey: getTimeSlotKey(targetDate),
    date: targetDate,
    probability: Math.max(0, Math.min(1, avgProbability)),
    confidence: maxConfidence * 0.7, // 降低置信度因为是推断数据
    sampleSize: totalSamples,
    isRecommended: false,
  };
};
```

### 5.2 未来时间段推荐

```typescript
// 获取未来时间段预测并推荐最佳时段
const getFutureTimeSlotPredictions = (
  startTime: Date,
  hoursAhead: number,
  intervalMinutes: number,
  stallsCount: number,
  locationId: string
): TimeSlotPrediction[] => {
  const predictions: TimeSlotPrediction[] = [];

  // 生成未来时间段
  for (let i = 0; i < (hoursAhead * 60) / intervalMinutes; i++) {
    const targetTime = new Date(
      startTime.getTime() + i * intervalMinutes * 60 * 1000
    );

    // 预测该时间段
    const prediction = predictTimeSlot(targetTime, stallsCount, locationId);
    predictions.push(prediction);
  }

  // 标记推荐时段
  return markRecommendedTimeSlots(predictions);
};

// 标记推荐时段
const markRecommendedTimeSlots = (
  predictions: TimeSlotPrediction[]
): TimeSlotPrediction[] => {
  // 计算综合得分 = 可用概率 * (0.7 + 0.3 * 置信度)
  const scoredPredictions = predictions.map((p) => ({
    ...p,
    score: p.probability * (0.7 + 0.3 * p.confidence),
  }));

  // 按得分排序
  const sortedPredictions = [...scoredPredictions].sort(
    (a, b) => b.score - a.score
  );

  // 选择最高分的前3个时间段作为推荐(得分至少0.5以上)
  const recommended = sortedPredictions
    .filter((p) => p.score >= 0.5)
    .slice(0, 3);

  // 标记推荐时间段
  return predictions.map((p) => ({
    ...p,
    isRecommended: recommended.some((r) => r.timeSlotKey === p.timeSlotKey),
  }));
};
```

## 6. 用户数据管理

### 6.1 增量记录与存储

```typescript
// 记录新数据并增量更新统计
const recordNewEntry = (
  totalStalls: number,
  availableStalls: number,
  locationId: string
): void => {
  const timestamp = Date.now();
  const date = new Date(timestamp);

  // 创建记录
  const newRecord: ToiletRecord = {
    id: generateUniqueId(),
    timestamp,
    totalStalls,
    availableStalls,
    locationId,
    userId: getCurrentUserId(),
    weekday: date.getDay(),
    hour: date.getHours(),
    minute: date.getMinutes(),
  };

  // 保存记录
  saveRecord(newRecord);

  // 增量更新统计
  updateStatsIncrementally(newRecord);

  // 每50条记录检查是否需要压缩旧数据
  const recordCount = JSON.parse(
    localStorage.getItem("toiletRecords") || "[]"
  ).length;

  if (recordCount % 50 === 0) {
    compressOldData();
  }
};

// 保存记录到存储
const saveRecord = (record: ToiletRecord): void => {
  const records: ToiletRecord[] = JSON.parse(
    localStorage.getItem("toiletRecords") || "[]"
  );

  records.push(record);
  localStorage.setItem("toiletRecords", JSON.stringify(records));
};
```

## 7. 用户界面设计

### 7.1 数据录入界面

- 滑块选择总坑位数和可用坑位数
- 一键记录当前状态
- 常用位置快速选择
- 记录成功确认动画

### 7.2 预测结果展示

- 24 小时热力图显示空位概率
- 推荐时段突出显示
- 置信度颜色强度指示
- 点击时段查看详细统计

### 7.3 数据统计视图

- 历史贡献数据量
- 预测准确率反馈
- 数据统计压缩进度
- 各时间段记录密度图

## 8. 前端性能优化

### 8.1 缓存策略

```typescript
// 预测结果缓存
const predictionCache = new Map<
  string,
  {
    prediction: TimeSlotPrediction;
    timestamp: number;
  }
>();

// 带缓存的预测函数
const getCachedPrediction = (
  targetDate: Date,
  stallsCount: number,
  locationId: string
): TimeSlotPrediction => {
  const cacheKey = `${getTimeSlotKey(targetDate)}-${stallsCount}-${locationId}`;

  // 检查缓存
  const cached = predictionCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
    return cached.prediction;
  }

  // 计算新预测
  const prediction = predictTimeSlot(targetDate, stallsCount, locationId);

  // 更新缓存
  predictionCache.set(cacheKey, {
    prediction,
    timestamp: Date.now(),
  });

  return prediction;
};

// 批量获取预测并优化性能
const getBatchPredictions = (
  dates: Date[],
  stallsCount: number,
  locationId: string
): TimeSlotPrediction[] => {
  // 一次性获取所有统计数据(避免重复解析JSON)
  const statsMap: Record<string, TimeSlotStats> = JSON.parse(
    localStorage.getItem("timeSlotStats") || "{}"
  );

  // 预计算所有时间段相似度(避免重复计算)
  const timeSlotSimilarities = precomputeTimeSlotSimilarities(
    dates.map(getTimeSlotKey),
    statsMap
  );

  return dates.map((date) => {
    const timeSlotKey = getTimeSlotKey(date);
    const cacheKey = `${timeSlotKey}-${stallsCount}-${locationId}`;

    // 检查缓存
    const cached = predictionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 10 * 60 * 1000) {
      return cached.prediction;
    }

    // 计算新预测(使用预计算的相似度)
    const prediction = predictTimeSlotOptimized(
      date,
      stallsCount,
      locationId,
      statsMap,
      timeSlotSimilarities
    );

    // 更新缓存
    predictionCache.set(cacheKey, {
      prediction,
      timestamp: Date.now(),
    });

    return prediction;
  });
};
```

### 8.2 Web Worker 处理

```typescript
// 在Web Worker中进行预测计算
const initPredictionWorker = (): Worker => {
  const workerCode = `
    // 导入Simple-statistics
    importScripts('https://cdn.jsdelivr.net/npm/simple-statistics@7.7.0/dist/simple-statistics.min.js');
    
    // 接收主线程消息
    self.onmessage = function(e) {
      const { type, data } = e.data;
      
      if (type === 'predict') {
        // 进行预测计算
        const { dates, stallsCount, locationId, statsMap } = data;
        
        const predictions = dates.map(date => {
          // 预测实现...
          return predictTimeSlot(new Date(date), stallsCount, locationId, statsMap);
        });
        
        // 返回结果
        self.postMessage({
          type: 'predictions',
          data: predictions
        });
      }
    };
    
    // 预测函数实现...
  `;

  const blob = new Blob([workerCode], { type: "application/javascript" });
  return new Worker(URL.createObjectURL(blob));
};
```

## 9. 开发路线图

### 9.1 MVP 阶段(4 周)

- 基础数据记录功能
- 简单统计算法实现
- 基础 UI 开发

### 9.2 增强阶段(4 周)

- 增量计算实现
- 时间段预测完善
- 数据压缩与管理
- 热力图可视化

### 9.3 优化阶段(2 周)

- 缓存策略优化
- Web Worker 实现
- 用户反馈机制
- 使用体验改进

## 10. 技术堆栈

- 前端框架: Vue 3 + TypeScript
- 状态管理: Pinia
- UI 组件: TailwindCSS
- 统计算法: Simple-statistics
- 日期处理: date-fns
- 图表: Chart.js
- 存储: localStorage + IndexedDB
