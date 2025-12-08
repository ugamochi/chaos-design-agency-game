# CURSOR PROMPT: Fix Phase Progress Speed

## Problem
Phases take 40+ seconds each. Should be 5-15 seconds.

## Fix

### In projects.js
**FIND** `baseProgressRates` (around line 583-650)

**REPLACE THIS:**
```javascript
const baseProgressRates = {
    management: 0.20,
    design: 0.15,
    development: 0.10,
    qa: 0.18
};
```

**WITH THIS:**
```javascript
const baseProgressRates = {
    management: 2.0,    // 10x faster
    design: 1.5,        // 10x faster
    development: 1.0,   // 10x faster
    qa: 1.8            // 10x faster
};
```

## Test
- Assign 1 worker to project
- Management phase: 5-8 seconds
- Design: 7-10 seconds
- Development: 10-15 seconds

## Files
- projects.js (multiply baseProgressRates by 10)
