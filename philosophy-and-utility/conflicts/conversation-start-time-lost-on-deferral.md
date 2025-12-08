# Fix: Conversation Start Time Lost on Deferral

## Issue
`currentConversationStartTime` in `conversations.js:32-35` is cleared when conversation resolves. If conversation is deferred, start time is lost and countdown timer won't work.

## Solution
Store start time in deferred conversation entry:

```javascript
function deferConversation(conversationId) {
    window.GameState.deferredConversations[conversationId] = {
        week: window.GameState.currentWeek,
        day: window.GameState.currentDay,
        startTime: window.currentConversationStartTime || Date.now() // Store start time
    };
}
```

When restoring deferred conversation, restore start time:

```javascript
if (deferredEntry.startTime) {
    window.currentConversationStartTime = deferredEntry.startTime;
}
```

