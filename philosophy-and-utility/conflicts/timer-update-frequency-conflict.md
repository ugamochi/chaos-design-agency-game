# Fix: Timer Update Frequency Conflict

## Issue
Real-time timer in `timer.js:28-35` ticks every 100ms, but countdown timer needs to update every 1-2 seconds for smooth UI. Two different update cycles could conflict.

## Solution
Create separate UI update interval for countdown timer:

```javascript
let countdownTimer = null;
function updateCountdownTimer() {
    if (window.currentConversation && window.currentConversationStartTime) {
        // Calculate and update countdown display
        const remaining = calculateTimeRemaining(window.currentConversation);
        updateCountdownDisplay(remaining);
    }
}

// Start when conversation displays
function startCountdownTimer() {
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = setInterval(updateCountdownTimer, 1000); // 1-second updates
}

// Stop when conversation resolves
function stopCountdownTimer() {
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }
}
```

