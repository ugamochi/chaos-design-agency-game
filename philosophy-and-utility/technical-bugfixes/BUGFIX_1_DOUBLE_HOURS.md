# BUG 1: Double Hour Deduction Fix

## Problem
Hours are being deducted TWICE - once in `timer.js` and again in `projects.js`. Workers run out of hours 2x faster than intended.

## Evidence
```javascript
// timer.js - First deduction
deductHoursFromTeam(HOURS_PER_TICK, false); 

// projects.js - Second deduction (BUG!)
member.hours = currentHours - hoursToSpend; // Deducts again!
```

## Fix Instructions

### Step 1: Open projects.js
Search for lines that modify `member.hours` directly:
- `member.hours = currentHours - hoursToSpend`
- `member.hours -= hoursToSpend`
- `member.hours = member.hours - hoursToSpend`

### Step 2: Remove Hour Deduction
**DELETE or COMMENT OUT** any lines that write to `member.hours`

Add this comment instead:
```javascript
// Hours are deducted in timer.js ONLY - we just READ them here
const availableHours = member.hours;
```

### Step 3: Add Comment to timer.js
At the top of the `deductHoursFromTeam()` function, add:
```javascript
// IMPORTANT: This is the ONLY place hours are deducted
// projects.js should NEVER modify member.hours
```

## Testing
1. Start game
2. Assign 1 worker to project, leave 1 unassigned
3. Watch both workers' hours
4. **Expected**: Both lose 1 hour per second (not 2)

## Files to Modify
- `projects.js` - Remove hour deductions
- `timer.js` - Add explanatory comment
