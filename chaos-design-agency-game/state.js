// State management and shared helpers

const GameStateModule = (function() {
    'use strict';

    const GameState = {
    currentWeek: 1,
    currentDay: 1,
    currentHour: 9, // Start at 9 AM
    money: 8000,
    teamMorale: 65,
    projects: [],
    team: [],
    conversationQueue: [],
    conversationHistory: [],
    resolvedConversations: [],
    deferredConversations: {},
    shownConversationsToday: [],
    portfolio: {
        completedProjects: 0,
        totalEarnings: 0
    },
    keyMoments: [],
    gameStats: {
        projectsCompleted: 0,
        projectsFailed: 0,
        scopeCreepHandled: 0,
        teamMemberQuits: 0,
        deadlinesMissed: 0,
        perfectDeliveries: 0,
        totalSatisfactionPoints: 0,
        highestMorale: 75,
        lowestMorale: 75
    },
    gamePhase: 'tutorial',
    gameOver: false,
    victoryPath: null,
    lastSalaryMonth: -1, // Track which month (week / 4) we last paid salaries (-1 means not paid yet)
    isManuallyPaused: false, // Manual pause state (user-controlled)
    
    // Conversation tracking fields (for conditional triggers)
    weekendsWorked: 0,              // Track player weekend work
    micromanagementCount: 0,        // Track how many times player checks in on workers
    clientCheckInsPerProject: {},   // { projectId: count } - track client communication frequency
    lastClientResponseTime: {},     // { projectId: timestamp } - track client silence
    quickJobsCompleted: 0,          // Track quick project offers accepted
    playerOvertimeWeeks: 0,         // Consecutive weeks player worked overtime
    conversationMemberMap: {},      // Map conversation IDs to triggering member IDs
    
    // Weekend choice tracking
    consecutiveWeekendsWorked: 0,   // Track streak of weekends team worked
    weekendChoices: [],             // History: ['rest', 'solo', 'team', ...]
    lastWeekendChoice: null,        // Last choice made
    teamWeekendsWorked: 0,          // Total times team worked weekends
    playerWeekendsWorked: 0         // Total times player worked weekends
};

    let AllConversations = [];
    let AllTeamMembers = [];
    let AllProjectTemplates = [];

    function setAllConversations(conversations = []) {
        AllConversations = conversations;
        window.AllConversations = AllConversations;
    }

    function setAllTeamMembers(members = []) {
        AllTeamMembers = members;
        window.AllTeamMembers = AllTeamMembers;
    }

    function setAllProjectTemplates(templates = []) {
        AllProjectTemplates = templates;
        window.AllProjectTemplates = AllProjectTemplates;
    }

    const DEFAULT_CLIENT_PROFILE = {
    name: 'Client',
    title: 'Stakeholder',
    company: 'Company',
    personality: 'standard',
    traits: {
        decisionSpeed: 'medium',
        budgetReality: 'reasonable',
        scopeDiscipline: 'medium',
        communicationStyle: 'direct',
        respectForProcess: 'medium'
    },
    satisfactionFactors: {
        designQuality: 0.3,
        meetingDeadlines: 0.3,
        responsiveness: 0.2,
        stayingInBudget: 0.2
    }
};

    function resetToDefaultState() {
    GameState.currentWeek = 1;
    GameState.currentDay = 1;
    GameState.currentHour = 9;
    GameState.money = 8000;
    GameState.teamMorale = 65;
    GameState.projects = [];
    GameState.team = [];
    GameState.conversationQueue = [];
    GameState.conversationHistory = [];
    GameState.resolvedConversations = [];
    GameState.deferredConversations = {};
    GameState.shownConversationsToday = [];
    GameState.portfolio = { completedProjects: 0, totalEarnings: 0 };
    GameState.keyMoments = [];
    GameState.gameStats = {
        projectsCompleted: 0,
        projectsFailed: 0,
        scopeCreepHandled: 0,
        teamMemberQuits: 0,
        deadlinesMissed: 0,
        perfectDeliveries: 0,
        totalSatisfactionPoints: 0,
        highestMorale: 65,
        lowestMorale: 65
    };
    GameState.gamePhase = 'tutorial';
    GameState.gameOver = false;
    GameState.victoryPath = null;
    GameState.lastSalaryMonth = -1;
    GameState.isManuallyPaused = false;
    
    // Reset conversation tracking fields
    GameState.weekendsWorked = 0;
    GameState.micromanagementCount = 0;
    GameState.clientCheckInsPerProject = {};
    GameState.lastClientResponseTime = {};
    GameState.quickJobsCompleted = 0;
    GameState.playerOvertimeWeeks = 0;
    GameState.conversationMemberMap = {};
    
    // Reset weekend choice tracking
    GameState.consecutiveWeekendsWorked = 0;
    GameState.weekendChoices = [];
    GameState.lastWeekendChoice = null;
    GameState.teamWeekendsWorked = 0;
    GameState.playerWeekendsWorked = 0;
    
    if (window.OfficeVisualization && window.OfficeVisualization.reset) {
        window.OfficeVisualization.reset();
    }
}

    function saveState() {
    try {
        localStorage.setItem('agencyChaosState', JSON.stringify(GameState));
    } catch (e) {
        console.error('Error saving game state:', e);
    }
}

    function getTeamMemberById(memberId) {
    if (!memberId) return null;
    return GameState.team.find(m => m.id === memberId)
        || AllTeamMembers.find(m => m.id === memberId)
        || null;
}

    function getTeamMemberName(memberId) {
    const member = getTeamMemberById(memberId);
    return member ? member.name : memberId;
}

    function adjustMemberMorale(member, delta = 0) {
    if (!member || !member.morale || typeof delta !== 'number' || delta === 0) return;
    const min = member.morale.min ?? 0;
    const max = member.morale.max ?? 100;
    member.morale.current = Math.max(min, Math.min(max, member.morale.current + delta));
}

    function recalculateTeamMorale() {
    const members = GameState.team.filter(m => m.id !== 'player' && m.morale);
    if (members.length === 0) {
        GameState.teamMorale = 0;
        return;
    }
    const avg = members.reduce((sum, member) => sum + (member.morale.current || 0), 0) / members.length;
    GameState.teamMorale = Math.round(avg);
}

    function applyTeamMoraleConsequence(change) {
    if (change === undefined || change === null) return;

    if (typeof change === 'number') {
        GameState.team.forEach(member => {
            if (member.id !== 'player') {
                adjustMemberMorale(member, change);
            }
        });
        recalculateTeamMorale();
        return;
    }

    if (Array.isArray(change)) {
        change.forEach(entry => applyTeamMoraleConsequence(entry));
        return;
    }

    if (typeof change === 'object') {
        const delta = change.delta ?? change.amount ?? 0;
        const targets = [];
        if (change.memberId) targets.push(change.memberId);
        if (Array.isArray(change.memberIds)) targets.push(...change.memberIds);

        if (targets.length > 0) {
            targets.forEach(id => {
                const member = GameState.team.find(m => m.id === id);
                if (member) adjustMemberMorale(member, delta);
            });
        } else if (typeof delta === 'number') {
            applyTeamMoraleConsequence(delta);
        }

        recalculateTeamMorale();
    }
}

    function describeTeamMoraleChange(change) {
    if (change === undefined || change === null) return [];
    const entries = [];
    const addGlobalEntry = delta => {
        if (!delta) return;
        const emoji = delta > 0 ? '😊' : '😔';
        entries.push(`${emoji} Morale ${delta > 0 ? '+' : ''}${delta}`);
    };
    const addMemberEntry = (memberId, delta) => {
        if (!delta) return;
        const emoji = delta > 0 ? '😊' : '😔';
        entries.push(`${getTeamMemberName(memberId)} ${emoji} ${delta > 0 ? '+' : ''}${delta}`);
    };
    const processObject = obj => {
        if (!obj) return;
        const delta = obj.delta ?? obj.amount ?? 0;
        if (obj.memberId) {
            addMemberEntry(obj.memberId, delta);
        } else if (Array.isArray(obj.memberIds) && obj.memberIds.length > 0) {
            obj.memberIds.forEach(id => addMemberEntry(id, delta));
        } else {
            addGlobalEntry(delta);
        }
    };

    if (typeof change === 'number') {
        addGlobalEntry(change);
    } else if (Array.isArray(change)) {
        change.forEach(entry => {
            if (typeof entry === 'number') {
                addGlobalEntry(entry);
            } else if (typeof entry === 'object') {
                processObject(entry);
            }
        });
    } else if (typeof change === 'object') {
        processObject(change);
    }
    return entries;
}

    function formatConsequences(consequences = {}) {
    const hints = [];

    if (typeof consequences.money === 'number' && consequences.money !== 0) {
        const sign = consequences.money > 0 ? '+' : '-';
        hints.push(`💰 ${sign}$${Math.abs(consequences.money)}`);
    }

    describeTeamMoraleChange(consequences.teamMorale).forEach(entry => hints.push(entry));

    if (consequences.projectProgress && typeof consequences.projectProgress.delta === 'number' && consequences.projectProgress.delta !== 0) {
        const pct = Math.round(consequences.projectProgress.delta * 100);
        hints.push(`📈 Progress ${pct > 0 ? '+' : ''}${pct}%`);
    }

    if (consequences.clientSatisfaction && typeof consequences.clientSatisfaction.delta === 'number' && consequences.clientSatisfaction.delta !== 0) {
        const pct = Math.round(consequences.clientSatisfaction.delta);
        hints.push(`⭐ ${pct > 0 ? '+' : ''}${pct}%`);
    }

    if (Array.isArray(consequences.spawnConversations) && consequences.spawnConversations.length > 0) {
        hints.push('Triggers follow-up');
    }

    return hints.length ? hints.join(' • ') : 'No immediate impact';
}

    function recordKeyMoment(title, description, type = 'info') {
    GameState.keyMoments.push({
        week: GameState.currentWeek,
        day: GameState.currentDay,
        title,
        description,
        type
    });
}

    function migrateTeamAssignments() {
        GameState.team.forEach(member => {
            // Migrate from currentAssignment to assignedProjects
            if (member.currentAssignment && (!member.assignedProjects || member.assignedProjects.length === 0)) {
                member.assignedProjects = [member.currentAssignment];
                // Keep currentAssignment for backward compatibility during transition
            }
            if (!member.assignedProjects) {
                member.assignedProjects = [];
            }
            // Initialize hour split fields
            if (member.hourSplitRatio === undefined) {
                const count = member.assignedProjects.length || 0;
                if (count === 0) {
                    member.hourSplitRatio = 1.0;
                    member.hoursPerProject = member.hours || 40;
                } else {
                    member.hourSplitRatio = 1 / count;
                    member.hoursPerProject = (member.hours || 40) * member.hourSplitRatio;
                }
            }
        });
        
        // Recalculate hour splits for all members
        if (window.recalculateHourSplits) {
            window.recalculateHourSplits();
        }
    }

    /**
     * Centralized burnout adjustment - USE EVERYWHERE
     * BURNOUT RULE: Never write to member.burnout directly!
     * ALWAYS use adjustBurnout() from state.js
     */
    function adjustBurnout(memberId, amount, reason = "Unknown") {
        const member = GameState.team.find(m => m.id === memberId);
        if (!member) {
            console.error(`[BURNOUT ERROR] Member ${memberId} not found`);
            return 0;
        }
        
        if (member.burnout === undefined || member.burnout === null) {
            member.burnout = 0;
        }
        
        const oldBurnout = member.burnout;
        member.burnout = Math.max(0, Math.min(100, member.burnout + amount));
        const actualChange = member.burnout - oldBurnout;
        
        // Only log significant burnout changes (>= 1% change) to reduce console spam
        if (Math.abs(actualChange) >= 1.0) {
            console.log(
                `[BURNOUT] ${member.name}: ${oldBurnout.toFixed(1)}% → ` +
                `${member.burnout.toFixed(1)}% (${actualChange >= 0 ? '+' : ''}` +
                `${actualChange.toFixed(2)}%) - ${reason}`
            );
        }
        
        checkBurnoutThresholds(member, oldBurnout);
        return actualChange;
    }

    /**
     * Calculate overtime burnout (10% per hour - more punishing for urgency)
     * BUG FIX #6: Use constant from GameConstants
     */
    function calculateOvertimeBurnout(memberId, overtimeHours) {
        const member = GameState.team.find(m => m.id === memberId);
        if (!member || !overtimeHours || overtimeHours <= 0) return 0;
        
        // BUG FIX #6: Use constant (10% per hour)
        const C = window.GameConstants || {};
        const burnoutRate = C.BURNOUT_RATE_PER_OVERTIME_HOUR || 0.10;
        const burnoutIncrease = overtimeHours * burnoutRate;
        
        return adjustBurnout(
            memberId, 
            burnoutIncrease, 
            `Overtime: ${overtimeHours.toFixed(1)} hours`
        );
    }

    /**
     * Check burnout thresholds and trigger events
     * BUG FIX #11: Actually trigger events, not just log
     */
    function checkBurnoutThresholds(member, oldBurnout) {
        const newBurnout = member.burnout;
        
        if (oldBurnout < 60 && newBurnout >= 60) {
            console.warn(`[BURNOUT WARNING] ${member.name} reached 60%!`);
            
            // Add key moment
            if (window.recordKeyMoment) {
                window.recordKeyMoment(
                    'Burnout Warning',
                    `Your burnout reached 60%. Some conversation choices may be blocked.`,
                    'crisis'
                );
            }
            
            // Show warning toast
            if (window.showWarningToast) {
                window.showWarningToast('⚠️ Burnout at 60%! Take a break or call in sick.', 4000);
            }
        }
        
        if (oldBurnout < 80 && newBurnout >= 80) {
            console.error(`[BURNOUT CRITICAL] ${member.name} reached 80%!`);
            
            // Add key moment
            if (window.recordKeyMoment) {
                window.recordKeyMoment(
                    'Critical Burnout',
                    `Your burnout reached 80%! You're at high risk of making poor decisions.`,
                    'crisis'
                );
            }
            
            // Show critical warning
            if (window.showWarningToast) {
                window.showWarningToast('🔥 CRITICAL BURNOUT at 80%! Call in sick immediately!', 5000);
            }
        }
    }

    return {
        GameState,
        AllConversations,
        AllTeamMembers,
        AllProjectTemplates,
        DEFAULT_CLIENT_PROFILE,
        setAllConversations,
        setAllTeamMembers,
        setAllProjectTemplates,
        resetToDefaultState,
        saveState,
        getTeamMemberById,
        getTeamMemberName,
        adjustMemberMorale,
        recalculateTeamMorale,
        applyTeamMoraleConsequence,
        describeTeamMoraleChange,
        formatConsequences,
        recordKeyMoment,
        migrateTeamAssignments,
        adjustBurnout,
        calculateOvertimeBurnout,
        checkBurnoutThresholds
    };
})();

