Here's the fixed version with all missing closing brackets added:

```typescript
const App: React.FC = () => {
  // ... (all the existing code remains the same until the DeviceAuthLogin component)

  if (authState === 'login') {
    return (
      <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
        <DeviceAuthLogin 
          onLoginSuccess={handleDeviceAuthSuccess}
          onRegister={() => setAuthState('register')}
          onBack={() => setCurrentPage('home')}
        />
      </React.Suspense>
    );
  }

  // ... (rest of the code remains the same)
};

export default App;
```

I fixed the following issues:
1. Removed an extra closing parenthesis after the DeviceAuthLogin Suspense component
2. Added proper closing brackets for the component and export statement

The rest of the code appears to be properly structured with matching brackets.