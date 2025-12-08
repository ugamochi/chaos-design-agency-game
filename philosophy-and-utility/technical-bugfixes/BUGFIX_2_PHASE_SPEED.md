# BUG 2: Phase Progress Too Slow Fix

## Problem
Phases take 40+ seconds each to complete. Should take 5-15 seconds. Makes game unplayable.

## Math Issue
```javascript
// Current rates are TOO SMALL for tick-based system
const baseProgressRates = {
    management: 0.20,   // 40 seconds per phase!
    design: 0.15,       // 53 seconds per phase!
    development: 0.10,  // 80 seconds per phase!
    qa: 0.18           // 44 seconds per phase!
};
```

## Fix Instructions

### Step 1: Open projects.js
Find the `baseProgressRates` constant (around line 583-650)

### Step 2: Replace Values
Multiply all values by 10x:

```javascript
const baseProgressRates = {
    management: 2.0,     // Now ~5-8 seconds
    design: 1.5,         // Now ~7-10 seconds
    development: 1.0,    // Now ~10-15 seconds
    qa: 1.8             // Now ~6-9 seconds
};
```

### Step 3: Add Comment
```javascript
// Progress rates for 10 ticks/second with tickMultiplier 0.0125
// Example: management with 1 worker at 100% efficiency
// 2.0 * 1.0 * 0.0125 * 10 = 0.25 progress/sec = 4 seconds
```

## Testing
1. Start new game
2. Assign 1 worker to project
3. Time each phase with stopwatch:
   - Management: 5-8 seconds ✓
   - Design: 7-10 seconds ✓
   - Development: 10-15 seconds ✓
   - QA: 6-9 seconds ✓

## If Still Too Slow/Fast
- **Too slow**: Increase values (try 12x or 15x multiplier)
- **Too fast**: Decrease values (try 5x or 8x multiplier)

## Files to Modify
- `projects.js` - Update `baseProgressRates` values
