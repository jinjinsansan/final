import React from 'react';
import { Heart, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const WelcomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        {/* ロゴ */}
        <div className="mb-6">
          <div className="w-20 h-20 bg-pink-100 rounded-full mx-auto flex items-center justify-center">
            <Heart className="w-10 h-10 text-pink-500" />
          </div>
        </div>

        {/* タイトル */}
        <h1 className="text-3xl font-jp-bold text-gray-900 mb-4">
          かんじょうにっき
        </h1>
        
        {/* サブタイトル */}
        <p className="text-gray-600 font-jp-normal mb-8">
          自己肯定感を育てる感情日記アプリ
        </p>

        {/* 説明文 */}
        <div className="bg-blue-50 rounded-lg p-6 mb-8 text-left">
          <p className="text-gray-700 font-jp-normal leading-relaxed">
            一般社団法人NAMIDAサポート協会が提唱する<span className="font-jp-bold text-blue-600">テープ式心理学</span>に基づいた感情日記アプリです。
            <br /><br />
            日々の感情を記録し、自己肯定感を育てていきましょう。
          </p>
        </div>

        {/* 開始ボタン */}
        <Link 
          to="/privacy"
          className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-jp-bold transition-colors shadow-md hover:shadow-lg text-lg"
        >
          <span>はじめる</span>
          <ArrowRight className="w-5 h-5" />
        </Link>

        {/* フッター */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            一般社団法人NAMIDAサポート協会
          </p>
          <p className="text-xs text-gray-400 mt-1">
            テープ式心理学による心の健康サポート
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;