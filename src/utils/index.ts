import * as ss from "simple-statistics";
import type {
  ToiletRecord,
  Location,
  UserSettings,
  TimeGranularity,
  DataQuality,
  PredictionResult,
  BestTimeSlot,
  DataCollectionProgress,
} from "../types";

// 时间段处理工具
export class TimeSlotUtils {
  // 根据数据量决定时间颗粒度 - 调整为新的精度范围
  static determineGranularity(recordCount: number): TimeGranularity {
    if (recordCount >= 100) return "10min"; // 100条记录以上使用10分钟精度
    if (recordCount >= 30) return "15min"; // 30-99条记录使用15分钟精度
    return "30min"; // 30条以下使用30分钟精度
  }

  // 根据颗粒度获取时间段键
  static getTimeSlotKey(
    date: Date,
    granularity: TimeGranularity = "30min"
  ): string {
    const weekday = date.getDay();
    const hour = date.getHours();

    switch (granularity) {
      case "10min":
        const minute10 = Math.floor(date.getMinutes() / 10) * 10;
        return `${weekday}-${hour}-${minute10}`;
      case "15min":
        const minute15 = Math.floor(date.getMinutes() / 15) * 15;
        return `${weekday}-${hour}-${minute15}`;
      case "30min":
      default:
        const minute30 = Math.floor(date.getMinutes() / 30) * 30;
        return `${weekday}-${hour}-${minute30}`;
    }
  }

  static parseTimeSlotKey(timeSlotKey: string): {
    weekday: number;
    hour: number;
    minute: number;
  } {
    const [weekday, hour, minute] = timeSlotKey.split("-").map(Number);
    return { weekday, hour, minute };
  }

  static getTimeSlotDisplay(
    timeSlotKey: string,
    granularity: TimeGranularity = "30min"
  ): string {
    const { weekday, hour, minute } = this.parseTimeSlotKey(timeSlotKey);
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

    switch (granularity) {
      case "10min":
        const endMinute10 = minute + 10;
        const endHour10 = endMinute10 >= 60 ? hour + 1 : hour;
        const actualEndMinute10 =
          endMinute10 >= 60 ? endMinute10 - 60 : endMinute10;
        return `${weekdays[weekday]} ${hour
          .toString()
          .padStart(2, "0")}:${minute.toString().padStart(2, "0")}-${endHour10
          .toString()
          .padStart(2, "0")}:${actualEndMinute10.toString().padStart(2, "0")}`;

      case "15min":
        const endMinute15 = minute + 15;
        const endHour15 = endMinute15 >= 60 ? hour + 1 : hour;
        const actualEndMinute15 =
          endMinute15 >= 60 ? endMinute15 - 60 : endMinute15;
        return `${weekdays[weekday]} ${hour
          .toString()
          .padStart(2, "0")}:${minute.toString().padStart(2, "0")}-${endHour15
          .toString()
          .padStart(2, "0")}:${actualEndMinute15.toString().padStart(2, "0")}`;

      case "30min":
      default:
        const endMinute30 = minute + 30;
        const endHour30 = endMinute30 >= 60 ? hour + 1 : hour;
        const actualEndMinute30 =
          endMinute30 >= 60 ? endMinute30 - 60 : endMinute30;
        return `${weekdays[weekday]} ${hour
          .toString()
          .padStart(2, "0")}:${minute.toString().padStart(2, "0")}-${endHour30
          .toString()
          .padStart(2, "0")}:${actualEndMinute30
          .toString()
          .padStart(2, "0")}:00`;
    }
  }

