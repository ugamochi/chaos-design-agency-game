Tech Stack Decision: HTML/CSS/JS (Recommended)

Why HTML over Godot for MVP:

✅ Instant preview (no export/build step)  
✅ Easier to iterate text/UI rapidly  
✅ Better for conversation-heavy content  
✅ Can become web game immediately (itch.io ready)  
✅ JSON data structure = easy to expand  
✅ LLMs are better at web dev than Godot GDScript  
✅ Easier to add visual polish later (CSS animations)

When to switch to Godot:

- After MVP validates and you want advanced office view
- When you need complex pathfinding/simulation
- For Steam release (though Electron works too)

---

MVP Scope Definition

**What's IN (Week 1 Build)**

**Core Systems:**

- Time advancement (day-by-day, 12 weeks total)
- Project tracking (2 simultaneous projects max)
- Conversation system (display, choices, consequences)
- Resource tracking (Money, Team Morale, Client Satisfaction)
- Team members (You + 2 employees)

**Content:**

- 2 client projects (pre-scripted for tutorial flow)
- 15 conversation scenarios
- 5 crisis events
- 3 team member personalities
- Win/lose conditions

**UI:**

- Single screen design (no page navigation)
- Text-based conversations
- Simple progress bars
- Minimal styling (functional not beautiful)

**What's OUT (Post-MVP)**

❌ Multiple simultaneous projects (>2)  
❌ Hiring/firing system  
❌ Office visualization  
❌ Sound/music  
❌ Fancy animations  
❌ Save system (single session only)  
❌ Meta-progression/unlocks  
❌ Randomized content (scripted story for MVP)

---

File Structure

```
agency-sim-mvp/
├── index.html          # Main game container
├── styles.css          # All styling
├── game.js            # Core game logic
├── data/
│   ├── projects.json  # Project definitions
│   ├── conversations.json  # All conversation scenarios
│   ├── characters.json     # Team & client personalities
│   └── events.json    # Random events
└── README.md          # Dev notes
```

