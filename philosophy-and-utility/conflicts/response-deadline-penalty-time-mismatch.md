# Fix: Response Deadline Penalty Logic Time Mismatch

## Issue
Penalty in `conversations.js:20-28` uses `elapsedHours` calculated from game time, but visual countdown uses real time - might mismatch.

## Solution
**Recommendation**: Use real time for countdown (visual), keep game time for penalties (more forgiving). Document this difference, or align both to use the same time source:

```javascript
// Option 1: Keep current (game time for penalties, real time for countdown)
// Document: "Countdown is approximate, penalties use game time"

// Option 2: Align both to real time
const startTime = window.currentConversationStartTime || Date.now();
const elapsedRealMs = Date.now() - startTime;
const elapsedHours = elapsedRealMs / (1000 * 60 * 60);
// Use elapsedHours for both countdown and penalty calculation
```

