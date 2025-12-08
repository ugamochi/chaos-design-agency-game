# CURSOR PROMPT: Fix Efficiency Calculation

## Problem
The efficiency calculation is using `hoursPerAssignment / maxDailyHours` which creates wrong scaling.

Worker with 40 hours on 1 project contributes 5x efficiency instead of 1x.

## Fix

### In projects.js - updatePhaseProgress function (around line 760-800)

**FIND THIS SECTION:**
```javascript
assignedMembers.forEach(member => {
    if (member.hours === undefined || member.hours === null) {
        member.hours = 40;
    }
    
    const efficiency = getEfficiencyForPhase(member, phaseName);
    let skillMultiplier = (member.skill || 1) / 5;
    
    const characteristics = member.characteristics || {};
    if (member.specialProperties && member.specialProperties.efficiencyMultiplier) {
        skillMultiplier *= member.specialProperties.efficiencyMultiplier;
    }
    if (characteristics.workSpeedMultiplier) {
        skillMultiplier *= characteristics.workSpeedMultiplier;
    }
    
    const moraleMultiplier = (member.morale?.current || 50) / 100;
    
    const totalAssignments = (member.assignedProjects || []).length;
    
    if (totalAssignments === 0) {
        return; // No assignments, skip
    }
    
    // Calculate hours per assignment (split evenly across all assignments)
    const currentHours = member.hours || 0;
    let hoursPerAssignment = 0;
    
    if (member.id === 'player') {
        // Player can work even with 0 or negative hours (overtime)
        if (currentHours > 0) {
            hoursPerAssignment = currentHours / totalAssignments;
        } else {
            // Overtime: player can still work at full efficiency, but gets burnout penalty
            hoursPerAssignment = maxDailyHours / totalAssignments;
        }
    } else {
        // Non-player members: can't work overtime efficiently
        if (currentHours > 0) {
            hoursPerAssignment = Math.max(0, currentHours) / totalAssignments;
        } else {
            // Overtime: split base hours across assignments at 50% efficiency
            hoursPerAssignment = (maxDailyHours / totalAssignments) * 0.5;
        }
    }
    
    // Calculate efficiency contribution for THIS phase
    // Efficiency is based on the fraction of daily hours spent on this specific phase
    const efficiencyContribution = efficiency * skillMultiplier * moraleMultiplier * (hoursPerAssignment / maxDailyHours);
    totalEfficiency += efficiencyContribution;
    
    // Hours are deducted in timer.js ONLY - we just READ them here
    // Timer handles hour deduction, overtime penalties, and hoursWorkedThisWeek tracking
    const availableHours = member.hours;
});
```

**REPLACE WITH:**
```javascript
assignedMembers.forEach(member => {
    if (member.hours === undefined || member.hours === null) {
        member.hours = 40;
    }
    
    const efficiency = getEfficiencyForPhase(member, phaseName);
    let skillMultiplier = (member.skill || 1) / 5;
    
    const characteristics = member.characteristics || {};
    if (member.specialProperties && member.specialProperties.efficiencyMultiplier) {
        skillMultiplier *= member.specialProperties.efficiencyMultiplier;
    }
    if (characteristics.workSpeedMultiplier) {
        skillMultiplier *= characteristics.workSpeedMultiplier;
    }
    
    const moraleMultiplier = (member.morale?.current || 50) / 100;
    
    const totalAssignments = (member.assignedProjects || []).length;
    
    if (totalAssignments === 0) {
        return; // No assignments, skip
    }
    
    // Calculate time fraction spent on THIS project
    // Mike on 1 project: 100% time (1.0)
    // Mike on 3 projects: 33% time per project (0.33)
    const timeFraction = 1 / totalAssignments;
    
    // Handle overtime penalty for non-players
    let overtimePenalty = 1.0;
    if (member.id !== 'player' && member.hours < 0) {
        overtimePenalty = 0.5; // 50% efficiency in overtime
    }
    
    // Calculate efficiency contribution for THIS project
    // Based on time fraction, skill, morale, and overtime status
    const efficiencyContribution = efficiency * skillMultiplier * moraleMultiplier * timeFraction * overtimePenalty;
    totalEfficiency += efficiencyContribution;
    
    // Hours are deducted in timer.js ONLY - we just READ them here
    // Timer handles hour deduction, overtime penalties, and hoursWorkedThisWeek tracking
});
```

---

## What This Fixes

### Before (WRONG):
```
Mike (40h, 1 project):
- hoursPerAssignment = 40
- contribution = efficiency * skill * morale * (40/8) = eff * 5.0
- Progress way too fast

Mike (40h, 3 projects):  
- hoursPerAssignment = 13.33
- contribution = efficiency * skill * morale * (13.33/8) = eff * 1.67
- Still too fast, weird scaling
```

### After (CORRECT):
```
Mike (40h, 1 project):
- timeFraction = 1.0 (100% time on this project)
- contribution = efficiency * skill * morale * 1.0
- Correct: full contribution

Mike (40h, 3 projects):
- timeFraction = 0.33 (33% time per project)
- contribution = efficiency * skill * morale * 0.33
- Correct: 1/3 contribution per project
```

---

## Testing

### Test 1: Single Project
```
1. Assign Mike (skill 4/5 in mgmt, morale 75%) to Project A
2. Wait 1 second (1 game hour)
3. Expected contribution:
   - timeFraction = 1.0
   - efficiency = 1.0 (assume perfect for mgmt)
   - contribution = 1.0 * 0.8 * 0.75 * 1.0 = 0.6
   - With baseProgress 2.0 and tickMultiplier 0.0125:
   - Progress per tick = 2.0 * 0.6 * 0.0125 = 0.015 (1.5% per tick)
   - 10 ticks (1 second) = 15% progress
```

### Test 2: Three Projects
```
1. Assign Mike to Projects A, B, C
2. Wait 1 second
3. Expected contribution PER PROJECT:
   - timeFraction = 0.33
   - contribution = 1.0 * 0.8 * 0.75 * 0.33 = 0.2
   - Progress per project per tick = 2.0 * 0.2 * 0.0125 = 0.005
   - 10 ticks = 5% progress per project
   - Total work output = 15% across 3 projects (same as single project!)
```

### Test 3: Team Work
```
1. Assign Mike + Sarah to Project A
2. Mike contribution = 0.6, Sarah contribution = 0.5
3. Total efficiency = 1.1
4. Progress per tick = 2.0 * 1.1 * 0.0125 = 0.0275
5. 10 ticks = 27.5% progress (combined effort!)
```

---

## Files to Modify
- projects.js (updatePhaseProgress function only)
