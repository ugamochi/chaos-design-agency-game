# Game State Documentation

Complete reference for all game state objects, properties, and their interactions in Agency Chaos Simulator.

---

## Core State Object: `GameState`

**Location:** `state.js`

The main game state container that persists across sessions via localStorage.

```javascript
GameState = {
    currentWeek: number,        // 1-12 (game ends at week 12)
    currentDay: number,          // 1-7 (resets to 1 each week)
    currentHour: number,         // 0-23 (hour of day, starts at 9 AM, resets to 9 on new week)
    money: number,              // Starting: 8000
    teamMorale: number,         // 0-100, calculated average of team members
    projects: Project[],        // Array of active/completed projects
    team: TeamMember[],         // Array of team members (including player)
    conversationQueue: string[], // Array of conversation IDs waiting to display
    conversationHistory: HistoryEntry[], // Completed conversations/events log
    resolvedConversations: string[], // Conversation IDs that have been handled
    deferredConversations: {},  // { conversationId: { week, day } } - conversations deferred to later
    portfolio: {
        completedProjects: number,
        totalEarnings: number
    },
    keyMoments: KeyMoment[],    // Array of significant game events
    gameStats: {                 // Performance tracking for scoring
        projectsCompleted: number,
        projectsFailed: number,
        scopeCreepHandled: number,
        teamMemberQuits: number,
        deadlinesMissed: number,
        perfectDeliveries: number,
        totalSatisfactionPoints: number,
        highestMorale: number,
        lowestMorale: number
    },
    gamePhase: string,          // "tutorial" | "early" | "mid" | "late"
    gameOver: boolean,          // true when game has ended
    victoryPath: string | null  // "rockstar" | "professional" | "survivor" | "struggled" | "failed" | null
}
```

---

## Team Member Structure

**Location:** `characters.json` (templates), `GameState.team` (runtime instances)

### Template Structure (characters.json)
```javascript
{
    id: string,                  // Unique identifier (e.g., "mike_designer")
    name: string,               // Display name
    role: string,               // Job title (e.g., "Designer", "Developer")
    skill: number,               // 1-5 (affects work quality/speed)
    personality: {
        type: string,           // "perfectionist", "pragmatic", "eager"
        traits: string[],       // Array of trait identifiers
        quirks: string[]        // Character-specific behaviors
    },
    morale: {
        current: number,        // 0-100 (runtime, initialized from template)
        min: number,            // Usually 0
        max: number,            // Usually 100
        modifiers: {             // Morale change values for events
            overworked: number,
            praised: number,
            criticized: number
        }
    },
    dialogue: {                 // Context-specific dialogue options
        happy: string[],
        neutral: string[],
        stressed: string[],
        burned_out: string[]
    }
}
```

### Runtime Instance (GameState.team)
Team members in `GameState.team` include all template properties plus:
```javascript
{
    // ... all template properties ...
    currentAssignment: string | null,  // Project ID if assigned, null if available
    daysOnAssignment: number,          // Days spent on current project
    lowMoraleTriggered: boolean,       // Flag to prevent duplicate low morale events
    highMoraleTriggered: boolean       // Flag to prevent duplicate high morale events
}
```

### Special Team Member: Player
- `id: "player"` (hardcoded)
- Can be assigned to multiple projects simultaneously (with reduced efficiency: 0.6x per project)
- Not included in team morale calculations
- No morale tracking (player is always available)

---

## Project Structure

**Location:** `projects.json` (templates), `GameState.projects` (runtime instances)

### Template Structure (projects.json)
```javascript
{
    id: string,                  // Unique identifier (e.g., "techcorp_web")
    name: string,                // Project name
    client: string,              // Client name
    type: string,                // Project type (e.g., "website", "branding")
    budget: number,              // Total project budget
    totalWeeks: number,          // Original timeline in weeks
    complexity: number,          // 1-5 (affects progress speed)
    description: string,         // Project description
    requiredSkills: string[],     // Array of skill types needed
    baseClientSatisfaction: number, // 0-1 (starting satisfaction level)
    clientProfile: ClientProfile  // See Client Profile section below
}
```

