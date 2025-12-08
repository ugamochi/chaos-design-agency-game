# CURSOR PROMPT: Fix Double Hour Deduction

## Problem
Workers lose hours twice: once in timer.js, once in projects.js

## Fix

### In projects.js
**FIND AND DELETE** all lines that modify `member.hours`:
```javascript
// DELETE THESE PATTERNS:
member.hours = currentHours - hoursToSpend;
member.hours -= hoursToSpend;
member.hours = member.hours - X;
```

**REPLACE WITH** (just read, don't write):
```javascript
// Only READ hours, never write
const availableHours = member.hours;
```

### In timer.js
**ADD** comment at top of `deductHoursFromTeam()`:
```javascript
// ONLY place hours are deducted - projects.js must NOT modify member.hours
```

## Test
- Assign worker to project
- Hours should decrease at 1/second (not 2/second)

## Files
- projects.js (remove writes to member.hours)
- timer.js (add comment)
