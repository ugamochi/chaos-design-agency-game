PROMPT 5: Client Satisfaction & Scope Creep Mechanics

Objective: Implement the core "agency chaos" - clients being clients

Implement client behavior, satisfaction tracking, and scope creep mechanics.

REQUIREMENTS:

1. Enhance projects.json with client personality types:
   Add clientProfile to each project:
   {
     "clientProfile": {
       "name": "Sarah Chen",
       "title": "CEO",
       "company": "TechCorp",
       "personality": "demanding_but_fair",
       "traits": {
         "decisionSpeed": "slow",
         "budgetReality": "reasonable",
         "scopeDiscipline": "weak",
         "communicationStyle": "passive_aggressive",
         "respectForProcess": "low"
       },
       "satisfactionFactors": {
         "designQuality": 0.3,
         "meetingDeadlines": 0.4,
         "responsiveness": 0.2,
         "stayingInBudget": 0.1
       }
     }
   }
   Create 3 distinct client personalities for the 2 MVP projects + 1 future project.

2. Add to game.js:
   - Client satisfaction calculation:
     * Starts at base level (usually 75%)
     * Modified by:
       - Progress vs timeline
       - Response time to emails
       - Scope creep handling
       - Work quality (team skill + morale)
     * Updates after each conversation and weekly
   - Scope creep system:
     * Each project has "original scope" (complexity = 3)
     * Scope can increase (up to 5)
     * Each scope increase:
       - Extends timeline OR increases team stress
       - May increase budget (if negotiated)
       - Reduces satisfaction if handled poorly
     * Triggers "scope creep" warning conversations
   - Functions:
     * calculateSatisfaction(projectId)
     * handleScopeCreepRequest(projectId, increaseAmount)
     * triggerClientEvent(projectId, eventType)
     * checkClientRelationship(projectId)

3. Create scope creep conversation scenarios:
   Five different scenarios (tiny tweak, stakeholder surprise, competitor comparison, pivot, death by a thousand cuts) each with meaningful choices and consequences.

4. Implement email response time mechanic:
   - Some conversations have "expires in X hours"
   - Ignored too long = satisfaction drop
   - Fast response = bonus
   - Visual timer indicator on urgent conversations
   - Option to "respond later" (queues reminder)

5. Add client feedback system:
   - Weekly client check-in messages
   - Positive feedback boosts team morale
   - Negative feedback creates stress
   - Neutral feedback = missed opportunity

6. Create "project risk" indicator:
   - Dashboard showing scope creep level, satisfaction trend, timeline pressure, budget status
   - Warning messages when risks compound

TESTING:
- Trigger scope creep scenarios
- Verify satisfaction responds correctly
- Ensure timeline/budget adjust when scope changes
- Test urgent email timer

Please provide updated code with client systems implemented.