### Runtime Instance (GameState.projects)
Projects in `GameState.projects` include all template properties plus:
```javascript
{
    // ... all template properties ...
    progress: number,            // 0-1 (0 = 0%, 1 = 100%)
    status: string,              // "ok" | "warning" | "crisis" | "complete"
    teamAssigned: string[],      // Array of team member IDs
    satisfaction: number,        // 0-100 (client satisfaction percentage)
    originalScope: number,        // Initial complexity value
    currentScope: number,         // Current scope (can increase with scope creep)
    scopeCreepLevel: number,     // currentScope - originalScope
    scopeHistory: any[],          // Array tracking scope changes
    lastResponseHours: number,   // Hours since last client response
    budgetStatus: number,         // 0-1 (1 = on budget, <1 = over budget)
    satisfactionTrend: number[], // Historical satisfaction values
    risk: {                       // Calculated risk indicators
        scope: string,            // "low" | "medium" | "high"
        satisfaction: string,     // "low" | "medium" | "high"
        timeline: string,         // "low" | "medium" | "high"
        scopeLabel: string,       // Human-readable scope status
        timelineLabel: string,    // Human-readable timeline status
        satisfactionLabel: string // Human-readable satisfaction status
    },
    weeksRemaining: number       // Calculated remaining weeks (can go negative if overdue)
}
```

### Project Status Calculation
Status is determined by `getProjectStatus(projectId)`:
- **"complete"**: `progress >= 1.0`
- **"crisis"**: `weeksRemaining < 0` OR `satisfaction < 30`
- **"warning"**: `weeksRemaining < 2` AND `progress < 0.7`
- **"ok"**: All other active projects

---

## Client Profile Structure

**Location:** `projects.json` (per project), `DEFAULT_CLIENT_PROFILE` in `state.js`

```javascript
{
    name: string,                // Client contact name
    title: string,              // Client job title
    company: string,             // Company name
    personality: string,        // Personality type identifier
    traits: {
        decisionSpeed: string,   // "fast" | "medium" | "slow"
        budgetReality: string,  // "reasonable" | "unrealistic" | "flexible"
        scopeDiscipline: string, // "strong" | "medium" | "weak"
        communicationStyle: string, // "direct" | "passive_aggressive" | "friendly"
        respectForProcess: string   // "high" | "medium" | "low"
    },
    satisfactionFactors: {      // Weights for satisfaction calculation (must sum to ~1.0)
        designQuality: number,   // 0-1 weight
        meetingDeadlines: number, // 0-1 weight
        responsiveness: number,  // 0-1 weight
        stayingInBudget: number   // 0-1 weight
    }
}
```

### Satisfaction Calculation
Client satisfaction is calculated via `updateProjectSatisfaction(project)`:

1. **Design Quality**: `(avgSkill / 5) * (avgMorale / 100)` (capped at 1.0)
2. **Meeting Deadlines**: `0.5 + (progress - expectedProgress)` (capped 0-1)
   - `expectedProgress = 1 - (weeksRemaining / totalWeeks)`
3. **Responsiveness**: `4 / lastResponseHours` (capped 0-1, max 1.0 if <= 4 hours)
4. **Staying In Budget**: `budgetStatus` (0-1)

Final satisfaction = weighted sum of all four factors, normalized to 0-100.

---

## Conversation System

**Location:** `conversations.json` (templates), `conversations.js` (runtime logic)

### Conversation Template Structure
```javascript
{
    id: string,                  // Unique identifier
    week: number,                // Trigger week (0 = never auto-trigger)
    day: number,                 // Trigger day (0 = never auto-trigger)
    urgency: string,             // "low" | "medium" | "high" | "critical"
    from: string,                // Sender name
    subject: string,             // Conversation subject line
    body: string,                // HTML message content
    linkedProjectId: string,     // Optional: associated project ID
    responseDeadlineHours: number, // Optional: hours to respond before penalty
    choices: [
        {
            id: string,          // Unique choice identifier
            text: string,        // Choice button text
            flavorText: string,  // Feedback message after selection
            consequences: {      // See Consequences section below
                money: number,
                teamMorale: number | object | array,
                projectProgress: { projectId: string, delta: number },
                clientSatisfaction: { projectId: string, delta: number },
                scopeChange: object | array,
                spawnConversations: string[]
            }
        }
    ]
}
```

