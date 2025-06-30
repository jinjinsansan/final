import React, { useState, useEffect } from 'react';
import { Search, Calendar, Filter, X, Eye, Edit3, Trash2, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import { getCurrentUser } from '../lib/deviceAuth';

interface JournalEntry {
  id: string;
  date: string;
  emotion: string;
  event: string;
  realization: string;
  selfEsteemScore: number;
  worthlessnessScore: number;
  counselor_memo?: string;
  is_visible_to_user?: boolean;
  counselor_name?: string;
}

const DiarySearchPage: React.FC = () => {
  // ... [rest of the code remains the same until the end]

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 px-2">
      {/* ... [rest of the JSX remains the same until the end] */}
      <div className="fixed bottom-4 right-4 bg-green-100 border border-green-200 rounded-lg p-3 shadow-lg z-10">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div> 
          <span className="text-green-800 font-jp-medium text-sm whitespace-nowrap">
            {import.meta.env.VITE_LOCAL_MODE === 'true'
              ? 'ローカルモードで動作中'
              : !navigator.onLine
                ? 'オフラインモードで動作中'
                : `${currentUser?.lineUsername || 'ゲスト'}のデータ`}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DiarySearchPage;