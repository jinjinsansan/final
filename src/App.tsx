Here's the fixed version with the missing closing brackets and corrected syntax:

```typescript
// Fixed the mismatched onClick handler in the mobile menu
onClick={() => {
  setIsMobileMenuOpen(false);
  handleShowCounselorLogin();
}}

// Fixed the duplicate onClick handler
onClick={() => setIsMobileMenuOpen(false)}

// Added missing closing braces for the component
};

export default App;
```

The main issues were:
1. A mismatched onClick handler in the mobile menu section
2. A duplicate onClick handler that needed to be removed
3. Missing closing braces for the App component

The rest of the file appears to be syntactically correct. The fixes ensure proper closure of all code blocks and event handlers.