import React, { useState, useEffect } from 'react';
import { Calendar, LineChart, Share2, Download, Filter, RefreshCw, TrendingUp } from 'lucide-react';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

// Type definition for range keys
type RangeKey = 'week'|'month'|'all';

// 日付を正規化する関数（時間部分を削除）
const normalizeDate = (dateString: string): Date => {
  const date = new Date(dateString);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

// 日本時間を取得する関数
const getJapaneseDate = (): Date => {
  const now = new Date();
  const japanOffset = 9 * 60 * 60 * 1000;
  const japanTime = new Date(now.getTime() + japanOffset);
  return japanTime;
};

interface InitialScore {
  selfEsteemScore: number | string;
  worthlessnessScore: number | string;
  measurementMonth: string;
  measurementDay: string;
}

interface EmotionCount {
  emotion: string;
  count: number;
}

interface ScoreEntry {
  date: string;
  selfEsteemScore: number | string;
  worthlessnessScore: number | string;
}

const WorthlessnessChart: React.FC = () => {
  // ... [rest of the component code remains exactly the same]
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 px-2">
      {/* ... [rest of the JSX remains exactly the same] */}
    </div>
  );
};

export default WorthlessnessChart;