  // 获取未来时间段，支持不同颗粒度
  static getFutureTimeSlots(
    count: number = 24,
    granularity: TimeGranularity = "30min"
  ): Array<{ key: string; date: Date; startTime: Date; endTime: Date }> {
    const slots: Array<{
      key: string;
      date: Date;
      startTime: Date;
      endTime: Date;
    }> = [];
    const now = new Date();

    let intervalMinutes: number;
    switch (granularity) {
      case "10min":
        intervalMinutes = 10;
        break;
      case "15min":
        intervalMinutes = 15;
        break;
      case "30min":
      default:
        intervalMinutes = 30;
        break;
    }

    for (let i = 0; i < count; i++) {
      const futureTime = new Date(
        now.getTime() + i * intervalMinutes * 60 * 1000
      );
      const key = this.getTimeSlotKey(futureTime, granularity);
      const endTime = new Date(
        futureTime.getTime() + intervalMinutes * 60 * 1000
      );

      slots.push({
        key,
        date: futureTime,
        startTime: futureTime,
        endTime: endTime,
      });
    }

    return slots;
  }

  static isPeakHour(date: Date): boolean {
    const hour = date.getHours();
    const weekday = date.getDay();

    if (weekday >= 1 && weekday <= 5) {
      return (hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16);
    }

    return false;
  }

  static getTimeSlotContext(date: Date): {
    isPeak: boolean;
    isWeekend: boolean;
    timeOfDay: "morning" | "afternoon" | "evening" | "night";
  } {
    const hour = date.getHours();
    const weekday = date.getDay();

    let timeOfDay: "morning" | "afternoon" | "evening" | "night";
    if (hour >= 6 && hour < 12) timeOfDay = "morning";
    else if (hour >= 12 && hour < 18) timeOfDay = "afternoon";
    else if (hour >= 18 && hour < 22) timeOfDay = "evening";
    else timeOfDay = "night";

    return {
      isPeak: this.isPeakHour(date),
      isWeekend: weekday === 0 || weekday === 6,
      timeOfDay,
    };
  }
}

// 统计计算工具
export class StatisticsUtils {
  static calculateAvailabilityRate(records: ToiletRecord[]): number {
    if (records.length === 0) return 0.5;
    const availableCount = records.filter(
      (r) => r.result === "available"
    ).length;
    return availableCount / records.length;
  }

  static calculateDataConsistency(records: ToiletRecord[]): number {
    if (records.length < 3) return 0.5;

    const values = records.map((r) => (r.result === "available" ? 1 : 0));
    const mean = ss.mean(values);
    const variance = ss.variance(values);
    const stdDev = Math.sqrt(variance);

    const cv = mean !== 0 ? stdDev / mean : 0;
    return Math.max(0, Math.min(1, 1 - cv));
  }

  static calculateConfidence(
    sampleSize: number,
    dataConsistency: number,
    daysSinceLastUpdate: number = 0
  ): number {
    const sampleConfidence = Math.min(0.95, sampleSize / 50);
    const consistencyConfidence = dataConsistency;
    const timeDecay = Math.max(0.3, 1 - daysSinceLastUpdate * 0.1);

    return sampleConfidence * consistencyConfidence * timeDecay;
  }

  static calculateTrend(records: ToiletRecord[]): number {
    if (records.length < 3) return 0;

    const sortedRecords = [...records].sort(
      (a, b) => a.timestamp - b.timestamp
    );
    const dataPoints = sortedRecords.map((record, index) => [
      index,
      record.result === "available" ? 1 : 0,
    ]);

    const regression = ss.linearRegression(dataPoints);
    return regression.m;
  }

  static calculateSeasonalAdjustment(date: Date): number {
    const hour = date.getHours();
    const weekday = date.getDay();
    const month = date.getMonth();

    const weekdayFactor = weekday >= 1 && weekday <= 5 ? 1.1 : 0.8;

    let hourFactor = 1.0;
    if (hour >= 9 && hour <= 11) hourFactor = 1.3;
    else if (hour >= 14 && hour <= 16) hourFactor = 1.2;
    else if (hour >= 12 && hour <= 13) hourFactor = 1.4;
    else if (hour < 8 || hour > 18) hourFactor = 0.6;

    const monthFactor = month >= 5 && month <= 8 ? 0.9 : 1.0;

    return weekdayFactor * hourFactor * monthFactor - 1.0;
  }
}

