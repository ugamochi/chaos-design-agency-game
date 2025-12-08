# Fix: Countdown Timer + Deferred Conversations

## Issue
Deferred conversations need to preserve countdown timer state. Timer should continue counting even when deferred.

## Solution
Store start time in deferred conversation entry (see CONFLICT_2.2):

```javascript
function deferConversation(conversationId) {
    window.GameState.deferredConversations[conversationId] = {
        week: window.GameState.currentWeek,
        day: window.GameState.currentDay,
        startTime: window.currentConversationStartTime || Date.now()
    };
}
```

Restore timer when conversation is restored:

```javascript
if (deferredEntry.startTime) {
    window.currentConversationStartTime = deferredEntry.startTime;
    startCountdownTimer(); // Resume countdown display
}
```

Display remaining time when conversation is shown again.

