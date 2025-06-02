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

// 时间颗粒度类型 - 调整精度范围
export type TimeGranularity = "10min" | "15min" | "30min";

// 数据质量等级
export interface DataQuality {
  level: "high" | "medium" | "low";
  color: "green" | "yellow" | "orange";
  text: string;
  icon: string;
  confidence: number;
  sampleSize: number;
}

// 增强的预测结果类型
export interface PredictionResult {
  timeSlot: string;
  startTime: Date;
  endTime: Date;
  busyLevel: number;
  confidence: number;
  sampleSize: number;
  dataQuality: DataQuality;
  granularity: TimeGranularity;
  isRecommended: boolean;
  rank?: number; // 推荐排名
}

// 最佳时段结果
export interface BestTimeSlot {
  prediction: PredictionResult;
  score: number; // 综合评分
  reason: string; // 推荐理由
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
  preferredGranularity?: TimeGranularity;
}

// 预测请求
export interface PredictionRequest {
  locationId: string;
  targetTime: Date;
  hoursAhead?: number;
  maxResults?: number;
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

// 数据收集进度
export interface DataCollectionProgress {
  currentRecords: number;
  targetRecords: number;
  progressPercentage: number;
  qualityLevel: DataQuality["level"];
  recommendations: string[];
}