### Conversation Runtime State
```javascript
// Global variables in conversations.js
currentConversation: Conversation | null,  // Currently displayed conversation
selectedChoiceId: string | null,            // Selected choice ID (before submit)
currentConversationStartTime: number | null, // Timestamp when conversation opened
currentConversationMeta: {                  // Metadata for response timing
    linkedProjectId: string,
    responseDeadlineHours: number
}
```

### Conversation Queue System
- **Auto-triggered**: Conversations with matching `week` and `day` values
- **Queued**: Conversations added via `queueConversation(conversationId)`
- **Deferred**: Conversations postponed via "Remind me later" button
- **Resolved**: Conversation IDs added to `GameState.resolvedConversations` to prevent re-triggering

---

## Consequences System

**Location:** `conversations.js` → `applyConsequences()`

Consequences are applied when a conversation choice is submitted. All consequence types:

### Money
```javascript
consequences.money: number  // Direct addition/subtraction from GameState.money
```

### Team Morale
```javascript
// Single number: applies to all team members
consequences.teamMorale: number

// Object: target specific member(s)
consequences.teamMorale: {
    delta: number,              // Morale change amount
    memberId: string            // Single member ID
}
// OR
consequences.teamMorale: {
    delta: number,
    memberIds: string[]          // Multiple member IDs
}

// Array: multiple morale changes
consequences.teamMorale: [
    number,                      // Global change
    { delta: number, memberId: string },  // Specific member
    { delta: number, memberIds: string[] } // Multiple members
]
```

### Project Progress
```javascript
consequences.projectProgress: {
    projectId: string,           // Target project ID
    delta: number               // Progress change (0 to 1, typically 0.01-0.2)
}
```

**Important Notes:**
- Negative progress deltas are no longer used (removed for logical consistency)
- Progress changes are **not applied to completed projects** (`status === 'complete'`)
- Progress is clamped to 0-1 range

### Client Satisfaction
```javascript
consequences.clientSatisfaction: {
    projectId: string,          // Target project ID
    delta: number               // Satisfaction change (-100 to 100, typically -20 to +20)
}
```

### Scope Change (Scope Creep)
```javascript
// Single scope change
consequences.scopeChange: {
    projectId: string,
    delta: number,               // Scope/complexity change
    timelineWeeks: number,       // Optional: extend timeline
    budgetDelta: number,         // Optional: budget adjustment
    teamStress: number           // Optional: morale hit to assigned team
}

// Multiple scope changes
consequences.scopeChange: [
    { projectId: string, delta: number, ... },
    { projectId: string, delta: number, ... }
]
```

### Spawn Follow-up Conversations
```javascript
consequences.spawnConversations: string[]  // Array of conversation IDs to queue
```

---

## History Entry Structure

**Location:** `GameState.conversationHistory`

```javascript
{
    title: string,               // Event title
    message: string,             // Event description
    type: string,                // "success" | "warning" | "info" | "error"
    timestamp: string             // Display timestamp (e.g., "Week 3, Day 5")
}
```

---

## Key Moment Structure

**Location:** `GameState.keyMoments`

Significant events tracked throughout the game for end-game timeline display.

```javascript
{
    week: number,               // Week when event occurred
    day: number,                // Day when event occurred
    title: string,              // Event title
    description: string,        // Event description
    type: string                // "success" | "crisis" | "failure" | "milestone" | "victory"
}
```

**Key Moments Auto-Tracked:**
- Game phase milestones (Weeks 3, 5, 10)
- Perfect project deliveries (90%+ satisfaction, on time)
- Project completions with high satisfaction (80%+)
- Project crises and failures
- Team member quits
- Low cash warnings (< $1,000)
- Game completion

**Function:** `recordKeyMoment(title, description, type)`

---

## Global Data Arrays

**Location:** `state.js` (initialized from JSON files)

```javascript
AllConversations: Conversation[]     // All conversation templates
AllTeamMembers: TeamMember[]           // All team member templates
AllProjectTemplates: ProjectTemplate[] // All project templates
```

---

## State Mutations & Interactions

