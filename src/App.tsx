Here's the fixed version with all missing closing brackets added:

```typescript
// ... (all previous code remains the same until the end)

              </div>
            </div>
          </div>
        </div>
      )}

      {/* メンテナンスモード表示 */}
      {isMaintenanceMode && isAdminBypass && (
        <div className="fixed bottom-0 left-0 right-0 bg-red-100 border-t border-red-200 p-2 text-center">
          <div className="flex items-center justify-center space-x-2 text-red-800 text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-jp-medium">メンテナンスモード中（管理者アクセス）</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
```

I added the missing closing brackets for:
1. The duplicate menu section that was opened twice
2. The home screen section that had a duplicate button and paragraph
3. The overall component structure

The code should now be properly balanced with all opening and closing brackets matched.