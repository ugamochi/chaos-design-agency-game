# CURSOR PROMPT: Fix Double-Submit Bug

## Problem
Spam-clicking conversation buttons applies consequences multiple times.

## Fix

### In conversations.js
**FIND** `submitConversationChoice()` function

**CHANGE ORDER** - Set flag FIRST, then disable buttons:

```javascript
function submitConversationChoice(choiceIndex) {
    // 1. LOCK FIRST (move this to top)
    if (isSubmitting) return;
    isSubmitting = true;
    
    // 2. DISABLE ALL BUTTONS IMMEDIATELY
    document.querySelectorAll('.conversation-choice').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.pointerEvents = 'none';
    });
    
    // 3. THEN do UI updates
    const container = document.querySelector('.conversation-container');
    if (container) {
        container.classList.add('response-sent');
    }
    
    // 4. Rest of existing logic...
    
    // 5. Reset flag at end
    setTimeout(() => { isSubmitting = false; }, 500);
}
```

**KEY**: Move `isSubmitting = true` to be FIRST LINE after check.

## Test
- Rapid-click button 10 times
- Consequences should apply only once
- Console should show "Already submitting" warnings

## Files
- conversations.js (reorder submitConversationChoice)
