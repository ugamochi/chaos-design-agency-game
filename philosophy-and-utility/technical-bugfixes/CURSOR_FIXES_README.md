# CURSOR FIXES - Quick Reference

Ultra-concise prompts for each bug. Copy/paste directly into Cursor.

---

## Fix Order (Recommended)
1. **CURSOR_FIX_2.md** - Phase Speed (2 min) ← START HERE
2. **CURSOR_FIX_1.md** - Double Hours (5 min)
3. **Test**: Can you complete a project?
4. **CURSOR_FIX_3.md** - Double Submit (10 min)
5. **CURSOR_FIX_4.md** - Assignments (30 min)
6. **CURSOR_FIX_5.md** - Burnout (20 min)

**Total: ~70 minutes**

---

## Quick Summary

### Fix 1: Double Hours (5 min)
**File:** `CURSOR_FIX_1.md`
- Remove `member.hours -=` from projects.js
- Keep ONLY in timer.js

### Fix 2: Phase Speed (2 min) ← EASIEST
**File:** `CURSOR_FIX_2.md`
- Multiply `baseProgressRates` by 10x
- One line change in projects.js

### Fix 3: Double Submit (10 min)
**File:** `CURSOR_FIX_3.md`
- Move `isSubmitting = true` to first line
- Disable buttons immediately

### Fix 4: Assignments (30 min) ← MOST COMPLEX
**File:** `CURSOR_FIX_4.md`
- Change `currentAssignment` → `assignedProjects[]`
- Add `recalculateHourSplits()` function
- Update assign/remove functions

### Fix 5: Burnout (20 min)
**File:** `CURSOR_FIX_5.md`
- Create `adjustBurnout()` function
- Replace all direct `member.burnout +=`
- Use centralized calculation

---

## After All Fixes

### Test Checklist
- [ ] Hours decrease at 1/second (not 2)
- [ ] Phases complete in 5-15 seconds
- [ ] Rapid-clicking doesn't duplicate effects
- [ ] UI shows all assignments correctly
- [ ] Console logs all burnout changes

### Files Modified
- state.js (assignments + burnout)
- projects.js (hours, speed, assignments, burnout)
- timer.js (hours, burnout)
- conversations.js (submit, burnout)
- ui.js (assignments display)

---

## Tips for Cursor
- Fix one at a time
- Test after each fix
- Check console for errors
- Use `console.log(GameState)` to inspect state
- Backup code before starting

Good luck! 🚀
