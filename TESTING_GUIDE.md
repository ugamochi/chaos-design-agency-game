# 🧪 Testing Guide - Chaos Design Agency Simulator

## How to Test Your Game

You have three options to test the game:

---

## Option 1: Test on GitHub Pages (Easiest) ⭐

Your game is already live on GitHub Pages!

**URL:** https://ugamochi.github.io/chaos-design-agency-game/

1. Open the URL in your browser
2. The game should load automatically
3. Start playing!

**Pros:**
- No setup needed
- Test the actual deployed version
- Share with others easily

**Cons:**
- Need to push changes to test them
- Slight delay for GitHub Pages to update

---

## Option 2: Test Locally with Python Server

### Step 1: Start the Server

Open Terminal and run:

```bash
cd ~/Dropbox/Cursor/chaos-design-agency/chaos-design-agency-game
python3 server.py
```

You should see:
```
Serving at http://localhost:8000
```

### Step 2: Open in Browser

Open your browser and go to:
```
http://localhost:8000
```

### Step 3: Stop the Server

When done testing, press `Ctrl+C` in the terminal.

**Pros:**
- Test changes immediately
- No need to push to GitHub
- Full control

**Cons:**
- Need to run server each time
- Only accessible on your computer

---

## Option 3: Test Locally by Opening File

### Step 1: Open index.html

1. Open Finder
2. Navigate to: `~/Dropbox/Cursor/chaos-design-agency/`
3. Double-click `index.html`

**Pros:**
- Simplest method
- No server needed

**Cons:**
- May have CORS issues with loading JSON files
- Not recommended for full testing

---

## 🎮 What to Test

### Quick Test (5 minutes)
1. ✅ Game loads without errors
2. ✅ Timer starts automatically
3. ✅ Can read and respond to messages
4. ✅ Can assign team to projects
5. ✅ Can advance through days

### Medium Test (15 minutes)
1. ✅ Play through Week 1
2. ✅ Complete a project
3. ✅ Test weekend modal (reach Friday evening)
4. ✅ Check team morale changes
5. ✅ Test burnout system (work overtime)
6. ✅ Verify hours system works

### Full Test (30-60 minutes)
1. ✅ Play through all 12 weeks
2. ✅ Test all conversation choices
3. ✅ Try different strategies
4. ✅ Test victory conditions
5. ✅ Check end game screen
6. ✅ Verify high scores save

---

## 🐛 Bug Testing Checklist

### Critical Bugs (Should All Be Fixed)

#### Bug #1: Hour Deduction
- [ ] Let a worker run out of hours
- [ ] Verify morale penalty only happens once
- [ ] Check console for "ran out of hours" message (should appear once)

#### Bug #2: Team Morale
- [ ] Watch morale over 10+ ticks
- [ ] Verify smooth, predictable changes
- [ ] No sudden jumps or drops

#### Bug #3: Weekend Modal
- [ ] Play until Friday 6 PM
- [ ] Modal should appear immediately
- [ ] Day should stay at 5 until choice made
- [ ] After choice, should advance to Monday (Week X, Day 1)

#### Bug #4: Phase Assignment
- [ ] Create project with no team assigned
- [ ] Verify warning appears
- [ ] Assign team and verify progress starts

#### Bug #5: Satisfaction
- [ ] Complete multiple projects
- [ ] Open browser console (F12)
- [ ] Check satisfaction values (should be 0-100)
- [ ] No NaN or undefined values

#### Bug #6: Burnout
- [ ] Work player into overtime (negative hours)
- [ ] Check burnout increases
- [ ] Take sick day or choose burnout relief
- [ ] Verify relief is applied

#### Bug #7: Conversations
- [ ] Trigger team events
- [ ] Verify consequences apply correctly
- [ ] No "{{MEMBER}}" or "{{LINKED}}" in text

#### Bug #8: Phase Progress
- [ ] Assign team to phases
- [ ] Watch progress over time
- [ ] Verify smooth, consistent progress

#### Bug #11: Burnout Warnings
- [ ] Work until burnout reaches 60%
- [ ] Should see warning toast
- [ ] Work until burnout reaches 80%
- [ ] Should see critical warning

#### Bug #13: Division by Zero
- [ ] Play normally
- [ ] Check console for NaN values (should be none)
- [ ] No crashes or freezes

