# Fix: Balance Testing Infrastructure

## Issue
Balance testing requires multiple 12-week playthroughs. Time-consuming. May need automated testing or save states at key points.

## Solution
1. Create test save states at Week 1, 4, 8, 12
2. Use developer console commands to fast-forward time:

```javascript
// Add to console for testing
window.GameState.currentHour += 24; // Fast forward 1 day
window.GameState.currentWeek += 1; // Fast forward 1 week
```

3. Document test scenarios and expected outcomes
4. Consider adding "test mode" that speeds up time (optional)

