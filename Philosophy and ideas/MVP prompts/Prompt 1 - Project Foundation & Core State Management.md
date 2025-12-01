Detailed Build Plan: 7 Prompts for Cursor/Claude

PROMPT 1: Project Foundation & Core State Management

Objective: Set up the HTML structure and core game state system

Create the foundation for an agency management simulator game called "Agency Chaos Simulator".

REQUIREMENTS:

1. Create index.html with:
   - Single-page layout, no scrolling
   - Semantic HTML5 structure
   - Three main sections:
     a) Header: Week counter, resources (money, morale, satisfaction)
     b) Project Timeline: Visual progress bars for active projects
     c) Main Content Area: Where conversations/events display
   - Footer: Action buttons (Advance Day, View Summary, etc.)

2. Create game.js with:
   - GameState object that tracks:
     * currentWeek (1-12)
     * currentDay (1-7)
     * money (starting: $5000)
     * teamMorale (starting: 75)
     * projects: array of active projects with:
       - id, name, client, progress (0-1), weeksRemaining, teamAssigned, status, satisfaction
     * team: array of team members with:
       - id, name, role, skill, morale, currentAssignment
     * conversationQueue: array of pending conversations
     * conversationHistory: completed conversations
   - Functions:
     * initGame() - sets up initial state
     * advanceDay() - increments day, triggers project progress
     * updateProjects() - calculates progress based on team assignments
     * displayGameState() - updates all UI elements
     * saveState() - localStorage for session persistence

3. Create basic styles.css:
   - Clean, readable typography (system fonts)
   - Monospace font for numbers/stats
   - Simple color scheme:
     * Background: #f5f5f5
     * Text: #333
     * Success: #4caf50
     * Warning: #ff9800
     * Danger: #f44336
   - Responsive layout (mobile-friendly)
   - No fancy effects yet, just clarity

4. Initialize with 2 test projects:
   - Project A: "TechCorp Website" - 6 weeks, 60% complete
   - Project B: "StartupX Branding" - 8 weeks, 30% complete

5. Add test buttons to increment day and display updated state in console

IMPORTANT:
- Keep code modular and well-commented
- Use modern ES6+ JavaScript
- No external dependencies (vanilla JS only)
- Make it easy to expand later

Please create all three files with complete, working code.

