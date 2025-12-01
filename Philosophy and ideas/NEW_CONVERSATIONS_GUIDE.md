# New Conversations Guide

## Overview
Added 14 new conversations: 9 non-project conversations and 5 new project request emails.

## Non-Project Conversations (General Life/Work Balance)

These conversations are **not tied to any specific project** and affect global stats like burnout, working hours, money, and team morale. They are set to `week: 0, day: 0` so they **won't auto-trigger** - they need to be queued conditionally in the game logic.

### 1. Design Conference Invite (`design_conference_invite`)
- **When to trigger**: Randomly, weeks 3-10, low probability
- **Effects**: 
  - Attend: -$800 money, +8 team morale (networking, fresh ideas)
  - Decline: -3 team morale (missed opportunity)

### 2. Electricity Bill (`electricity_bill`)
- **When to trigger**: Randomly, any week, medium probability
- **Effects**:
  - Pay: -$450 money, +2 team morale (security)
  - Delay: -5 team morale (worry about outages)

### 3. Exercise Reminder (`exercise_reminder`)
- **When to trigger**: When player burnout > 40%, randomly
- **Effects**:
  - Exercise: +5 team morale (energy boost, reduces burnout indirectly)
  - Skip: -2 team morale (fatigue builds)

### 4. Bedtime Reminder (`bedtime_reminder`)
- **When to trigger**: When currentHour >= 22 (10 PM) and player is still working
- **Effects**:
  - Go home: +6 team morale (good example, prevents burnout)
  - Stay late: -4 team morale (burnout risk)

### 5. Office Supplies Order (`office_supplies_order`)
- **When to trigger**: Randomly, any week, low-medium probability
- **Effects**:
  - Order: -$180 money, +3 team morale (comfort)
  - Skip: -2 team morale (inconvenience)

### 6. Networking Event (`networking_event`)
- **When to trigger**: Randomly, weeks 4-11, low probability
- **Effects**:
  - Attend: +4 team morale (connections, opportunities)
  - Skip: -1 team morale (missed connections)

### 7. Software Subscription (`software_subscription`)
- **When to trigger**: Randomly, weeks 2-8, very low probability (annual event)
- **Effects**:
  - Renew: -$1,200 money, +5 team morale (tools available)
  - Let expire: -8 team morale (productivity suffers)

### 8. Lunch Break Reminder (`lunch_break_reminder`)
- **When to trigger**: When currentHour === 13 (1 PM) and player hours > 4
- **Effects**:
  - Take lunch: +4 team morale (energy, prevents burnout)
  - Skip lunch: -3 team morale (afternoon drag)

## New Project Request Emails

These conversations are **conditional** - they should only trigger when **average client satisfaction across all active projects is above 50%**. They are set to `week: 0, day: 0` so they **won't auto-trigger** - they need to be queued programmatically when satisfaction conditions are met.

### 1. Enterprise App Request (`new_project_request_enterprise`)
- **Template**: `enterprise_app`
- **Budget**: $30k (deposit: $6k)
- **Timeline**: 11 weeks
- **When to trigger**: When avg satisfaction > 50%, weeks 3-9, low probability
- **Effects**:
  - Accept: +$6k money, +6 team morale, adds enterprise_app project
  - Decline: -2 team morale

### 2. Small Business Site Request (`new_project_request_small_business`)
- **Template**: `small_business_site`
- **Budget**: $6.5k (deposit: $1.3k)
- **Timeline**: 5 weeks
- **When to trigger**: When avg satisfaction > 50%, weeks 2-10, medium probability
- **Effects**:
  - Accept: +$1.3k money, +4 team morale, adds small_business_site project
  - Decline: +1 team morale (small impact)

### 3. Startup Branding Request (`new_project_request_startup`)
- **Template**: `startupx_branding`
- **Budget**: $18k (deposit: $3.6k)
- **Timeline**: 8 weeks
- **When to trigger**: When avg satisfaction > 50%, weeks 3-8, medium probability
- **Effects**:
  - Accept: +$3.6k money, +5 team morale, adds startupx_branding project
  - Decline: -1 team morale

### 4. Rebrand Request (`new_project_request_rebrand`)
- **Template**: `greenleaf_rebrand`
- **Budget**: $25k (deposit: $5k)
- **Timeline**: 10 weeks
- **When to trigger**: When avg satisfaction > 50%, weeks 4-9, low-medium probability
- **Effects**:
  - Accept: +$5k money, +5 team morale, adds greenleaf_rebrand project
  - Decline: -2 team morale

## Implementation Notes

### Triggering Logic Needed

You'll need to add logic in `game.js` or `conversations.js` to:

1. **Check average satisfaction** before queuing new project requests:
```javascript
function getAverageClientSatisfaction() {
  const activeProjects = window.GameState.projects.filter(p => p.status !== 'complete');
  if (activeProjects.length === 0) return 0;
  const total = activeProjects.reduce((sum, p) => sum + (p.satisfaction || 0), 0);
  return total / activeProjects.length;
}
```

2. **Queue new project requests conditionally**:
```javascript
if (getAverageClientSatisfaction() > 50 && Math.random() < 0.15) {
  // Queue one of the new project requests randomly
  const projectRequests = [
    'new_project_request_enterprise',
    'new_project_request_small_business',
    'new_project_request_startup',
    'new_project_request_rebrand'
  ];
  const randomRequest = projectRequests[Math.floor(Math.random() * projectRequests.length)];
  window.queueConversation(randomRequest);
}
```

3. **Queue non-project conversations** based on conditions:
   - Time-based (bedtime, lunch)
   - Burnout-based (exercise)
   - Random (bills, supplies, networking, conference)

### Burnout & Hours Note

Currently, the consequence system doesn't directly support modifying:
- Player `burnout` value
- Player `hours` value

I've used `teamMorale` as a proxy for these effects. You may want to extend the `applyConsequences()` function in `conversations.js` to support:
```javascript
if (consequences.playerBurnout !== undefined) {
  const player = window.GameState.team.find(m => m.id === 'player');
  if (player) {
    player.burnout = Math.max(0, Math.min(100, player.burnout + consequences.playerBurnout));
  }
}

if (consequences.playerHours !== undefined) {
  const player = window.GameState.team.find(m => m.id === 'player');
  if (player) {
    player.hours = Math.max(0, Math.min(8, player.hours + consequences.playerHours));
  }
}
```

Then you could use:
- `"playerBurnout": -5` (reduce burnout)
- `"playerHours": -2` (lose working hours)

