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
  ChineseDateType,
  ChineseDateInfo,
} from "../types";

// 中国节假日数据 (2025年)
const CHINESE_HOLIDAYS_DATA: Record<number, ChineseDateInfo[]> = {
  2025: [
    // 元旦 2025
    { date: "2025-01-01", type: "holiday", name: "元旦", isOfficial: true },

    // 春节 2025 (1月28日-2月3日放假，1月26日、2月8日上班)
    {
      date: "2025-01-26",
      type: "makeup_workday",
      name: "春节调休",
      isOfficial: true,
    },
    { date: "2025-01-28", type: "holiday", name: "春节", isOfficial: true },
    { date: "2025-01-29", type: "holiday", name: "春节", isOfficial: true },
    { date: "2025-01-30", type: "holiday", name: "春节", isOfficial: true },
    { date: "2025-01-31", type: "holiday", name: "春节", isOfficial: true },
    { date: "2025-02-01", type: "holiday", name: "春节", isOfficial: true },
    { date: "2025-02-02", type: "holiday", name: "春节", isOfficial: true },
    { date: "2025-02-03", type: "holiday", name: "春节", isOfficial: true },
    {
      date: "2025-02-08",
      type: "makeup_workday",
      name: "春节调休",
      isOfficial: true,
    },

    // 其他节假日待官方公布...
  ],
};

// 简化的中国日历工具类 - 只保留核心功能
export class ChineseCalendar {
  private static holidayCache: Map<string, ChineseDateInfo> = new Map();

  // 初始化节假日缓存
  static initializeHolidayCache() {
    this.holidayCache.clear();
    Object.values(CHINESE_HOLIDAYS_DATA)
      .flat()
      .forEach((holiday) => {
        this.holidayCache.set(holiday.date, holiday);
      });
  }

  // 获取日期类型
  static getDateType(date: Date): ChineseDateType {
    const dateStr = this.formatDate(date);
    const holiday = this.holidayCache.get(dateStr);

    if (holiday) {
      return holiday.type;
    }

    // 普通周末判断
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return "weekend";
    }

    // 默认工作日
    return "workday";
  }

  // 获取日期信息
  static getDateInfo(date: Date): ChineseDateInfo {
    const dateStr = this.formatDate(date);
    const holiday = this.holidayCache.get(dateStr);

    if (holiday) {
      return holiday;
    }

    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return {
        date: dateStr,
        type: "weekend",
        name: dayOfWeek === 0 ? "周日" : "周六",
        isOfficial: true,
      };
    }

    return {
      date: dateStr,
      type: "workday",
      name: this.getWeekdayName(dayOfWeek),
      isOfficial: true,
    };
  }

  // 获取日期类型的显示名称
  static getDateTypeDisplayName(type: ChineseDateType): string {
    switch (type) {
      case "workday":
        return "工作日";
      case "weekend":
        return "周末";
      case "holiday":
        return "节假日";
      case "makeup_workday":
        return "调休班";
      case "compensatory_holiday":
        return "调休假";
      default:
        return "普通日";
    }
  }

  // 获取日期类型的样式类
  static getDateTypeStyle(type: ChineseDateType): string {
    switch (type) {
      case "workday":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "weekend":
        return "bg-green-100 text-green-800 border-green-200";
      case "holiday":
        return "bg-red-100 text-red-800 border-red-200";
      case "makeup_workday":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "compensatory_holiday":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }

  // 获取日期类型的图标
  static getDateTypeIcon(type: ChineseDateType): string {
    switch (type) {
      case "workday":
        return "💼";
      case "weekend":
        return "🏠";
      case "holiday":
        return "🎉";
      case "makeup_workday":
        return "⚡";
      case "compensatory_holiday":
        return "🎈";
      default:
        return "📅";
    }
  }

  private static formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private static getWeekdayName(dayOfWeek: number): string {
    const names = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    return names[dayOfWeek];
  }

  // 判断是否为工作时间（考虑节假日）
  static isWorkTime(date: Date): boolean {
    const type = this.getDateType(date);
    return type === "workday" || type === "makeup_workday";
  }

  // 判断是否为休息时间
  static isRestTime(date: Date): boolean {
    const type = this.getDateType(date);
    return (
      type === "weekend" ||
      type === "holiday" ||
      type === "compensatory_holiday"
    );
  }

  // 获取即将到来的节假日
  static getUpcomingHolidays(count: number = 3): ChineseDateInfo[] {
    const holidays: ChineseDateInfo[] = [];
    const today = new Date();
    const todayStr = this.formatDate(today);

    // 从缓存中获取未来的节假日
    const sortedHolidays = Array.from(this.holidayCache.values())
      .filter(
        (holiday) =>
          holiday.date >= todayStr &&
          (holiday.type === "holiday" ||
            holiday.type === "compensatory_holiday")
      )
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, count);

    return sortedHolidays;
  }

  // 获取当月特殊日期
  static getCurrentMonthSpecialDates(): ChineseDateInfo[] {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const specialDates: ChineseDateInfo[] = [];

    for (
      let date = new Date(firstDay);
      date <= lastDay;
      date.setDate(date.getDate() + 1)
    ) {
      const dateStr = this.formatDate(date);
      const holiday = this.holidayCache.get(dateStr);

      if (
        holiday &&
        (holiday.type === "holiday" ||
          holiday.type === "makeup_workday" ||
          holiday.type === "compensatory_holiday")
      ) {
        specialDates.push(holiday);
      }
    }

    return specialDates.sort((a, b) => a.date.localeCompare(b.date));
  }
}