### Daily Advance Flow (`advanceDay()`)
1. Check if game is over or conversation active (early return if true)
2. Increment `currentDay` (resets to 1 at day 8, increments `currentWeek`)
3. Advance clock (`advanceClock()`) - advances time by 2-4 hours randomly
4. If new week: reset `currentHour` to 9 AM, update game phase, trigger scripted events
5. Check for game end (`currentWeek > 12`) → triggers victory
6. Purge expired deferred conversations
7. Update team morale (`updateTeamMorale()`)
8. Update projects (`updateProjects()`)
9. Check for team events (`checkTeamEvents()`)
10. Check failure conditions (`checkFailureConditions()`)
11. Check for conversations (`checkForConversations()`)
12. If day 7: check team pulse, process weekly costs, show week summary, generate weekly client feedback
13. Check project deadlines (`checkProjectDeadlines()`)
14. Update game stats (`updateGameStats()`)
15. Display updated state
16. Save to localStorage

### Team Morale Updates (`updateTeamMorale()`)
- Applied daily to each team member (except player)
- **Overwork penalty**: `-5` morale if `daysOnAssignment > 10`
- **Low morale trigger**: `< 25%` triggers `low_morale` event (once per threshold)
- **High morale trigger**: `> 85%` triggers `high_morale` event (once per threshold)
- Recalculates `GameState.teamMorale` as average of all team members

### Project Progress Updates (`updateProjects()`)
For each active project:
- If no team assigned: no progress, satisfaction updates only
- If team assigned:
  - **Daily progress per member**: `(skill / 5) / complexity * (morale / 100) * 0.10` (doubled from 0.05 for faster pacing)
  - **Status multipliers**:
    - `crisis`: 0x (no progress)
    - `warning`: 0.5x
    - `ok`: 1.0x
  - **Player efficiency**: 0.6x if assigned to multiple projects
  - **Random variation**: ±10%
- Decrement `weeksRemaining` by `1/7` per day
- If `progress >= 1.0`: trigger `completeProject()`
- **Note:** Progress cannot go negative. Completed projects (`status === 'complete'`) are protected from progress changes.

### Project Completion (`completeProject(projectId)`)
1. Set project status to `"complete"`
2. Calculate payment: `budget * (satisfaction / 100)`
3. Add payment to `GameState.money`
4. Update portfolio counters
5. Unassign all team members from project
6. Reset `daysOnAssignment` to 0
7. Boost team member morale by `+5`
8. Add completion event to `conversationHistory`

### Scope Creep Handling (`handleScopeCreepRequest(change)`)
- Updates `currentScope` and `scopeCreepLevel`
- Optionally extends `totalWeeks` and `weeksRemaining`
- Optionally adjusts `budget` and `GameState.money`
- Optionally applies morale penalty to assigned team
- Recalculates project satisfaction and risk

### Clock System (`advanceClock()`)
- **Location:** `ui.js`
- **Initialization:** `currentHour` starts at 9 (9:00 AM) each week
- **Daily Advancement:** When day advances, clock moves forward by 2-4 hours randomly
- **Week Reset:** At start of new week, `currentHour` resets to 9 (9:00 AM)
- **Display:** Shows time in 12-hour format (e.g., "9:00 AM", "2:00 PM", "9:00 PM")
- **Visual Feedback:** Clock icon animates when time advances
- **Purpose:** Provides sense of time progression through the work week

### Response Time Tracking
- When conversation opens: record `currentConversationStartTime`
- When choice submitted: calculate elapsed hours
- Update project `lastResponseHours`
- If `responseDeadlineHours` exists:
  - Late response: `satisfaction -= (elapsedHours - deadline) * 1.5`
  - On-time response: `satisfaction += 3`

### Weekly Client Feedback (`generateWeeklyClientFeedback()`)
- Runs at end of week (day 7)
- Updates satisfaction for all active projects
- Generates feedback message based on satisfaction:
  - `>= 80%`: Positive feedback, `+3` morale to assigned team
  - `55-79%`: Neutral feedback, no change
  - `< 55%`: Negative feedback, `-4` morale to assigned team
- Adds entry to `conversationHistory`

### Weekly Costs Processing (`processWeeklyCosts()`)
- Runs at end of week (day 7)
- Calculates costs: `(active team members × $600) + $300 overhead`
- Deducts from `GameState.money`
- Adds cost entry to `conversationHistory`
- Records "Low on Cash" key moment if money < $1,000
- **Example:** With 2 employees (3 total with player): $1,500/week
- **Total over 12 weeks:** ~$18,000 in costs

### Game Phase Updates (`updateGamePhase()`)
- Called at start of each new week
- Updates `GameState.gamePhase`:
  - Weeks 1-2: `"tutorial"`
  - Weeks 3-5: `"early"`
  - Weeks 6-9: `"mid"`
  - Weeks 10-12: `"late"`

