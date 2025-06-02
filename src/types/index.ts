// 洗手间记录相关类型
export interface ToiletRecord {
  id: string;
  timestamp: number;
  locationId: string;
  result: "occupied" | "available" | "full";
  totalStalls?: number;
  userId?: string;
}

// 位置信息
export interface Location {
  id: string;
  name: string;
  totalStalls: number;
  createdAt: number;
  isDefault?: boolean;
}

// 预测结果类型（简化版）
export interface PredictionResult {
  timeSlot: string;
  busyLevel: number;
  confidence: number;
}

// 时间段统计
export interface TimeSlotStats {
  timeSlotKey: string;
  locationId: string;
  lastUpdated: number;
  totalRecords: number;
  occupiedCount: number;
  availableCount: number;
  availabilityRate: number;
  confidence: number;
  dataConsistency: number;
}

// 预测结果
export interface TimeSlotPrediction {
  timeSlotKey: string;
  locationId: string;
  date: Date;
  availabilityProbability: number;
  confidence: number;
  sampleSize: number;
  isRecommended: boolean;
  metadata?: {
    baseProbability: number;
    trendAdjustment: number;
    seasonalAdjustment: number;
    contextFactors: Record<string, number>;
  };
}

// 用户设置
export interface UserSettings {
  defaultLocationId?: string;
  theme: "light" | "dark" | "auto";
  notifications: boolean;
  defaultTimeOffset: number;
}

// 预测请求
export interface PredictionRequest {
  locationId: string;
  targetTime: Date;
  hoursAhead?: number;
}

// 推荐时段
export interface RecommendedTimeSlot {
  time: Date;
  availabilityProbability: number;
  confidence: number;
  reason: string;
}

// 导出数据包
export interface ExportPackage {
  version: string;
  timestamp: number;
  locations: Location[];
  records: ToiletRecord[];
  stats: TimeSlotStats[];
  settings: UserSettings;
  checksum: string;
}

// 通用类型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 组件Props基础类型
export interface ComponentProps {
  class?: string;
  style?: string;
}

// 图表数据类型
export interface ChartDataPoint {
  x: string | number;
  y: number;
  label?: string;
}

export interface HeatMapData {
  timeSlots: Array<{
    time: string;
    probability: number;
    confidence: number;
  }>;
}