// Chrome存储管理（补充完整的实现）
export class StorageManager {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const result = await chrome.storage.local.get([key]);
      return result[key] || null;
    } catch (error) {
      console.error("Storage get error:", error);
      return null;
    }
  }

  static async set<T>(key: string, value: T): Promise<void> {
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (error) {
      console.error("Storage set error:", error);
      throw error;
    }
  }

  static async saveRecord(record: ToiletRecord): Promise<void> {
    const records = await this.getRecords();
    records.push(record);
    localStorage.setItem("toilet_records", JSON.stringify(records));

    if (records.length % 50 === 0) {
      await this.compressRecords();
    }
  }

  static async getRecords(): Promise<ToiletRecord[]> {
    return JSON.parse(localStorage.getItem("toilet_records") || "[]");
  }

  static async saveLocation(location: Location): Promise<void> {
    const locations = await this.getLocations();
    const existingIndex = locations.findIndex((l) => l.id === location.id);

    if (existingIndex >= 0) {
      locations[existingIndex] = location;
    } else {
      locations.push(location);
    }

    await this.set("locations", locations);
  }

  static async getLocations(): Promise<Location[]> {
    return (await this.get<Location[]>("locations")) || [];
  }

  static async addLocation(location: Location): Promise<void> {
    await this.saveLocation(location);
  }

  static async getRecordsByLocation(
    locationId: string
  ): Promise<ToiletRecord[]> {
    const allRecords = await this.getRecords();
    return allRecords.filter((record) => record.locationId === locationId);
  }

  static async deleteRecord(recordId: string): Promise<void> {
    const records = await this.getRecords();
    const filteredRecords = records.filter((record) => record.id !== recordId);
    localStorage.setItem("toilet_records", JSON.stringify(filteredRecords));
  }

  static async saveSettings(settings: UserSettings): Promise<void> {
    await chrome.storage.sync.set({ user_settings: settings });
  }

  static async getSettings(): Promise<UserSettings> {
    const result = await chrome.storage.sync.get(["user_settings"]);
    return (
      result.user_settings || {
        theme: "auto",
        notifications: true,
        defaultTimeOffset: 2,
      }
    );
  }

  private static async compressRecords(): Promise<void> {
    const records = await this.getRecords();
    const threeMonthsAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

    const recentRecords = records.filter((r) => r.timestamp >= threeMonthsAgo);
    const oldRecords = records.filter((r) => r.timestamp < threeMonthsAgo);

    if (oldRecords.length > 0) {
      const compressed = this.compressRecordsByTimeSlot(oldRecords);
      await this.set(`compressed_${Date.now()}`, compressed);
      localStorage.setItem("toilet_records", JSON.stringify(recentRecords));
    }
  }

  private static compressRecordsByTimeSlot(
    records: ToiletRecord[]
  ): Record<string, any> {
    const grouped: Record<string, ToiletRecord[]> = {};

    records.forEach((record) => {
      const date = new Date(record.timestamp);
      const timeSlotKey = TimeSlotUtils.getTimeSlotKey(date);

      if (!grouped[timeSlotKey]) {
        grouped[timeSlotKey] = [];
      }
      grouped[timeSlotKey].push(record);
    });

    const compressed: Record<string, any> = {};

    Object.entries(grouped).forEach(([timeSlotKey, groupRecords]) => {
      const availableCount = groupRecords.filter(
        (r) => r.result === "available"
      ).length;
      const occupiedCount = groupRecords.filter(
        (r) => r.result === "occupied" || r.result === "full"
      ).length;

      compressed[timeSlotKey] = {
        totalRecords: groupRecords.length,
        availableCount,
        occupiedCount,
        lastTimestamp: Math.max(...groupRecords.map((r) => r.timestamp)),
        locationId: groupRecords[0].locationId,
      };
    });

    return compressed;
  }
}