// Expose on window for backward compatibility
window.GameState = GameStateModule.GameState;
window.AllConversations = GameStateModule.AllConversations;
window.AllTeamMembers = GameStateModule.AllTeamMembers;
window.AllProjectTemplates = GameStateModule.AllProjectTemplates;
window.DEFAULT_CLIENT_PROFILE = GameStateModule.DEFAULT_CLIENT_PROFILE;
window.setAllConversations = GameStateModule.setAllConversations;
window.setAllTeamMembers = GameStateModule.setAllTeamMembers;
window.setAllProjectTemplates = GameStateModule.setAllProjectTemplates;
window.resetToDefaultState = GameStateModule.resetToDefaultState;
window.saveState = GameStateModule.saveState;
window.getTeamMemberById = GameStateModule.getTeamMemberById;
window.getTeamMemberName = GameStateModule.getTeamMemberName;
window.adjustMemberMorale = GameStateModule.adjustMemberMorale;
window.recalculateTeamMorale = GameStateModule.recalculateTeamMorale;
window.applyTeamMoraleConsequence = GameStateModule.applyTeamMoraleConsequence;
window.describeTeamMoraleChange = GameStateModule.describeTeamMoraleChange;
window.formatConsequences = GameStateModule.formatConsequences;
window.recordKeyMoment = GameStateModule.recordKeyMoment;
window.migrateTeamAssignments = GameStateModule.migrateTeamAssignments;
window.adjustBurnout = GameStateModule.adjustBurnout;
window.calculateOvertimeBurnout = GameStateModule.calculateOvertimeBurnout;
window.checkBurnoutThresholds = GameStateModule.checkBurnoutThresholds;

