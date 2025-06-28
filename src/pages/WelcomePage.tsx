import React from 'react';
import { Heart } from 'lucide-react';

const WelcomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-pink-100 rounded-full mx-auto flex items-center justify-center">
            <Heart className="w-10 h-10 text-pink-500" />
          </div>
        </div>
        
        <h1 className="text-3xl font-jp-bold text-gray-900 mb-4">
          かんじょうにっき
        </h1>
        
        <p className="text-gray-600 font-jp-normal mb-8">
          自己肯定感を育てる感情日記アプリ
        </p>
        
        <a 
          href="/diary"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-jp-bold transition-colors shadow-md hover:shadow-lg text-lg"
        >
          はじめる
        </a>
        
        <div className="mt-12 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500 font-jp-normal">
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