# BUG 5: Burnout Calculation Consistency Fix

## Problem
Burnout calculated differently in 3 places: timer.js (5% formula), conversations.js (flat values), projects.js (tick-based). Makes balancing impossible.

## Evidence
```javascript
// METHOD 1: timer.js
burnoutIncrease = overtimeHours * 0.05; // 5% per hour

// METHOD 2: conversations.js  
member.burnout += consequences.burnout; // Flat add

// METHOD 3: projects.js
member.burnout += 0.1 * tickMultiplier; // Different rate!
```

## Fix Instructions

### Part 1: Create Centralized System (state.js)

Add these functions to state.js:

```javascript
/**
 * Centralized burnout adjustment - USE EVERYWHERE
 */
function adjustBurnout(memberId, amount, reason = "Unknown") {
    const member = GameState.team.find(m => m.id === memberId);
    if (!member) {
        console.error(`[BURNOUT ERROR] Member ${memberId} not found`);
        return;
    }
    
    const oldBurnout = member.burnout;
    member.burnout = Math.max(0, Math.min(100, member.burnout + amount));
    const actualChange = member.burnout - oldBurnout;
    
    console.log(
        `[BURNOUT] ${member.name}: ${oldBurnout.toFixed(1)}% → ` +
        `${member.burnout.toFixed(1)}% (${actualChange >= 0 ? '+' : ''}` +
        `${actualChange.toFixed(2)}%) - ${reason}`
    );
    
    checkBurnoutThresholds(member, oldBurnout);
    return actualChange;
}

/**
 * Calculate overtime burnout (5% per hour)
 */
function calculateOvertimeBurnout(memberId) {
    const member = GameState.team.find(m => m.id === memberId);
    if (!member || member.hours >= 0) return;
    
    const overtimeHours = Math.abs(member.hours);
    const burnoutIncrease = overtimeHours * 0.05;
    
    adjustBurnout(
        memberId, 
        burnoutIncrease, 
        `Overtime: ${overtimeHours.toFixed(1)} hours`
    );
}

/**
 * Check burnout thresholds and trigger events
 */
function checkBurnoutThresholds(member, oldBurnout) {
    const newBurnout = member.burnout;
    
    if (oldBurnout < 60 && newBurnout >= 60) {
        console.warn(`[BURNOUT WARNING] ${member.name} reached 60%!`);
        // queueConversation('burnout_warning');
    }
    
    if (oldBurnout < 80 && newBurnout >= 80) {
        console.error(`[BURNOUT CRITICAL] ${member.name} reached 80%!`);
        // queueConversation('burnout_critical');
    }
}
```

### Part 2: Update timer.js

Find overtime burnout code and replace:
```javascript
// OLD:
if (member.hours < 0) {
    const overtimeHours = Math.abs(member.hours);
    member.burnout = Math.min(100, member.burnout + overtimeHours * 0.05);
}

// NEW:
if (member.hours < 0) {
    calculateOvertimeBurnout(member.id);
}
```

### Part 3: Update conversations.js

Find consequence application and replace:
```javascript
// OLD:
if (consequences.burnout) {
    member.burnout += consequences.burnout;
}

// NEW:
if (consequences.burnout) {
    adjustBurnout(
        member.id,
        consequences.burnout,
        `Conversation: ${currentConversation.subject}`
    );
}
```

### Part 4: Update projects.js

Search for any direct burnout modifications:
```javascript
// FIND AND DELETE/REPLACE:
member.burnout += 0.1 * tickMultiplier;

// IF INTENTIONAL, REPLACE WITH:
adjustBurnout(member.id, 0.1 * tickMultiplier, "Project stress");

// IF ACCIDENTAL, JUST DELETE IT
```

### Part 5: Add Rule Comment

Add to top of each file:
```javascript
// BURNOUT RULE: Never write to member.burnout directly!
// ALWAYS use adjustBurnout() from state.js
```

## Standard Burnout Rates

Document these rates:
```javascript
// STANDARD BURNOUT RATES:
// Overtime:        +5% per hour (timer.js)
// Rush deadline:   +10% (conversation)
// Scope creep:     +15% (conversation)
// Work weekend:    +8% (conversation)
// Day off:         -10% (conversation)
// Vacation:        -30% (conversation)
// Project done:    -8% (project completion)
```

## Testing

### Test 1: Overtime Burnout
1. Work Mike into overtime (-1 hour)
2. Check console: `[BURNOUT] Mike: X% → Y% (+5.00%) - Overtime: 1.0 hours`
3. Verify: Math matches (1 hour × 5% = 5% increase)

### Test 2: Conversation Burnout
1. Make choice with burnout: 15
2. Check console: `[BURNOUT] Sarah: X% → Y% (+15.00%) - Conversation: [subject]`

### Test 3: Bounds Check
1. Set burnout to 98%: `GameState.team[0].burnout = 98`
2. Add +10% burnout
3. Verify: Caps at 100%, console shows `98.0% → 100.0% (+2.00%)`

### Test 4: No Direct Modifications
Search codebase for: `member.burnout +=` or `member.burnout = member.burnout`
**PASS**: Should find ZERO results (except in adjustBurnout function)

## Expected Console Output
```
[BURNOUT] Mike: 45.0% → 50.0% (+5.00%) - Overtime: 1.0 hours
[BURNOUT] Sarah: 30.0% → 40.0% (+10.00%) - Conversation: Client wants redesign
[BURNOUT] Mike: 50.0% → 60.0% (+10.00%) - Overtime: 2.0 hours
[BURNOUT WARNING] Mike reached 60%!
```

## Files to Modify
- `state.js` - Add adjustBurnout(), calculateOvertimeBurnout(), checkBurnoutThresholds()
- `timer.js` - Replace direct modification
- `conversations.js` - Replace direct modification
- `projects.js` - Remove/replace direct modification

## Debugging Tool

Add to console for testing:
```javascript
// View all burnout levels
window.debugBurnout = function() {
    GameState.team.forEach(member => {
        console.log(`${member.name}: ${member.burnout.toFixed(1)}%`);
    });
};

// Test burnout manually
window.testBurnout = function(memberId, amount, reason) {
    adjustBurnout(memberId, amount, reason || "Test");
};
```
