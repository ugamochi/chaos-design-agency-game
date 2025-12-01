# Prompt 6 Implementation Summary
## Game Loop, Win/Lose Conditions, & Balance

### ✅ Completed Implementation

---

## 1. Game Loop Structure

**Game Phases Added:**
- **Tutorial** (Week 1-2): Introduction to mechanics
- **Early Game** (Week 3-5): First real challenges
- **Mid Game** (Week 6-9): Full complexity
- **Late Game** (Week 10-12): Final push and mastery

**Implementation Location:** `game.js` - `updateGamePhase()`

---

## 2. Victory Conditions (Three Paths)

### 🌟 Rockstar Path
- **Requirements:**
  - 5+ projects completed
  - $25,000+ final money
  - 75%+ average client satisfaction
  - 70%+ team morale
- **Rank Titles:**
  - 50k+ score: "🌟 Agency Legend"
  - 40k+ score: "🎯 Master Director"
  - Default: "💎 Top Performer"

### 📈 Professional Path
- **Requirements:**
  - 3+ projects completed
  - $10,000+ final money
  - 60%+ average client satisfaction
  - 50%+ team morale
- **Rank Titles:**
  - 30k+ score: "📈 Solid Professional"
  - 20k+ score: "✅ Competent Manager"
  - Default: "👔 Getting By"

### 💪 Survivor Path
- **Requirements:**
  - 2+ projects completed
  - $2,000+ final money
- **Rank Titles:**
  - 15k+ score: "💪 Scrappy Survivor"
  - 10k+ score: "🔥 Barely Made It"
  - Default: "😅 Still Standing"

**Implementation Location:** `game.js` - `calculateVictoryPath()`

---

## 3. Failure Conditions

### Immediate Game Over:
1. **Bankruptcy:** Money drops below -$5,000
2. **Full Team Quit:** All non-player team members quit (morale < 10)
3. **Complete Burnout:** 2+ team members burned out simultaneously

### Soft Failures (tracked but not game-ending):
- Missed deadlines (tracked in stats)
- Project failures (satisfaction < 20% + overdue)
- Individual team member quits

**Implementation Location:** `game.js` - `checkFailureConditions()`

---

## 4. Scoring System

### Base Score Components:
- **Projects Completed:** 1,000 points each
- **Money Earned:** Final money ÷ 10
- **Average Satisfaction:** (avg satisfaction) × 10
- **Team Morale:** Current morale × 5

### Bonuses:
- **Perfect Deliveries:** +500 per project (90%+ satisfaction, on time)
- **Scope Creep Handled:** +200 per instance
- **Early Completion:** +100 per week before Week 12

### Penalties:
- **Projects Failed:** -800 each
- **Deadlines Missed:** -400 each
- **Team Member Quits:** -600 each

**Implementation Location:** `game.js` - `calculateScore()`

---

## 5. End Game Screen

### Features:
- Victory/defeat header with rank title
- Personalized message based on performance
- Final stats grid showing:
  - Weeks survived
  - Final money (color-coded positive/negative)
  - Projects completed
  - Average satisfaction
  - Team morale
  - Perfect deliveries
- Performance breakdown:
  - Projects failed
  - Deadlines missed
  - Scope creep handled
  - Team quits
  - Morale highs/lows
- Final score display
- Key moments timeline (last 10 moments)
- Play Again button
- Copy Score to Clipboard button

**Implementation Location:** `ui.js` - `showEndGameScreen()`
**Styling Location:** `styles.css` - End Game Screen Styles section

---

## 6. Key Moments Tracking

### Automatically Tracked Events:
- Game milestones (Week 3, 5, 10 checkpoints)
- Perfect project deliveries (90%+ satisfaction)
- Project completions
- Project crises and failures
- Team member quits
- Low cash warnings
- Game completion

### Key Moment Types:
- `success` - Green (great outcomes)
- `crisis` - Orange (warnings)
- `failure` - Red (bad outcomes)
- `milestone` - Blue (progress markers)
- `victory` - Gold (game completion)

**Implementation Location:** `state.js` - `recordKeyMoment()`

---

## 7. Difficulty Curve & Scripted Events

### Week 3: Major Scope Creep Crisis
- **Event:** `week3_scope_creep_crisis`
- **Impact:** Client requests major expansion
- **Choices:** Accept all / Extend timeline / Phase approach

### Week 5: Team Morale Crisis
- **Event:** `week5_morale_crisis`
- **Impact:** Team burnout warning
- **Choices:** Day off / Hire help / Push through

