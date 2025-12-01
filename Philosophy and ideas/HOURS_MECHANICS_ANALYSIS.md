# Hours Mechanics Analysis

## Current Flow

### Day Start (when "Advance Day" is pressed):
1. **resetDailyHours()** - Sets everyone to 8 hours, resets `hoursWorkedToday` to 0
2. **checkForIllness()** - 
   - If recovering: `hours = 8` (restores capacity)
   - If getting sick: `hours = max(0, hours - 8)` (reduces to 0)
3. **updateProjects()** - Spends hours on assigned projects
4. **displayGameState()** - Shows current state

### During Day:
- **Player responds to conversations**: Loses 1.5 hours immediately
- **Overtime**: If hours go negative, burnout increases (+3 per hour)

### Project Work (updateProjects):
- **Workers**: Up to 8 hours per day (or less if `hours < 8`)
- **Player**: Hours split evenly across multiple projects
- **Overtime work**: If `hours <= 0`, can still work at 50% efficiency with penalties

## Issues Found

### ✅ Issue 1: Idle Morale Penalty Not Applied
**Location:** `projects.js:153-155`

**Problem:** 
```javascript
window.adjustMemberMorale(member, moraleChange); // Line 147 - applied here

if (!member.currentAssignment && !member.isIll) {
    moraleChange -= 2; // Line 154 - calculated here, but never applied!
}
```

The idle penalty is calculated AFTER morale is already adjusted, so it never takes effect.

**Fix:** Move the idle check before `adjustMemberMorale()` call, or apply it separately.

### ⚠️ Issue 2: Hours Reset Timing
**Current behavior:** Hours reset at START of new day, then are immediately spent.

**Question:** Is this the intended behavior?
- **Pro:** Makes sense - new day = fresh 8 hours, then you spend them
- **Con:** Player never sees their "remaining hours from yesterday" being spent

**Current flow:**
- Day 1: Player has 6.5 hours left
- Press "Advance Day"
- Reset to 8 (Day 2 starts)
- Hours spent on Day 2's work
- Display shows reduced hours

This seems correct, but might be confusing to players.

### ✅ Issue 3: Overtime Calculation Complexity
**Location:** `projects.js:628-630, 644-665`

**Current logic:**
- If `hours <= 0`, player can still work at 50% efficiency
- Overtime hours tracked via `hoursWorkedToday`
- Penalties applied based on overtime hours

**Potential issue:** The overtime calculation is complex and might double-count penalties. When hours go negative from conversations, then work happens, the penalties might be calculated incorrectly.

### ✅ Issue 4: Hours Worked Today Tracking
**Location:** `projects.js:641-642`

**Current behavior:** `hoursWorkedToday` tracks total hours worked, used for overtime calculation.

**Issue:** This is reset at start of day, but if someone works overtime, their `hours` go negative. The next day, `hoursWorkedToday` resets to 0, but `hours` might still be negative, creating confusion.

## Recommendations

1. **Fix idle morale penalty** - Move idle check before morale adjustment
2. **Clarify hours reset timing** - Consider showing "yesterday's remaining hours" being spent before reset
3. **Simplify overtime tracking** - Consider using just `hours < 0` for overtime instead of tracking `hoursWorkedToday`
4. **Add visual feedback** - Show when hours are being spent vs. reset

