PROMPT 3: Project Progress & Timeline Visualization

Objective: Make projects feel alive with automatic progress and visual feedback

Implement the project management and timeline visualization system.

REQUIREMENTS:

1. Enhance game.js project logic:
   - Project progress calculation:
     * Base progress per day = (assignedTeam.skill / projectComplexity) * 0.05
     * Modified by team morale (low morale = slower)
     * Modified by project status (crisis = halted, warning = 50% speed)
     * Random minor variations (±10%) for realism
   - Project status conditions:
     * "ok" = on track, green
     * "warning" = <2 weeks to deadline and <70% complete, yellow
     * "crisis" = missed deadline or client satisfaction <30%, red
     * "complete" = progress >= 100%
   - Team assignment logic:
     * Each team member can work on only 1 project at a time
     * You (player) can split attention across both projects (reduced efficiency)
     * Unassigned team = 0 progress on project
   - Add functions:
     * updateProjectProgress() - called each day advance
     * checkProjectDeadlines() - triggers events if deadlines approaching/missed
     * completeProject(projectId) - handles project completion, payment, cleanup
     * getProjectStatus(projectId) - determines current status

2. Create projects.json with detailed project templates:
   Example structure:
   {
     "id": "techcorp_web",
     "name": "TechCorp Website Redesign",
     "client": "TechCorp",
     "type": "website",
     "budget": 15000,
     "totalWeeks": 6,
     "complexity": 3,
     "description": "Full website redesign with new branding",
     "requiredSkills": ["design", "development"],
     "baseClientSatisfaction": 0.75
   }
   Include 4 project templates (will be used across playthroughs)

3. Enhance timeline visualization:
   - Show each project as a horizontal bar with:
     * Project name and client
     * Progress percentage (animated fill)
     * Time remaining (weeks/days)
     * Status indicator (icon + color)
     * Assigned team member avatars/initials
     * Satisfaction indicator (emoji or stars)
   - Make progress bars visually satisfying:
     * Smooth animation when progress updates
     * Pulse effect on status changes
     * Completion celebration (brief animation)

4. Add end-of-week summary modal:
   - Triggered every 7 days
   - Shows:
     * Week completed
     * Projects progress recap
     * Money earned (if milestones hit)
     * Team morale changes
     * Upcoming deadlines
   - "Continue" button to start next week

5. Implement project completion flow:
   - When progress hits 100%:
     * Calculate final payment (budget * satisfactionMultiplier)
     * Show completion message
     * Update portfolio/reputation (simple counter for MVP)
     * Remove from active projects
     * Trigger "project complete" conversation (client feedback)

TESTING:
- Start with 2 projects, advance several days
- Verify progress calculations are reasonable
- Test deadline warnings trigger correctly
- Complete a project and verify payment received

Please provide updated code with working project system.

