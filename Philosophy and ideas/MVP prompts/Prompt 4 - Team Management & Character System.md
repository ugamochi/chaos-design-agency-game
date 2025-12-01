PROMPT 4: Team Management & Character System

Objective: Make team members feel like real people with personalities

Implement the team member system with personalities and morale dynamics.

REQUIREMENTS:

1. Create characters.json with team member definitions:
   Structure:
   {
     "id": "mike_designer",
     "name": "Mike",
     "role": "Designer",
     "skill": 3,
     "personality": {
       "type": "perfectionist",
       "traits": ["slow", "high_quality", "sensitive_to_criticism"],
       "quirks": ["always_late_to_meetings", "coffee_addict"]
     },
     "morale": {
       "current": 75,
       "min": 0,
       "max": 100,
       "modifiers": {
         "overworked": -5,
         "praised": +10,
         "criticized": -15
       }
     },
     "dialogue": {
       "happy": ["Loving this project!", "This is coming together nicely"],
       "neutral": ["Making progress...", "Should have this done soon"],
       "stressed": ["This is a lot...", "I'm struggling with this"],
       "burned_out": ["I can't do this anymore", "I need a break"]
     }
   }
   Create 4 team members:
   - You (the player/art director)
   - Mike (Designer - perfectionist, slow, high quality)
   - Sarah (Developer - fast, pragmatic, low ego)
   - Alex (Junior Designer - eager, inconsistent, needs guidance)

2. Add to game.js:
   - Team morale system:
     * Each team member has independent morale
     * Morale affects work speed and quality
     * Very low morale (<25%) triggers "might quit" conversations
     * Very high morale (>85%) triggers positive bonuses
   - Functions:
     * updateTeamMorale() - called daily, applies modifiers
     * getTeamMemberStatus(memberId) - returns current mood/status
     * assignTeamMember(memberId, projectId) - updates assignments
     * getAvailableTeamMembers() - returns unassigned team
     * triggerTeamEvent(memberId, eventType) - creates team-specific conversations

3. Add team management UI:
   - Team panel showing each member:
     * Name, role, avatar/initial
     * Current assignment (or "Available")
     * Morale indicator (emoji + percentage)
     * Skill level (stars or numeric)
     * Status (working, blocked, burned out, etc.)
   - Drag-and-drop or click-to-assign interface
   - Visual feedback when assignment changes

4. Implement personality-driven events:
   - Mike (perfectionist) sometimes:
     * Requests more time for polish (delays project, improves quality)
     * Gets frustrated with rushed work (morale hit)
     * Produces exceptional work (satisfaction bonus)
   - Sarah (pragmatic) sometimes:
     * Suggests scope cuts to meet deadline (tradeoff conversation)
     * Works through issues independently (progress bonus)
     * Gets bored with easy projects (morale drain)
   - Alex (junior) sometimes:
     * Makes mistakes (requires your time to fix)
     * Has brilliant ideas (rare quality boost)
     * Needs encouragement (conversation opportunity)

5. Add "team pulse check" mechanic:
   - End of each week, show team morale summary
   - If anyone is <40% morale, trigger intervention conversation
   - Options: Give praise, offer break, discuss concerns, ignore

6. Create 5 team-specific conversation scenarios:
   - Mike asks for extension to perfect design
   - Sarah suggests technical compromise
   - Alex needs help (learning opportunity vs time sink)
   - Mike and Alex disagree on approach (mediation needed)
   - Sarah considering other job offer (retention crisis)

TESTING:
- Assign team members to projects
- Advance time and verify morale changes make sense
- Trigger team conversations based on morale
- Test that personality affects work output

Please provide updated code with complete team system.

