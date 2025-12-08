# Fix: Countdown Timer Should Use Real Time, Not Game Time

## Issue
Timer in `timer.js:38-46` pauses when conversation is active. Countdown timer should continue counting even when game timer is paused. Need to track "real time" vs "game time".

## Solution
Use real-world time (Date.now()) for countdown, not game time:

```javascript
function calculateTimeRemaining(conversation) {
    const startTime = window.currentConversationStartTime || Date.now();
    const deadlineHours = conversation.responseDeadlineHours;
    const elapsedRealMs = Date.now() - startTime;
    const elapsedHours = elapsedRealMs / (1000 * 60 * 60); // Convert to hours
    const remaining = deadlineHours - elapsedHours;
    return Math.max(0, remaining); // Don't return negative
}
```

This way countdown works even when game timer is paused.

