Here's the fixed version with added closing brackets and parentheses:

```javascript
                    return (
                      <button
                        key={index}
                        onClick={() => !isFuture && handleDateSelect(day)}
                        disabled={isFuture}
                        className={`
                          w-full aspect-square flex items-center justify-center text-sm
                          ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                          ${isSelected ? 'bg-blue-500 text-white rounded-full' : ''}
                          ${isToday ? 'border-2 border-blue-500 rounded-full' : ''}
                          ${!isFuture ? 'hover:bg-gray-100 rounded-full' : ''}
                          ${isFuture ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                        `}
                      >
                        {day.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 気づきセクション */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-jp-bold text-gray-900 mb-4">気づき</h2>
          <textarea
            value={formData.realization}
            onChange={(e) => setFormData({...formData, realization: e.target.value})}
            className="w-full h-32 p-4 border border-gray-200 rounded-lg resize-none focus:ring-1 focus:ring-blue-500 focus:border-transparent font-jp-normal"
            placeholder="気づいたことを書いてみましょう"
          />
        </div>

        {/* 保存ボタン */}
        <div className="flex justify-center space-x-4 mt-8 mb-16">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-jp-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5" />
            <span>保存する</span>
          </button>
          <button
            onClick={handleShare}
            className="flex items-center space-x-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-jp-bold"
          >
            <Share2 className="w-5 h-5" />
            <span>シェアする</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiaryPage;
```