# BUG 3: Conversation Double-Submit Fix

## Problem
User can spam-click conversation buttons, causing consequences to apply multiple times (double money deduction, double morale loss).

## Evidence
```javascript
// Current code (WRONG ORDER):
function submitConversationChoice(choiceIndex) {
    if (isSubmitting) return; // Check here...
    
    // UI updates BEFORE flag set! (race condition)
    conversationContainer.classList.add('response-sent');
    
    isSubmitting = true; // Too late!
}
```

## Fix Instructions

### Step 1: Open conversations.js
Find the `submitConversationChoice()` function

### Step 2: Reorder Code
Put flag setting as FIRST LINE:

```javascript
function submitConversationChoice(choiceIndex) {
    // STEP 1: LOCK IMMEDIATELY (FIRST LINE!)
    if (isSubmitting) {
        console.warn('Already submitting, ignoring click');
        return;
    }
    isSubmitting = true;
    
    // STEP 2: DISABLE ALL BUTTONS
    document.querySelectorAll('.conversation-choice').forEach(btn => {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.pointerEvents = 'none';
    });
    
    // STEP 3: VISUAL FEEDBACK
    const container = document.querySelector('.conversation-container');
    if (container) {
        container.classList.add('response-sent');
    }
    
    // STEP 4: Continue with existing logic...
    // ... rest of your code ...
    
    // STEP 5: Reset flag at end
    setTimeout(() => {
        isSubmitting = false;
    }, 500);
}
```

### Step 3: Add CSS Protection
In `styles.css`:
```css
.conversation-choice:disabled {
    opacity: 0.5 !important;
    cursor: not-allowed !important;
    pointer-events: none !important;
}
```

## Testing
1. Trigger conversation
2. Rapid-click a choice button 10 times in 1 second
3. Check console: Should show "Already submitting, ignoring click"
4. Check GameState: Money/morale should change only ONCE

## Expected Console Output
```
[CONSEQUENCE] Money: 8000 → 7500 (-500)
Already submitting, ignoring click
Already submitting, ignoring click
Already submitting, ignoring click
```

## Files to Modify
- `conversations.js` - Reorder `submitConversationChoice()` function
- `styles.css` - Add disabled button CSS
