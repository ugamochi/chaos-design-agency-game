# Tanue (Perfectionist Designer) Conversations

**Character Profile:**
- Perfectionist designer with zero tolerance for mediocrity
- Slow but high quality (0.8x speed, 1.2x quality)
- Coffee addict
- Would rather miss deadline than ship something ugly
- Sensitive to criticism, needs time to polish

---

## Conversation 1: "The Kerning Crisis"

```json
{
  "id": "tanue_kerning_crisis",
  "trigger": "project_in_progress",
  "character": "tanue_designer",
  "urgency": "medium",
  "subject": "These pixels are haunting me",
  "body": "I know we're behind schedule, but this headline kerning is off by 2 pixels and I physically cannot unsee it. Give me 30 minutes to fix it? It's making my eye twitch.",
  "choices": [
    {
      "text": "Fix it. Quality matters.",
      "consequences": {
        "morale": {"tanue_designer": 8},
        "project_progress": -0.02,
        "quality": 0.05,
        "time_cost": 0.5
      },
      "flavor": "Tanue smiles for the first time this week"
    },
    {
      "text": "We're shipping it. Deadline is Friday.",
      "consequences": {
        "morale": {"tanue_designer": -15},
        "project_ships_on_time": true,
        "spawn": ["tanue_frustrated_perfectionist"]
      },
      "flavor": "Tanue's eye literally twitches. This will haunt them forever."
    }
  ]
}
```

---

## Conversation 2: "Coffee Dependency Intervention"

```json
{
  "id": "tanue_coffee_rant",
  "trigger": "random_day",
  "character": "tanue_designer",
  "urgency": "low",
  "subject": "Existential crisis (6 espressos deep)",
  "body": "I've had 6 espressos today and I can see through time. Also, this client brief is insulting to my craft. Should we even be taking projects like this?",
  "choices": [
    {
      "text": "We need the money. Let's make it work.",
      "consequences": {
        "morale": {"tanue_designer": -5},
        "project_continues": true
      },
      "flavor": "Tanue sighs deeply and returns to their 7th espresso"
    },
    {
      "text": "You're right. Let's turn it down.",
      "consequences": {
        "morale": {"tanue_designer": 12},
        "project_cancelled": true,
        "money": -5000,
        "reputation": 3
      },
      "flavor": "Tanue: 'Thank you for valuing integrity over cash. Rare.'"
    }
  ]
}
```

---

## Conversation 3: "The Extension Request"

```json
{
  "id": "tanue_extension_demand",
  "trigger": "project_deadline_close",
  "character": "tanue_designer",
  "urgency": "high",
  "subject": "I refuse to ship garbage",
  "body": "Client wants it by Friday. It's Wednesday. This needs another week if we're doing it RIGHT. I refuse to ship garbage just to meet impossible deadlines.",
  "choices": [
    {
      "text": "Request an extension from the client",
      "consequences": {
        "random_outcome": {
          "success_chance": 0.5,
          "success": {
            "timeline_extended": 7,
            "satisfaction": 0,
            "morale": {"tanue_designer": 10}
          },
          "failure": {
            "satisfaction": -15,
            "morale": {"tanue_designer": -8}
          }
        }
      },
      "flavor": "Rolling the dice on client flexibility..."
    },
    {
      "text": "We work weekend. I'll help you.",
      "consequences": {
        "morale": {"tanue_designer": -12, "player": -10},
        "overtime_weekend": true,
        "project_ships_on_time": true,
        "spawn": ["tanue_burnout_resentment"]
      },
      "flavor": "Tanue nods grimly. They'll remember this."
    }
  ]
}
```

---

## Conversation 4: "The Quality Compromise"

```json
{
  "id": "tanue_quality_vs_speed",
  "trigger": "project_behind_schedule",
  "character": "tanue_designer",
  "urgency": "high",
  "subject": "Corners to cut?",
  "body": "We're behind. I could skip the micro-interactions and the detailed states. It'll still be *fine*. But it won't be *great*. Your call.",
  "choices": [
    {
      "text": "Skip them. We need to catch up.",
      "consequences": {
        "project_progress": 0.15,
        "quality": -0.1,
        "morale": {"tanue_designer": -10},
        "spawn": ["tanue_regrets_compromise"]
      },
      "flavor": "Tanue's portfolio just got a little less impressive"
    },
    {
      "text": "Do it right. Quality is our reputation.",
      "consequences": {
        "timeline_slip": 3,
        "quality": 0.15,
        "morale": {"tanue_designer": 15}
      },
      "flavor": "Tanue's eyes light up. This is why they work here."
    }
  ]
}
```

---

## Conversation 5: "Portfolio Piece or Just Work"

```json
{
  "id": "tanue_portfolio_piece",
  "trigger": "project_interesting",
  "character": "tanue_designer",
  "urgency": "low",
  "subject": "This could be amazing",
  "body": "This project could be a portfolio piece. Like, award-winning level. But it'll take extra time to push it there. Client isn't asking for it. Should we anyway?",
  "choices": [
    {
      "text": "Yes. Let's make something legendary.",
      "consequences": {
        "timeline_slip": 5,
        "quality": 0.25,
        "morale": {"tanue_designer": 20},
        "reputation": 10,
        "portfolio_piece": true
      },
      "flavor": "Tanue: 'This is why I became a designer.'"
    },
    {
      "text": "Stick to the brief. It's good enough.",
      "consequences": {
        "project_ships_on_time": true,
        "morale": {"tanue_designer": -8},
        "missed_opportunity": true
      },
      "flavor": "Tanue: '...yeah. Good enough. Story of the industry.'"
    }
  ]
}
```

---

## Implementation Notes

**Trigger Conditions:**
- `project_in_progress`: Any active project with Tanue assigned
- `random_day`: 10% chance daily when Tanue is working
- `project_deadline_close`: When deadline is <3 days away
- `project_behind_schedule`: When timeline slippage >20%
- `project_interesting`: High-quality or high-profile projects

**Spawn Conversations:**
- `tanue_frustrated_perfectionist`: Week later, Tanue still bitter about shipping imperfect work
- `tanue_burnout_resentment`: After multiple overtime weekends, breaking point conversation
- `tanue_regrets_compromise`: Tanue brings up the quality cuts, affecting current project morale
