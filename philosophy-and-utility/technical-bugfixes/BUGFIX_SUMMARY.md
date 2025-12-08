# Bug Fix Summary - Quick Reference

This file provides a quick overview of all 5 critical bugs. For detailed fix instructions, see the individual BUGFIX_*.md files.

---

## 🔴 CRITICAL BUGS - Fix Priority Order

### Bug 1: Double Hour Deduction ⚠️ FIX FIRST
**Problem:** Workers lose hours 2x faster than intended (timer.js AND projects.js both deduct)  
**Impact:** Game becomes unplayable after ~30 seconds  
**Fix Time:** 5 minutes  

**Quick Fix:**
- Remove hour deduction from projects.js
- Keep ONLY in timer.js
- See BUGFIX_1_DOUBLE_HOURS.md for details

---

### Bug 2: Phase Progress Too Slow ⚠️ FIX SECOND
**Problem:** Phases take 40+ seconds instead of 5-15 seconds  
**Impact:** Game feels broken, projects never complete  
**Fix Time:** 2 minutes  

**Quick Fix:**
- Change baseProgressRates values (multiply by 10x)
```javascript
management: 2.0,    // Was 0.20
design: 1.5,        // Was 0.15
development: 1.0,   // Was 0.10
qa: 1.8            // Was 0.18
```
- See BUGFIX_2_PHASE_SPEED.md for details

---

### Bug 3: Conversation Double-Submit ⚠️ FIX THIRD
**Problem:** Spam-clicking causes consequences to apply multiple times  
**Impact:** Money/morale changes unpredictably  
**Fix Time:** 10 minutes  

**Quick Fix:**
- Set isSubmitting = true as FIRST line
- Disable all buttons immediately
- See BUGFIX_3_DOUBLE_SUBMIT.md for details

---

### Bug 4: Assignment System Confusion ⚠️ FIX FOURTH
**Problem:** currentAssignment (single) conflicts with arrays, wrong hour splits  
**Impact:** UI shows wrong info, hours calculated incorrectly  
**Fix Time:** 30 minutes  

**Quick Fix:**
- Replace currentAssignment with assignedProjects array
- Update assignment/removal functions
- See BUGFIX_4_ASSIGNMENTS.md for details

---

### Bug 5: Burnout Calculation Inconsistency ⚠️ FIX FIFTH
**Problem:** Three different burnout formulas across codebase  
**Impact:** Unpredictable burnout, impossible to balance  
**Fix Time:** 20 minutes  

**Quick Fix:**
- Create centralized adjustBurnout() function
- Replace all direct member.burnout += with function call
- See BUGFIX_5_BURNOUT.md for details

---

## 🎯 Recommended Fix Order

**Session 1: Make Game Playable (10 minutes)**
1. Fix Bug #2 (Phase Speed) - 2 minutes
2. Fix Bug #1 (Double Hours) - 5 minutes  
3. Test: Can you complete a project now?

**Session 2: Fix Game Breaking Bugs (40 minutes)**
4. Fix Bug #3 (Double Submit) - 10 minutes
5. Fix Bug #4 (Assignments) - 30 minutes
6. Test: Assign workers, check UI, verify hours

**Session 3: Polish and Balance (20 minutes)**
7. Fix Bug #5 (Burnout) - 20 minutes
8. Test: Play full 12-week game

**Total estimated time:** ~70 minutes for all fixes

---

## 📋 Files in This Bug Fix Package

- **BUGFIX_SUMMARY.md** (this file) - Quick reference
- **BUGFIX_1_DOUBLE_HOURS.md** - Detailed fix for double hour deduction
- **BUGFIX_2_PHASE_SPEED.md** - Detailed fix for phase progress speed
- **BUGFIX_3_DOUBLE_SUBMIT.md** - Detailed fix for conversation spam-clicking
- **BUGFIX_4_ASSIGNMENTS.md** - Detailed fix for assignment tracking
- **BUGFIX_5_BURNOUT.md** - Detailed fix for burnout consistency

Open each file in order and follow the step-by-step instructions to fix the bugs.