#### Bug #15: Character Data
- [ ] Check team selection
- [ ] Verify no duplicate "Pasha"
- [ ] Verify "Olya" appears in team
- [ ] Verify "Mike" appears as manager option

---

## 🔍 How to Check for Errors

### Open Browser Console

**Chrome/Edge:**
- Press `F12` or `Cmd+Option+I` (Mac)
- Click "Console" tab

**Firefox:**
- Press `F12` or `Cmd+Option+K` (Mac)
- Click "Console" tab

**Safari:**
- Enable Developer Menu: Safari > Preferences > Advanced > Show Develop menu
- Press `Cmd+Option+C`

### What to Look For

✅ **Good Signs:**
- No red error messages
- Game loads and runs smoothly
- All features work as expected

❌ **Bad Signs:**
- Red error messages in console
- "Uncaught TypeError" or "Uncaught ReferenceError"
- Game freezes or crashes
- NaN or undefined values displayed

---

## 📊 Performance Testing

### Check Frame Rate
1. Open console
2. Type: `performance.now()`
3. Game should run smoothly at 60 FPS

### Check Memory Usage
1. Open console
2. Click "Performance" or "Memory" tab
3. Monitor memory usage over time
4. Should stay stable (no memory leaks)

---

## 💾 Save/Load Testing

### Test Save System
1. Play for a few weeks
2. Close browser tab
3. Reopen game
4. Verify game state restored correctly

### Test Reset
1. Click Settings (⚙️)
2. Click "Reset Game"
3. Confirm reset
4. Verify game starts fresh

---

## 🎯 Victory Testing

### Test Each Victory Path

**Rockstar Path:**
- Complete 5+ projects
- Maintain $25,000+
- Keep 75%+ satisfaction
- Keep 70%+ morale

**Professional Path:**
- Complete 3+ projects
- Maintain $10,000+
- Keep 60%+ satisfaction
- Keep 50%+ morale

**Survivor Path:**
- Complete 2+ projects
- Maintain $2,000+

### Test Failure Conditions

**Bankruptcy:**
- Let money drop below -$5,000
- Should trigger game over

**Team Quit:**
- Let all team members' morale drop below 10
- Should trigger game over

**Player Burnout:**
- Let player burnout reach 100
- Should trigger game over

---

## 📱 Mobile Testing (Optional)

If you want to test on mobile:

1. Make sure game is running on GitHub Pages
2. Open on your phone: https://ugamochi.github.io/chaos-design-agency-game/
3. Test touch interactions
4. Check if UI is readable
5. Verify game is playable (may need adjustments)

---

## 🚨 If You Find a Bug

### Report It Properly

1. **What happened?** - Describe the bug
2. **What should happen?** - Expected behavior
3. **How to reproduce?** - Steps to trigger bug
4. **Console errors?** - Copy any error messages
5. **Browser?** - Chrome, Firefox, Safari, etc.
6. **Screenshot?** - If visual bug

### Example Bug Report

```
Bug: Team morale jumps from 50 to 100 instantly

Expected: Morale should change gradually

Steps to reproduce:
1. Play until Week 3
2. Complete a project
3. Morale jumps to 100

Console errors: None

Browser: Chrome 120

Screenshot: [attach]
```

---

## ✅ Testing Complete Checklist

Before launching:

- [ ] Game loads without errors
- [ ] All 8 critical bugs verified fixed
- [ ] Played through at least one full game
- [ ] Tested all major features
- [ ] No console errors
- [ ] Save/load works
- [ ] Victory/defeat screens work
- [ ] Performance is smooth
- [ ] Mobile works (if targeting mobile)

---

## 🎉 Ready to Launch?

If all tests pass:
1. ✅ Game is stable
2. ✅ No critical bugs
3. ✅ Features work as expected
4. ✅ Performance is good

**You're ready to launch!** 🚀

Share your game:
- Post on social media
- Share with friends
- Submit to game sites
- Gather feedback

---

## 📞 Need Help?

If you encounter issues:
1. Check console for errors
2. Review BUG_FIX_PLAN.md
3. Check VERIFICATION_REPORT.md
4. Create GitHub issue with details

---

**Happy Testing!** 🧪✨
