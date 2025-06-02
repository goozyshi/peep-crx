import * as ss from "simple-statistics";
import type { ToiletRecord, Location, UserSettings } from "../types";

// 时间段处理工具
export class TimeSlotUtils {
  static getTimeSlotKey(date: Date): string {
    const weekday = date.getDay();
    const hour = date.getHours();
    const minute = Math.floor(date.getMinutes() / 30) * 30;
    return `${weekday}-${hour}-${minute}`;
  }

  static parseTimeSlotKey(timeSlotKey: string): {
    weekday: number;
    hour: number;
    minute: number;
  } {
    const [weekday, hour, minute] = timeSlotKey.split("-").map(Number);
    return { weekday, hour, minute };
  }

  static getTimeSlotDisplay(timeSlotKey: string): string {
    const { weekday, hour, minute } = this.parseTimeSlotKey(timeSlotKey);
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    const timeStr = `${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")}`;
    return `${weekdays[weekday]} ${timeStr}`;
  }

  static getFutureTimeSlots(
    count: number = 24
  ): Array<{ key: string; date: Date }> {
    const slots: Array<{ key: string; date: Date }> = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const futureTime = new Date(now.getTime() + i * 30 * 60 * 1000);
      const key = this.getTimeSlotKey(futureTime);
      slots.push({ key, date: futureTime });
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

// Chrome存储管理
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
      const key = `${record.locationId}_${TimeSlotUtils.getTimeSlotKey(
        new Date(record.timestamp)
      )}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(record);
    });

    const compressed: Record<string, any> = {};
    Object.entries(grouped).forEach(([key, groupRecords]) => {
      compressed[key] = {
        totalRecords: groupRecords.length,
        occupiedCount: groupRecords.filter((r) => r.result === "occupied")
          .length,
        availableCount: groupRecords.filter((r) => r.result === "available")
          .length,
        timeRange: {
          start: Math.min(...groupRecords.map((r) => r.timestamp)),
          end: Math.max(...groupRecords.map((r) => r.timestamp)),
        },
      };
    });

    return compressed;
  }
}

// 预测算法
export class Predictor {
  static predict(
    targetDate: Date,
    locationId: string,
    historicalRecords: ToiletRecord[]
  ): any {
    const timeSlotKey = TimeSlotUtils.getTimeSlotKey(targetDate);

    const relevantRecords = historicalRecords.filter(
      (record) => record.locationId === locationId
    );

    const timeSlotRecords = relevantRecords.filter((record) => {
      const recordTimeSlotKey = TimeSlotUtils.getTimeSlotKey(
        new Date(record.timestamp)
      );
      return recordTimeSlotKey === timeSlotKey;
    });

    if (timeSlotRecords.length < 3) {
      return this.predictFromSimilarTimeSlots(
        targetDate,
        locationId,
        relevantRecords
      );
    }

    const availabilityRate =
      StatisticsUtils.calculateAvailabilityRate(timeSlotRecords);
    const dataConsistency =
      StatisticsUtils.calculateDataConsistency(timeSlotRecords);
    const confidence = StatisticsUtils.calculateConfidence(
      timeSlotRecords.length,
      dataConsistency
    );

    const seasonalAdjustment =
      StatisticsUtils.calculateSeasonalAdjustment(targetDate);
    const trend = StatisticsUtils.calculateTrend(timeSlotRecords);

    const adjustedProbability = Math.max(
      0,
      Math.min(1, availabilityRate + seasonalAdjustment * 0.2 + trend * 0.1)
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

// 简化的预测引擎
export class PredictionEngine {
  private records: ToiletRecord[];
  private totalStalls: number;

  constructor(records: ToiletRecord[], totalStalls: number) {
    this.records = records;
    this.totalStalls = totalStalls;
  }

  generateHourlyPredictions(): Array<{
    timeSlot: string;
    busyLevel: number;
    confidence: number;
  }> {
    const predictions = [];

    for (let hour = 6; hour < 22; hour++) {
      const timeSlot = `${hour.toString().padStart(2, "0")}:00-${(hour + 1)
        .toString()
        .padStart(2, "0")}:00`;

      // 获取该时段的历史记录
      const hourRecords = this.records.filter((record) => {
        const date = new Date(record.timestamp);
        return date.getHours() === hour;
      });

      let busyLevel = 50; // 默认值
      let confidence = 0.3; // 默认置信度

      if (hourRecords.length > 0) {
        // 计算该时段的繁忙程度
        const fullCount = hourRecords.filter(
          (r) => r.result === "full" || r.result === "occupied"
        ).length;
        busyLevel = (fullCount / hourRecords.length) * 100;
        confidence = Math.min(0.9, hourRecords.length / 10);
      }

      predictions.push({
        timeSlot,
        busyLevel,
        confidence,
      });
    }

    return predictions;
  }
}