### Week 7: Budget Pressure
- **Event:** `week7_budget_pressure`
- **Impact:** Cash flow crunch decision
- **Choices:** Quick job / Stay focused / Payment advance

### Week 10: Final Push Decision
- **Event:** `week10_final_push`
- **Impact:** Quality vs timeline decision
- **Choices:** Quality sprint / Steady pace / Trust team

### Week 11: Crunch Time
- **Event:** `week11_crunch_decision`
- **Impact:** Last-minute client demand
- **Choices:** Weekend crunch / Realistic demo / Push back

**Implementation Location:** `conversations.json` - New events added

---

## 8. Balance Adjustments

### Starting Resources:
- **Money:** $8,000 (increased from $5,000)
- **Team Morale:** 75%
- **Team Size:** 3 members (player + 2 employees)

### Weekly Costs:
- **Team Payroll:** $600 per team member
- **Overhead:** $300 per week
- **Total Weekly:** ~$2,100 with 3 team members

### Economics Over 12 Weeks:
- **Total Costs:** ~$25,200
- **Starting Money:** $8,000
- **Break Even:** Need to earn ~$17,200
- **Survivor Path:** Need ~$19,200 total income (2 projects)
- **Professional Path:** Need ~$27,200 total income (3+ projects)
- **Rockstar Path:** Need ~$42,200 total income (5+ projects)

### Project Payments (typical):
- **Budget Range:** $5,000 - $15,000
- **Satisfaction Multiplier:** 0.2 to 1.0
- **Expected Payment:** $4,000 - $12,000 per project

**Target Balance:**
- Average player reaches Week 8-10
- Expert player can achieve Rockstar path
- Survivor path achievable with basic competence

**Implementation Locations:**
- `state.js` - Starting money updated
- `game.js` - `processWeeklyCosts()` added
- Victory thresholds adjusted in `calculateVictoryPath()`

---

## Game Stats Tracked

New `GameState.gameStats` object tracks:
- `projectsCompleted`
- `projectsFailed`
- `scopeCreepHandled`
- `teamMemberQuits`
- `deadlinesMissed`
- `perfectDeliveries`
- `totalSatisfactionPoints`
- `highestMorale`
- `lowestMorale`

**Implementation Location:** `state.js`

---

## Testing Checklist

### Victory Paths:
- [ ] Play through to Week 12 achieving Rockstar path
- [ ] Play through achieving Professional path
- [ ] Play through achieving Survivor path
- [ ] Verify each displays correct rank and message

### Failure Conditions:
- [ ] Trigger bankruptcy (money < -$5,000)
- [ ] Cause full team quit (all members morale < 10)
- [ ] Trigger burnout failure (2+ members < 10 morale)

### Scoring:
- [ ] Verify score calculation matches expectations
- [ ] Check bonus/penalty applications
- [ ] Confirm rank titles display correctly

### UI:
- [ ] End game screen displays all stats correctly
- [ ] Key moments timeline shows properly
- [ ] Play Again button resets game
- [ ] Copy score button works

### Balance:
- [ ] Average playthrough reaches Week 8+
- [ ] Expert play can achieve Rockstar
- [ ] Weekly costs feel meaningful but not punishing

---

## Files Modified

1. **state.js**
   - Added game stats tracking
   - Added key moments array
   - Added game phase tracking
   - Increased starting money to $8,000
   - Added `recordKeyMoment()` function

2. **game.js**
   - Added `updateGamePhase()`
   - Added `triggerScriptedEvents()`
   - Added `checkFailureConditions()`
   - Added `updateGameStats()`
   - Added `calculateVictoryPath()`
   - Added `calculateScore()`
   - Added `getRankTitle()`
   - Added `getEndGameMessage()`
   - Added `processWeeklyCosts()`
   - Replaced basic `handleGameEnd()` with full system

3. **ui.js**
   - Added `showEndGameScreen()` with full UI

4. **styles.css**
   - Added complete end game screen styling
   - Added responsive design for end game

5. **projects.js**
   - Updated `completeProject()` to track stats
   - Updated `checkProjectDeadlines()` to track failures
   - Updated `handleScopeCreepRequest()` to track scope creep

6. **conversations.js**
   - Updated `checkTeamPulse()` to handle team quits

7. **conversations.json**
   - Added 5 new scripted difficulty events

8. **index.html**
   - Updated starting money display

---

## Next Steps (Optional Enhancements)

- Add difficulty mode selector (Chill / Realistic / Nightmare)
- Add more victory path variations
- Add achievement system
- Add stats comparison vs previous runs
- Add social sharing with formatted results

---

*Implementation completed for Prompt 6: Game Loop, Win/Lose Conditions, & Balance*

