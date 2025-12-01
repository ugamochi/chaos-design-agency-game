// Game Constants
// Centralized constants to reduce magic numbers and repeated strings

const GameConstants = {
    // Game Configuration
    TOTAL_WEEKS: 12,
    DAYS_PER_WEEK: 7,
    STARTING_MONEY: 8000,
    STARTING_MORALE: 65,
    STARTING_HOUR: 9,
    
    // Time
    WORK_DAY_START: 9,
    WORK_DAY_END: 18,
    BASE_HOURS_PER_DAY: 8,
    
    // Economics
    WEEKLY_PAYROLL_PER_MEMBER: 600, // Deprecated - use monthly instead
    WEEKLY_OVERHEAD: 300,
    MONTHLY_SALARY_PER_MEMBER: 2000, // Monthly salary per employee
    MONTHLY_OVERHEAD: 1200, // Monthly overhead (rent, utilities, etc.)
    WEEKS_PER_MONTH: 4,
    BANKRUPTCY_THRESHOLD: -5000,
    
    // Morale
    LOW_MORALE_THRESHOLD: 25,
    HIGH_MORALE_THRESHOLD: 85,
    QUIT_MORALE_THRESHOLD: 5,
    BURNOUT_MORALE_THRESHOLD: 10,
    
    // Player Burnout
    BURNOUT_WARNING_THRESHOLD: 80,
    BURNOUT_CHOICE_BLOCK_THRESHOLD: 60,
    BURNOUT_POOR_DECISION_THRESHOLD: 90,
    
    // Project Status
    PROJECT_STATUS: {
        OK: 'ok',
        WARNING: 'warning',
        CRISIS: 'crisis',
        COMPLETE: 'complete'
    },
    
    // Game Phases
    GAME_PHASE: {
        TUTORIAL: 'tutorial',
        EARLY: 'early',
        MID: 'mid',
        LATE: 'late'
    },
    
    // Victory Paths
    VICTORY_PATH: {
        ROCKSTAR: 'rockstar',
        PROFESSIONAL: 'professional',
        SURVIVOR: 'survivor',
        STRUGGLED: 'struggled',
        FAILED: 'failed'
    },
    
    // Satisfaction Thresholds
    SATISFACTION: {
        PERFECT: 90,
        HIGH: 80,
        GOOD: 60,
        LOW: 30,
        CRISIS: 30
    },
    
    // LocalStorage Keys
    STORAGE_KEYS: {
        GAME_STATE: 'agencyChaosState',
        TUTORIAL: 'agencyChaosTutorial',
        HIGH_SCORES: 'agencyChaosHighScores'
    },
    
    // Animation Durations (ms)
    ANIMATION: {
        FADE: 300,
        SHAKE: 500,
        PULSE: 1200,
        CELEBRATION: 2000,
        TOAST: 4000
    },
    
    // Element IDs
    ELEMENTS: {
        CURRENT_WEEK: 'currentWeek',
        CURRENT_DAY: 'currentDay',
        MONEY: 'money',
        TEAM_MORALE: 'teamMorale',
        SATISFACTION: 'satisfaction',
        BURNOUT: 'burnout',
        PLAYER_HOURS: 'playerHours',
        GAME_CLOCK: 'gameClock',
        ADVANCE_DAY_BTN: 'advanceDayBtn',
        PROJECTS_CONTAINER: 'projectsContainer',
        TEAM_CONTAINER: 'teamContainer',
        CONTENT_AREA: 'contentArea'
    },
    
    // CSS Classes
    CLASSES: {
        MODAL_OVERLAY: 'modal-overlay',
        MODAL_CONTENT: 'modal-content',
        BTN_PRIMARY: 'btn btn-primary',
        BTN_SECONDARY: 'btn btn-secondary',
        BTN_DANGER: 'btn btn-danger'
    }
};

window.GameConstants = GameConstants;