// 初始化节假日缓存
ChineseCalendar.initializeHolidayCache();

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

  // 更新获取时间段上下文，集成中国节假日
  static getTimeSlotContext(date: Date): {
    isPeak: boolean;
    isWeekend: boolean;
    isWorkTime: boolean;
    timeOfDay: "morning" | "afternoon" | "evening" | "night";
    dateType: ChineseDateType;
    dateInfo: ChineseDateInfo;
  } {
    const hour = date.getHours();
    const dateInfo = ChineseCalendar.getDateInfo(date);
    const dateType = dateInfo.type;
    const isWorkTime = ChineseCalendar.isWorkTime(date);
    const isRestTime = ChineseCalendar.isRestTime(date);

    let timeOfDay: "morning" | "afternoon" | "evening" | "night";
    if (hour >= 6 && hour < 12) timeOfDay = "morning";
    else if (hour >= 12 && hour < 18) timeOfDay = "afternoon";
    else if (hour >= 18 && hour < 22) timeOfDay = "evening";
    else timeOfDay = "night";

    // 高峰期判断：工作日的特定时间段
    let isPeak = false;
    if (isWorkTime) {
      isPeak = (hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16);
    }

    return {
      isPeak,
      isWeekend: isRestTime,
      isWorkTime,
      timeOfDay,
      dateType,
      dateInfo,
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

  // 生成最佳时段预测 - 优化为3个非连续时段
  generateBestTimeSlots(maxResults: number = 3): BestTimeSlot[] {
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
      .sort((a, b) => b.score - a.score);

    // 选择非连续的最佳时段
    return this.selectNonConsecutiveSlots(availableSlots, maxResults);
  }

  // 选择非连续的时段，确保推荐的时段之间有合理间隔
  private selectNonConsecutiveSlots(
    scoredSlots: BestTimeSlot[],
    maxResults: number
  ): BestTimeSlot[] {
    if (scoredSlots.length === 0) return [];

    const selected: BestTimeSlot[] = [];
    const minIntervalMinutes = this.getMinIntervalMinutes(); // 根据颗粒度确定最小间隔

    for (const slot of scoredSlots) {
      if (selected.length >= maxResults) break;

      // 检查与已选时段的时间间隔
      const hasConflict = selected.some((selectedSlot) =>
        this.areTimeSlotsTooClose(slot, selectedSlot, minIntervalMinutes)
      );

      if (!hasConflict) {
        selected.push(slot);
      }
    }

    return selected;
  }

  // 检查两个时段是否过于接近
  private areTimeSlotsTooClose(
    slot1: BestTimeSlot,
    slot2: BestTimeSlot,
    minIntervalMinutes: number
  ): boolean {
    const time1 = slot1.prediction.startTime.getTime();
    const time2 = slot2.prediction.startTime.getTime();
    const timeDiffMinutes = Math.abs(time1 - time2) / (1000 * 60);

    return timeDiffMinutes < minIntervalMinutes;
  }

  // 根据颗粒度确定最小时间间隔
  private getMinIntervalMinutes(): number {
    switch (this.granularity) {
      case "10min":
        return 30; // 10分钟颗粒度要求至少30分钟间隔
      case "15min":
        return 45; // 15分钟颗粒度要求至少45分钟间隔
      case "30min":
      default:
        return 60; // 30分钟颗粒度要求至少60分钟间隔
    }
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

// 性能优化工具类 - 基于requestAnimationFrame
export class PerformanceUtils {
  private static activeTimers: Map<string, number> = new Map();

  // 基于rAF的定时器，替代setInterval
  static createTimer(
    callback: () => void,
    interval: number,
    timerId?: string
  ): string {
    const id = timerId || this.generateTimerId();
    let lastTime = 0;

    const tick = (currentTime: number) => {
      if (currentTime - lastTime >= interval) {
        callback();
        lastTime = currentTime;
      }

      // 继续下一帧
      const rafId = requestAnimationFrame(tick);
      this.activeTimers.set(id, rafId);
    };

    // 启动第一帧
    const rafId = requestAnimationFrame(tick);
    this.activeTimers.set(id, rafId);

    return id;
  }

  // 停止定时器
  static clearTimer(timerId: string): void {
    const rafId = this.activeTimers.get(timerId);
    if (rafId) {
      cancelAnimationFrame(rafId);
      this.activeTimers.delete(timerId);
    }
  }

  // 清理所有定时器
  static clearAllTimers(): void {
    this.activeTimers.forEach((rafId) => {
      cancelAnimationFrame(rafId);
    });
    this.activeTimers.clear();
  }

  // 页面可见性检测的定时器 - 页面不可见时暂停
  static createVisibilityAwareTimer(
    callback: () => void,
    interval: number,
    timerId?: string
  ): string {
    const id = timerId || this.generateTimerId();
    let lastTime = 0;
    let isRunning = true;

    // 监听页面可见性
    const handleVisibilityChange = () => {
      isRunning = !document.hidden;
      if (isRunning) {
        lastTime = 0; // 重置时间，避免累积延迟
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const tick = (currentTime: number) => {
      if (isRunning && currentTime - lastTime >= interval) {
        callback();
        lastTime = currentTime;
      }

      // 继续下一帧
      const rafId = requestAnimationFrame(tick);
      this.activeTimers.set(id, rafId);
    };

    // 启动第一帧
    const rafId = requestAnimationFrame(tick);
    this.activeTimers.set(id, rafId);

    // 存储清理函数
    const originalClearTimer = this.clearTimer.bind(this);
    this.clearTimer = (timerId: string) => {
      if (timerId === id) {
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
      }
      originalClearTimer(timerId);
    };

    return id;
  }

  // 生成唯一定时器ID
  private static generateTimerId(): string {
    return `timer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 获取活跃定时器数量
  static getActiveTimerCount(): number {
    return this.activeTimers.size;
  }

  // 调试信息
  static getDebugInfo(): {
    activeTimers: number;
    timerIds: string[];
  } {
    return {
      activeTimers: this.activeTimers.size,
      timerIds: Array.from(this.activeTimers.keys()),
    };
  }
}

// 组件卸载时的清理工具
export class ComponentCleanup {
  private timerIds: Set<string> = new Set();

  // 注册定时器
  registerTimer(timerId: string): void {
    this.timerIds.add(timerId);
  }

  // 清理所有注册的定时器
  cleanup(): void {
    this.timerIds.forEach((timerId) => {
      PerformanceUtils.clearTimer(timerId);
    });
    this.timerIds.clear();
  }

  // 创建并注册定时器
  createTimer(
    callback: () => void,
    interval: number,
    useVisibilityAware: boolean = true
  ): string {
    const timerId = useVisibilityAware
      ? PerformanceUtils.createVisibilityAwareTimer(callback, interval)
      : PerformanceUtils.createTimer(callback, interval);

    this.registerTimer(timerId);
    return timerId;
  }
}
