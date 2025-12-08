# Implemented: Hours Exhaustion & Overtime System

## Philosophy
The game is anti-crunch and promotes realistic agency work. This system reflects that:
- **Players (owners)** can push themselves into overtime, but it hurts
- **Workers (employees)** cannot be forced into overtime - they have boundaries

## System Design

### Player (You)
**Can go into overtime (negative hours)**

**Mechanics:**
1. When hours reach 0, player continues working (hours go negative)
2. First time entering overtime each week: **-2 morale penalty**
3. While in overtime: **Burnout increases at 5% per hour** (existing system)
4. Visual warnings show negative hours in red

**Philosophy:** 
- You're the owner - you can crunch to save a deadline
- But it costs you personally (burnout, morale)
- Realistic: owners often sacrifice themselves

### Workers (Employees)
**Cannot go into overtime**

**Mechanics:**
1. When hours reach 0, worker **stops contributing to all projects**
2. First time hitting 0 before week ends: **-5 morale penalty** (one-time per week)
3. Worker still assigned to phases, but contributes 0 efficiency
4. Hours reset to 40 next Monday (week rollover)

**Philosophy:**
- Employees have boundaries - you can't force unpaid overtime
- Running workers dry = unhappy team + stalled projects
- Realistic: bad management has consequences

## Implementation Details

### Hour Deduction (`timer.js` lines 247-280)

**Before:**
```javascript
// Both player and workers could go negative
const newHours = currentHours - hoursToDeduct;
member.hours = newHours;
```

**After:**
```javascript
if (isPlayer) {
    // Player can go into overtime
    member.hours = newHours;
    
    // Check if just crossed into overtime (first time this week)
    if (currentHours >= 0 && newHours < 0 && !member.overtimeWarningShown) {
        member.overtimeWarningShown = true;
        member.morale.current = Math.max(0, member.morale.current - 2);
    }
} else {
    // Workers stop at 0 hours
    if (newHours < 0) {
        actualHoursDeducted = currentHours;
        newHours = 0;
        
        // Morale penalty for running out of hours before week ends
        if (!member.outOfHoursWarningShown && window.GameState.currentDay < 7) {
            member.outOfHoursWarningShown = true;
            member.morale.current = Math.max(0, member.morale.current - 5);
        }
    }
    member.hours = newHours;
}
```

### Phase Progress (`projects.js` lines 776-787)

**Added check:**
```javascript
assignedMembers.forEach(member => {
    // Workers at 0 hours don't contribute
    // Player can still work in overtime (negative hours)
    if (member.id !== 'player' && member.hours <= 0) {
        return; // Worker is exhausted, skip their contribution
    }
    
    const efficiency = getEfficiencyForPhase(member, phaseName);
    // ... rest of contribution calculation
});
```

### Weekly Reset (`timer.js` lines 146-152, 339-345)

**Added flag resets:**
```javascript
window.resetWeeklyHours = function() {
    window.GameState.team.forEach(member => {
        member.hours = 40;
        member.hoursWorkedThisWeek = 0;
        // Reset overtime flags for new week
        member.overtimeWarningShown = false;
        member.outOfHoursWarningShown = false;
    });
};
```

## Gameplay Impact

### Strategic Decisions

**Scenario 1: Worker Runs Out of Hours**
```
Tuesday: Worker has 5 hours left
Wednesday: Phase needs 10 hours of work
Result: 
  - Worker contributes 5 hours, then stops
  - Phase progress stalls until Monday
  - Worker loses 5 morale (exhausted)
  - Player must: assign different worker OR wait for week reset
```

**Scenario 2: Player Runs Out of Hours**
```
Thursday: You have 2 hours left
Friday: Critical deadline needs 8 hours
Choice:
  A) Work overtime (lose 2 morale, gain burnout)
  B) Accept project will be late (lose satisfaction)
```

### Hour Management Tips
1. **Spread work across team** - don't overload single workers
2. **Watch hours display** - red = danger zone
3. **Player as safety valve** - you can crunch if desperate
4. **Plan ahead** - start projects early so workers have time
5. **Hire more workers** - if consistently running out of hours

## Balance Considerations

### Penalties Tuned For:
- **Player overtime morale**: -2 (mild, you can recover)
- **Player overtime burnout**: 5% per hour (existing, severe)
- **Worker exhaustion morale**: -5 (significant, encourages better planning)

### Why These Numbers:
- Player can afford occasional crunch (realistic owner behavior)
- Worker penalty is painful enough to make you plan better
- Burnout is the real danger for player (prevents constant crunch)
- Worker morale hit recovers over time (not permanent damage)

## Files Modified
1. `timer.js` - Hour deduction logic, weekly reset
2. `projects.js` - Worker contribution check

## Testing Scenarios
- [x] Player can go negative (overtime)
- [x] Player loses 2 morale first time entering overtime
- [x] Worker stops at 0 hours
- [x] Worker loses 5 morale when exhausted
- [x] Worker contributes 0 efficiency at 0 hours
- [x] Player still contributes in overtime
- [x] Flags reset on Monday (new week)
- [ ] Test with multiple workers exhausting
- [ ] Test player overtime burnout accumulation
- [ ] Test morale recovery after exhaustion