// 高级预测器类（保留原有的复杂预测逻辑）
export class Predictor {
  static predict(
    targetDate: Date,
    locationId: string,
    historicalRecords: ToiletRecord[]
  ): any {
    const timeSlotRecords = historicalRecords.filter((record) => {
      const recordDate = new Date(record.timestamp);
      const recordKey = TimeSlotUtils.getTimeSlotKey(recordDate);
      const targetKey = TimeSlotUtils.getTimeSlotKey(targetDate);
      return recordKey === targetKey && record.locationId === locationId;
    });

    if (timeSlotRecords.length === 0) {
      return this.predictFromSimilarTimeSlots(
        targetDate,
        locationId,
        historicalRecords
      );
    }

    const timeSlotKey = TimeSlotUtils.getTimeSlotKey(targetDate);
    const availabilityRate =
      StatisticsUtils.calculateAvailabilityRate(timeSlotRecords);
    const dataConsistency =
      StatisticsUtils.calculateDataConsistency(timeSlotRecords);
    const trend = StatisticsUtils.calculateTrend(timeSlotRecords);
    const seasonalAdjustment =
      StatisticsUtils.calculateSeasonalAdjustment(targetDate);

    const confidence = StatisticsUtils.calculateConfidence(
      timeSlotRecords.length,
      dataConsistency
    );

    const adjustedProbability = Math.max(
      0,
      Math.min(1, availabilityRate + trend * 0.1 + seasonalAdjustment * 0.2)
    );

    return {
      timeSlotKey,
      locationId,
      date: targetDate,
      availabilityProbability: adjustedProbability,
      confidence,
      sampleSize: timeSlotRecords.length,
      isRecommended: false,
      metadata: {
        baseProbability: availabilityRate,
        trendAdjustment: trend * 0.1,
        seasonalAdjustment: seasonalAdjustment * 0.2,
        contextFactors: {
          dataConsistency,
          sampleSize: timeSlotRecords.length,
        },
      },
    };
  }

  private static predictFromSimilarTimeSlots(
    targetDate: Date,
    locationId: string,
    allRecords: ToiletRecord[]
  ): any {
    const targetContext = TimeSlotUtils.getTimeSlotContext(targetDate);
    const timeSlotKey = TimeSlotUtils.getTimeSlotKey(targetDate);

    const similarRecords = allRecords.filter((record) => {
      const recordDate = new Date(record.timestamp);
      const recordContext = TimeSlotUtils.getTimeSlotContext(recordDate);

      let similarity = 0;

      if (targetContext.isWeekend === recordContext.isWeekend) {
        similarity += 0.3;
      }

      if (targetContext.timeOfDay === recordContext.timeOfDay) {
        similarity += 0.4;
      }

      if (targetContext.isPeak === recordContext.isPeak) {
        similarity += 0.3;
      }

      return similarity >= 0.5;
    });

    if (similarRecords.length === 0) {
      return {
        timeSlotKey,
        locationId,
        date: targetDate,
        availabilityProbability: 0.5,
        confidence: 0.1,
        sampleSize: 0,
        isRecommended: false,
      };
    }

    const availabilityRate =
      StatisticsUtils.calculateAvailabilityRate(similarRecords);
    const confidence = Math.min(
      0.7,
      StatisticsUtils.calculateConfidence(
        similarRecords.length,
        StatisticsUtils.calculateDataConsistency(similarRecords)
      )
    );

    return {
      timeSlotKey,
      locationId,
      date: targetDate,
      availabilityProbability: availabilityRate,
      confidence,
      sampleSize: similarRecords.length,
      isRecommended: false,
    };
  }

  static predictBatch(
    locationId: string,
    hoursAhead: number,
    historicalRecords: ToiletRecord[]
  ): any[] {
    const futureSlots = TimeSlotUtils.getFutureTimeSlots(hoursAhead * 2);

    return futureSlots.map(({ date }) =>
      this.predict(date, locationId, historicalRecords)
    );
  }

  static getRecommendedTimeSlots(predictions: any[], count: number = 3): any[] {
    const scoredPredictions = predictions.map((prediction) => ({
      ...prediction,
      score:
        prediction.availabilityProbability *
        (0.7 + 0.3 * prediction.confidence),
    }));

    const recommended = scoredPredictions
      .filter((p) => p.score >= 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, count)
      .map((p) => ({ ...p, isRecommended: true }));

    return recommended;
  }
}

