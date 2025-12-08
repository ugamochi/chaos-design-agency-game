# CURSOR PROMPT: Fix Burnout Calculation

## Problem
Burnout calculated 3 different ways. Need single consistent method.

## Fix

### 1. In state.js - Add Centralized Functions
**ADD THESE FUNCTIONS:**
```javascript
function adjustBurnout(memberId, amount, reason = "Unknown") {
    const member = GameState.team.find(m => m.id === memberId);
    if (!member) return;
    
    const oldBurnout = member.burnout;
    member.burnout = Math.max(0, Math.min(100, member.burnout + amount));
    
    console.log(
        `[BURNOUT] ${member.name}: ${oldBurnout.toFixed(1)}% → ` +
        `${member.burnout.toFixed(1)}% (${amount >= 0 ? '+' : ''}` +
        `${amount.toFixed(2)}%) - ${reason}`
    );
    
    // Trigger events at 60% and 80%
    if (oldBurnout < 60 && member.burnout >= 60) {
        console.warn(`${member.name} reached 60% burnout!`);
    }
    if (oldBurnout < 80 && member.burnout >= 80) {
        console.error(`${member.name} reached 80% burnout!`);
    }
}

function calculateOvertimeBurnout(memberId) {
    const member = GameState.team.find(m => m.id === memberId);
    if (!member || member.hours >= 0) return;
    
    const overtimeHours = Math.abs(member.hours);
    adjustBurnout(memberId, overtimeHours * 0.05, `Overtime: ${overtimeHours.toFixed(1)}h`);
}
```

### 2. In timer.js
**FIND:**
```javascript
if (member.hours < 0) {
    const overtimeHours = Math.abs(member.hours);
    member.burnout = Math.min(100, member.burnout + overtimeHours * 0.05);
}
```
**REPLACE WITH:**
```javascript
if (member.hours < 0) {
    calculateOvertimeBurnout(member.id);
}
```

### 3. In conversations.js
**FIND:**
```javascript
if (consequences.burnout) {
    member.burnout += consequences.burnout;
}
```
**REPLACE WITH:**
```javascript
if (consequences.burnout) {
    adjustBurnout(member.id, consequences.burnout, `Conversation: ${conversation.subject}`);
}
```

### 4. In projects.js
**FIND AND DELETE** any:
```javascript
member.burnout += X;
member.burnout = member.burnout + X;
```

**IF NEEDED**, replace with:
```javascript
adjustBurnout(member.id, amount, "reason");
```

## Test
- Work overtime → console shows "[BURNOUT] Mike: X% → Y% (+5.00%) - Overtime: 1.0h"
- Make conversation choice → console shows burnout change
- All changes should use consistent formula (5% per overtime hour)

## Files
- state.js (add adjustBurnout and calculateOvertimeBurnout)
- timer.js (use calculateOvertimeBurnout)
- conversations.js (use adjustBurnout)
- projects.js (remove direct burnout modifications)