### Scripted Events (`triggerScriptedEvents()`)
- Called at start of each new week
- Records milestone key moments at Weeks 3, 5, and 10
- Triggers difficulty curve conversations (see conversations.json)

### Failure Condition Checks (`checkFailureConditions()`)
- Called every day advance
- **Immediate Game Over Triggers:**
  - Bankruptcy: `money < -$5,000`
  - Full team quit: All non-player team members at morale < 10
  - Complete burnout: 2+ team members at morale < 10
- Returns `true` if game over triggered, `false` otherwise
- Calls `handleGameEnd(reason)` with failure type

### Game Stats Updates (`updateGameStats()`)
- Called every day advance
- Updates `highestMorale` if current > highest
- Updates `lowestMorale` if current < lowest
- Other stats updated by specific events (project completion, scope creep, etc.)

---

## Helper Functions Reference

### State Management (`state.js`)
- `resetToDefaultState()` - Resets GameState to initial values
- `saveState()` - Saves GameState to localStorage
- `getTeamMemberById(memberId)` - Finds team member in team or templates
- `getTeamMemberName(memberId)` - Returns display name for member
- `adjustMemberMorale(member, delta)` - Updates member morale (clamped to min/max)
- `recalculateTeamMorale()` - Updates GameState.teamMorale from team average
- `applyTeamMoraleConsequence(change)` - Applies morale changes from consequences
- `describeTeamMoraleChange(change)` - Formats morale change for display
- `formatConsequences(consequences)` - Formats all consequences for UI display

### Project Management (`projects.js`)
- `buildProjectFromTemplate(template, overrides)` - Creates project instance
- `hydrateProject(project)` - Ensures project has all required runtime properties
- `updateProjectSatisfaction(project)` - Recalculates client satisfaction
- `updateProjectRisk(project)` - Updates risk indicators
- `calculateSatisfactionScores(project)` - Calculates individual satisfaction factors
- `getClientProfile(project)` - Returns project's client profile
- `getProjectStatus(projectId)` - Determines current project status
- `completeProject(projectId)` - Handles project completion
- `handleScopeCreepRequest(change)` - Processes scope changes
- `assignTeamMember(memberId, projectId)` - Assigns/unassigns team member
- `getAvailableTeamMembers()` - Returns unassigned team members
- `getTeamMemberStatus(memberId)` - Returns member's current status/mood

### Conversation Management (`conversations.js`)
- `checkForConversations()` - Checks for auto-triggered conversations
- `getCurrentConversations()` - Returns conversations matching current week/day
- `queueConversation(conversationId)` - Adds conversation to queue
- `deferConversation(conversationId)` - Defers conversation to current day
- `isConversationDeferred(conversationId)` - Checks if conversation is deferred
- `purgeDeferredConversations()` - Removes expired deferred conversations
- `displayConversation(conversation)` - Renders conversation UI
- `handleChoice(conversationId, choiceId)` - Selects a choice
- `submitConversationChoice()` - Applies choice consequences
- `applyConsequences(consequences, conversation)` - Applies all consequence types
- `recordConversationResponse(conversation)` - Records response time
- `triggerClientEvent(projectId, eventType)` - Triggers project-specific conversations
- `triggerTeamEvent(target, eventType)` - Triggers team-specific conversations
- `checkTeamEvents()` - Checks for personality-driven team events
- `checkTeamPulse()` - End-of-week team morale check

### Game Orchestration (`game.js`)
- `initGame()` - Initializes game, loads JSON files, restores state
- `advanceDay()` - Main game loop function
- `seedInitialProjects()` - Creates starting projects
- `updateGamePhase()` - Updates game phase based on current week
- `triggerScriptedEvents()` - Triggers milestone key moments
- `checkFailureConditions()` - Checks for game over conditions
- `updateGameStats()` - Updates morale highs/lows
- `processWeeklyCosts()` - Deducts weekly payroll and overhead
- `calculateVictoryPath()` - Determines which victory path was achieved
- `calculateScore()` - Calculates final score from stats
- `getRankTitle(victoryPath, score)` - Returns rank title based on performance
- `getEndGameMessage(endReason, victoryPath)` - Returns personalized end message
- `handleGameEnd(endReason)` - Called on victory or failure, shows end screen