// 通用工具函数
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const formatDate = (date: Date): string => {
  return date.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// 重构的预测引擎
export class PredictionEngine {
  private records: ToiletRecord[];
  private totalStalls: number;
  private granularity: TimeGranularity;

  constructor(records: ToiletRecord[], totalStalls: number) {
    this.records = records;
    this.totalStalls = totalStalls;
    this.granularity = TimeSlotUtils.determineGranularity(records.length);
  }

  // 生成最佳时段预测 - 根据精度调整预测数量
  generateBestTimeSlots(maxResults: number = 5): BestTimeSlot[] {
    // 根据颗粒度调整未来时段数量
    let futureSlotCount: number;
    switch (this.granularity) {
      case "10min":
        futureSlotCount = 48; // 8小时 * 6个10分钟段
        break;
      case "15min":
        futureSlotCount = 32; // 8小时 * 4个15分钟段
        break;
      case "30min":
      default:
        futureSlotCount = 16; // 8小时 * 2个30分钟段
        break;
    }

    const futureSlots = TimeSlotUtils.getFutureTimeSlots(
      futureSlotCount,
      this.granularity
    );

    const predictions: PredictionResult[] = [];

    for (const slot of futureSlots) {
      const prediction = this.generateSlotPrediction(slot);
      predictions.push(prediction);
    }

    // 筛选并排序最佳时段
    const availableSlots = predictions
      .filter((p) => p.busyLevel <= 60) // 只显示不太忙的时段
      .map((prediction) => this.calculateSlotScore(prediction))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults);

    return availableSlots;
  }

  // 生成单个时段预测
  private generateSlotPrediction(slot: {
    key: string;
    date: Date;
    startTime: Date;
    endTime: Date;
  }): PredictionResult {
    // 获取该时段的历史记录
    const slotRecords = this.records.filter((record) => {
      const recordDate = new Date(record.timestamp);
      const recordKey = TimeSlotUtils.getTimeSlotKey(
        recordDate,
        this.granularity
      );
      return recordKey === slot.key;
    });

    let busyLevel = 50; // 默认值
    let confidence = 0.3; // 默认置信度

    if (slotRecords.length > 0) {
      // 计算该时段的繁忙程度
      const fullCount = slotRecords.filter(
        (r) => r.result === "full" || r.result === "occupied"
      ).length;
      busyLevel = (fullCount / slotRecords.length) * 100;

      // 计算置信度
      const dataConsistency =
        StatisticsUtils.calculateDataConsistency(slotRecords);
      confidence = StatisticsUtils.calculateConfidence(
        slotRecords.length,
        dataConsistency
      );
    }

    // 评估数据质量
    const dataQuality = DataQualityUtils.assessDataQuality(
      slotRecords.length,
      confidence
    );

    return {
      timeSlot: TimeSlotUtils.getTimeSlotDisplay(slot.key, this.granularity),
      startTime: slot.startTime,
      endTime: slot.endTime,
      busyLevel,
      confidence,
      sampleSize: slotRecords.length,
      dataQuality,
      granularity: this.granularity,
      isRecommended: busyLevel <= 60 && confidence >= 0.4,
    };
  }

  // 计算时段评分
  private calculateSlotScore(prediction: PredictionResult): BestTimeSlot {
    // 可用性评分 (busyLevel越低越好)
    const availabilityScore = (100 - prediction.busyLevel) / 100;

    // 置信度评分
    const confidenceScore = prediction.confidence;

    // 时间距离评分 (不要太远的未来)
    const hoursFromNow =
      (prediction.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
    const timeScore = Math.max(0, 1 - hoursFromNow / 8); // 8小时内评分较高

    // 综合评分
    const score =
      availabilityScore * 0.5 + confidenceScore * 0.3 + timeScore * 0.2;

    // 生成推荐理由
    let reason = "";
    if (prediction.busyLevel <= 30) {
      reason = "通常很空闲，推荐前往";
    } else if (prediction.busyLevel <= 50) {
      reason = "相对空闲，可以前往";
    } else if (prediction.busyLevel <= 60) {
      reason = "可能需要等待，但可接受";
    }

    if (prediction.dataQuality.level === "low") {
      reason += "（数据较少，仅供参考）";
    }

    return {
      prediction,
      score,
      reason,
    };
  }

  // 获取当前时段预测（支持精确颗粒度）
  getCurrentPrediction(): PredictionResult | null {
    const now = new Date();
    const currentKey = TimeSlotUtils.getTimeSlotKey(now, this.granularity);

    const slot = {
      key: currentKey,
      date: now,
      startTime: now,
      endTime: new Date(
        now.getTime() + this.getGranularityMinutes() * 60 * 1000
      ),
    };

    return this.generateSlotPrediction(slot);
  }

  private getGranularityMinutes(): number {
    switch (this.granularity) {
      case "10min":
        return 10;
      case "15min":
        return 15;
      case "30min":
      default:
        return 30;
    }
  }

  // 获取数据收集进度
  getDataCollectionProgress(): DataCollectionProgress {
    return DataQualityUtils.getDataCollectionProgress(this.records.length);
  }
}

// 数据质量评估工具
export class DataQualityUtils {
  // 评估数据质量 - 调整数据量要求
  static assessDataQuality(
    sampleSize: number,
    confidence: number
  ): DataQuality {
    if (sampleSize >= 50 && confidence >= 0.8) {
      return {
        level: "high",
        color: "green",
        text: `基于 ${sampleSize} 条记录，预测精度很高`,
        icon: "🟢",
        confidence,
        sampleSize,
      };
    } else if (sampleSize >= 20 && confidence >= 0.6) {
      return {
        level: "medium",
        color: "yellow",
        text: `基于 ${sampleSize} 条记录，预测中等可靠`,
        icon: "🟡",
        confidence,
        sampleSize,
      };
    } else {
      return {
        level: "low",
        color: "orange",
        text: `数据不足(${sampleSize}条)，建议多记录几次`,
        icon: "🟠",
        confidence,
        sampleSize,
      };
    }
  }

  // 生成数据收集进度信息 - 调整目标记录数
  static getDataCollectionProgress(
    currentRecords: number
  ): DataCollectionProgress {
    const targetRecords = 50; // 调整目标记录数
    const progressPercentage = Math.min(
      100,
      (currentRecords / targetRecords) * 100
    );

    let qualityLevel: DataQuality["level"];
    let recommendations: string[];

    if (currentRecords >= 100) {
      qualityLevel = "high";
      recommendations = [
        "数据充足，已启用10分钟精度预测",
        "预测准确度很高，可放心使用",
      ];
    } else if (currentRecords >= 50) {
      qualityLevel = "high";
      recommendations = [
        "数据充足，预测准确度较高",
        `再记录 ${100 - currentRecords} 条可升级到10分钟精度`,
      ];
    } else if (currentRecords >= 30) {
      qualityLevel = "medium";
      recommendations = [
        "已启用15分钟精度预测",
        `还需 ${50 - currentRecords} 条记录达到高精度预测`,
      ];
    } else if (currentRecords >= 20) {
      qualityLevel = "medium";
      recommendations = [
        `还需 ${30 - currentRecords} 条记录启用15分钟精度`,
        "当前使用30分钟精度预测",
      ];
    } else {
      qualityLevel = "low";
      recommendations = [
        `至少需要 ${20 - currentRecords} 条记录才能提供可靠预测`,
        "建议在一周内的不同时间记录",
        "数据越多，预测精度越高",
      ];
    }

    return {
      currentRecords,
      targetRecords,
      progressPercentage,
      qualityLevel,
      recommendations,
    };
  }

  // 获取质量指示器的CSS类名
  static getQualityColorClass(level: DataQuality["level"]): string {
    switch (level) {
      case "high":
        return "text-green-600 bg-green-50 border-green-200";
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low":
        return "text-orange-600 bg-orange-50 border-orange-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  }
}
