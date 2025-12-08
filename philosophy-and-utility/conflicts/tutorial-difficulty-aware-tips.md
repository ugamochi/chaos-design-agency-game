# Fix: Tutorial System Difficulty-Aware Tips

## Issue
Tutorial tips in `tutorial.js` might reference specific values that change with difficulty (e.g., dollar amounts).

## Solution
Keep tutorial tips generic (don't mention specific dollar amounts), or add difficulty-aware tips:

```javascript
const difficulty = window.GameState.difficulty || 'realistic';
const multipliers = window.GameConstants.DIFFICULTY_MODES[difficulty];
const startingMoney = Math.round(8000 * multipliers.startingMoney);
// Use in tip: "Starting with $" + startingMoney + " (varies by difficulty)"
```