### UI Management (`ui.js`)
- `displayGameState()` - Updates all UI elements with current game state
- `updateClock()` - Updates clock display with current time (12-hour format)
- `advanceClock()` - Advances `currentHour` by 2-4 hours randomly, resets to 9 AM on new week
- `displayConversation(conversation)` - Renders conversation UI
- `showConsequenceFeedback(consequences)` - Displays consequence feedback (persistent until day advance)
- `showEndGameScreen()` - Displays victory/defeat screen with stats

---

## Data Flow Examples

### Example 1: Assigning Team Member to Project
1. User clicks "Assign to Project" on team member card
2. `showAssignmentModal(memberId)` displays project options
3. User selects project
4. `assignTeamMember(memberId, projectId)` called:
   - Sets `member.currentAssignment = projectId`
   - Resets `member.daysOnAssignment = 0`
   - Updates `project.teamAssigned` array
5. `displayGameState()` refreshes UI
6. `saveState()` persists to localStorage

### Example 2: Scope Creep Conversation
1. Conversation auto-triggers (week/day match)
2. User selects choice with `scopeChange` consequence
3. `applyConsequences()` calls `handleScopeCreepRequest()`
4. Project `currentScope` increases
5. Timeline extended OR team stress applied
6. `updateProjectSatisfaction()` recalculates satisfaction
7. `updateProjectRisk()` updates risk indicators
8. UI updates to show new scope/risk values

### Example 3: Project Progress Over Time
1. Day advances
2. `updateProjects()` called
3. For each project with assigned team:
   - Calculates daily progress from team skill/morale
   - Applies status multiplier (crisis = 0x, warning = 0.5x)
   - Adds random variation
   - Updates `project.progress`
   - Decrements `weeksRemaining`
4. If `progress >= 1.0`: `completeProject()` triggered
5. Payment calculated and added to money
6. Team unassigned and morale boosted

---

## Persistence

**Location:** `localStorage` key: `"agencyChaosState"`

Game state is saved automatically:
- After each day advance
- After conversation choice submission
- After team member assignment

State is loaded on `initGame()` if localStorage entry exists.

**Note:** JSON data files (conversations.json, characters.json, projects.json) are NOT part of saved state - they are templates loaded fresh each session.

---

## State Validation

When loading from localStorage, projects are hydrated via `hydrateProject()` to ensure all runtime properties exist. Team members are initialized from templates if `GameState.team` is empty.

---

## Victory & Failure System

### Victory Paths

Three victory paths available when completing all 12 weeks:

#### 🌟 Rockstar Path
**Requirements:**
- 5+ projects completed
- $25,000+ final money
- 75%+ average satisfaction
- 70%+ team morale

**Rank Titles:**
- 50,000+ score: "🌟 Agency Legend"
- 40,000+ score: "🎯 Master Director"
- Default: "💎 Top Performer"

#### 📈 Professional Path
**Requirements:**
- 3+ projects completed
- $10,000+ final money
- 60%+ average satisfaction
- 50%+ team morale

**Rank Titles:**
- 30,000+ score: "📈 Solid Professional"
- 20,000+ score: "✅ Competent Manager"
- Default: "👔 Getting By"

#### 💪 Survivor Path
**Requirements:**
- 2+ projects completed
- $2,000+ final money

**Rank Titles:**
- 15,000+ score: "💪 Scrappy Survivor"
- 10,000+ score: "🔥 Barely Made It"
- Default: "😅 Still Standing"

#### 📉 Struggled Path
- Completed 12 weeks but didn't meet Survivor requirements
- Rank: "📉 Struggling Startup"

### Failure Conditions

**Immediate Game Over:**
1. **Bankruptcy** - `money < -$5,000`
2. **Team Quit** - All non-player team members quit (morale < 10)
3. **Burnout** - 2+ team members at morale < 10 simultaneously

### Scoring System

**Base Score Components:**
- Projects Completed: 1,000 points each
- Final Money: money ÷ 10
- Average Satisfaction: (avg satisfaction) × 10
- Team Morale: current morale × 5

**Bonuses:**
- Perfect Deliveries: +500 each (90%+ satisfaction, on time)
- Scope Creep Handled: +200 each
- Early Completion: +100 per week before Week 12

**Penalties:**
- Projects Failed: -800 each
- Deadlines Missed: -400 each
- Team Member Quits: -600 each

**Score Range:**
- Typical: 10,000 - 30,000
- Good: 30,000 - 45,000
- Exceptional: 45,000+

---

## End Game Flow

### Game End Triggers

1. **Victory** - Week 12 Day 7 completes
   - Calculates victory path via `calculateVictoryPath()`
   - Records "12 Weeks Complete!" key moment
   
2. **Failure** - Failure condition triggered
   - Sets `victoryPath = "failed"`
   - Records appropriate failure key moment

### End Game Screen Display

Shows modal with:
- Victory/defeat header
- Personalized rank title
- Custom message based on performance
- Final stats grid (weeks, money, projects, satisfaction, morale)
- Performance breakdown (failures, quits, perfect deliveries)
- Final score
- Key moments timeline (last 10 events)
- "Play Again" button (resets game)
- "Copy Score to Clipboard" button

**Implementation:** `ui.js` → `showEndGameScreen()`

---

## Scripted Difficulty Events

Five major scripted events create difficulty curve:

### Week 3: Major Scope Creep Crisis
- **ID:** `week3_scope_creep_crisis`
- Client requests major expansion (mobile, dark mode, accessibility)
- 3 choices: Accept all / Extend timeline / Phase approach
- Tests scope management and negotiation

### Week 5: Team Morale Crisis
- **ID:** `week5_morale_crisis`
- Team burnout warning from senior developer
- 3 choices: Day off / Hire help / Push through
- Tests team management and resource decisions

### Week 7: Budget Pressure
- **ID:** `week7_budget_pressure`
- Weekly costs vs. quick job opportunity
- 3 choices: Take quick job / Stay focused / Ask for advance
- Tests financial management

### Week 10: Final Push Decision
- **ID:** `week10_final_push`
- Quality vs. timeline strategic choice
- 3 choices: Quality sprint / Steady pace / Trust team
- Tests leadership and prioritization

### Week 11: Crunch Time
- **ID:** `week11_crunch_decision`
- Last-minute client presentation demand
- 3 choices: Weekend crunch / Realistic demo / Push back
- Tests boundaries and sustainability

---

## Team Member Quit Mechanics

**Quit Triggers:**
- Team member morale drops below 5
- Checked during weekly team pulse (`checkTeamPulse()`)

**When Member Quits:**
1. Sets `member.hasQuit = true`
2. Increments `GameState.gameStats.teamMemberQuits`
3. Records key moment: "Team Member Quit"
4. Adds event to conversation history
5. Member no longer contributes to projects
6. Reduces weekly costs (one fewer person on payroll)

**Impact:**
- Reduces project progress (fewer hands)
- Can trigger burnout failure if multiple quit
- Significant score penalty (-600 per quit)

---

## Economics & Balance

### Starting Resources
- **Money:** $8,000
- **Team Size:** 3 (player + 2 employees)
- **Team Morale:** 75%

### Weekly Costs
- **Payroll:** $600 per team member (not player)
- **Overhead:** $300
- **Default Total:** $1,500/week with 2 employees

### 12-Week Economics
- **Total Costs:** ~$18,000
- **Break Even:** Need ~$10,000 net income
- **Survivor Target:** ~$20,000 total income
- **Professional Target:** ~$28,000 total income
- **Rockstar Target:** ~$43,000 total income

### Project Economics
- **Budget Range:** $5,000 - $15,000
- **Satisfaction Multiplier:** 20% - 100%
- **Average Payment:** $6,000 - $10,000 per project
- **Projects Needed:**
  - Survivor: 2-3 projects
  - Professional: 3-4 projects
  - Rockstar: 5-6 projects

### Balance Targets
- Average player: Reaches Week 8-10
- Competent player: Achieves Professional path
- Expert player: Achieves Rockstar path
- Survivor path: Achievable with basic competence

---

## Future Enhancements (Post-MVP)

Potential additions for future versions:
- Difficulty modes (Chill / Realistic / Nightmare)
- Tutorial overlay system
- Achievement/unlock system
- New hire system (expand team mid-game)
- Client relationship progression
- Team member skill leveling
- Multiple save slots
- Leaderboard / score comparison

---

*Last Updated: After UI polish updates (Clock system, progress fixes, control panel reorganization)*

