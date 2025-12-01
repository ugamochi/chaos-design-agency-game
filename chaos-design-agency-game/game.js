// Agency Chaos Simulator - Orchestration Logic

async function loadJson(url) {
    try {
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.error(`Error loading ${url}:`, error);
        return [];
    }
}

async function initGame() {
    setAllConversations(await loadJson('conversations.json'));
    setAllTeamMembers(await loadJson('characters.json'));
    setAllProjectTemplates(await loadJson('projects.json'));

    console.log('Loaded conversations:', AllConversations.length);
    console.log('Loaded team members:', AllTeamMembers.length);
    console.log('Loaded project templates:', AllProjectTemplates.length);

    const savedState = localStorage.getItem('agencyChaosState');
    if (savedState) {
        try {
            const parsed = JSON.parse(savedState);
            Object.assign(GameState, parsed);
            
            if (!GameState.keyMoments) GameState.keyMoments = [];
            if (!GameState.gameStats) {
                GameState.gameStats = {
                    projectsCompleted: 0,
                    projectsFailed: 0,
                    scopeCreepHandled: 0,
                    teamMemberQuits: 0,
                    deadlinesMissed: 0,
                    perfectDeliveries: 0,
                    totalSatisfactionPoints: 0,
                    highestMorale: GameState.teamMorale || 75,
                    lowestMorale: GameState.teamMorale || 75
                };
            }
            if (!GameState.gamePhase) GameState.gamePhase = 'tutorial';
            if (typeof GameState.gameOver !== 'boolean') GameState.gameOver = false;
            if (GameState.victoryPath === undefined) GameState.victoryPath = null;
            
            console.log('Game state loaded from localStorage');
        } catch (error) {
            console.error('Error loading saved state:', error);
            resetToDefaultState();
        }
    } else {
        resetToDefaultState();
    }

    if (GameState.projects.length > 0) {
        GameState.projects = GameState.projects.map(project => hydrateProject(project));
    }

    if (GameState.team.length === 0 && AllTeamMembers.length > 0) {
        GameState.team = AllTeamMembers.map(member => ({
            ...member,
            currentAssignment: null,
            daysOnAssignment: 0,
            lowMoraleTriggered: false,
            highMoraleTriggered: false,
            hours: 8
        }));
    }
    
    GameState.team.forEach(member => {
        if (member.hours === undefined || member.hours === null) {
            member.hours = 8;
        }
    });

    if (GameState.projects.length === 0) {
        seedInitialProjects();
    }

    GameState.projects.forEach(project => updateProjectSatisfaction(project));

    checkForConversations();
    displayGameState();
    setupEventListeners();
    initTutorial();
}

function seedInitialProjects() {
    const techcorpTemplate = AllProjectTemplates.find(t => t.id === 'techcorp_web');
    const startupxTemplate = AllProjectTemplates.find(t => t.id === 'startupx_branding');

    GameState.projects = [
        buildProjectFromTemplate(techcorpTemplate || {}, {
            id: 'proj-001',
            progress: 0.6,
            weeksRemaining: techcorpTemplate?.totalWeeks || 7
        }),
        buildProjectFromTemplate(startupxTemplate || {}, {
            id: 'proj-002',
            progress: 0.3,
            weeksRemaining: startupxTemplate?.totalWeeks || 9
        })
    ].map(project => hydrateProject(project));
}

function advanceDay() {
    if (currentConversation !== null) {
        pulseElement('.conversation-container');
        showWarningToast('⏸️ Please respond to the active conversation before advancing time', 3000);
        return;
    }
    
    if (GameState.gameOver) {
        return;
    }

    const feedbackElement = document.getElementById('currentConsequenceFeedback');
    if (feedbackElement) {
        feedbackElement.classList.add('fade-out');
        setTimeout(() => feedbackElement.remove(), 300);
    }

    GameState.currentDay++;
    advanceClock();
    
    resetDailyHours();

    if (GameState.currentDay > 7) {
        GameState.currentDay = 1;
        GameState.currentWeek++;
        GameState.currentHour = 9; // Reset to 9 AM on new week

        if (GameState.currentWeek > 12) {
            handleGameEnd('victory');
            return;
        }

        updateGamePhase();
        triggerScriptedEvents();
    }

    purgeDeferredConversations();

    checkForIllness();
    updateTeamMorale();
    updateProjects();
    checkTeamEvents();
    checkFailureConditions();
    checkForConversations();
    checkForContextualTips();

    if (GameState.currentDay === 7) {
        checkTeamPulse();
        processWeeklyCosts();
        setTimeout(() => showWeekSummary(), 500);
        generateWeeklyClientFeedback();
    }

    checkProjectDeadlines();
    updateGameStats();
    displayGameState();
    saveState();

    console.log(`Day advanced: Week ${GameState.currentWeek}, Day ${GameState.currentDay}`);
}

function updateGamePhase() {
    if (GameState.currentWeek <= 2) {
        GameState.gamePhase = 'tutorial';
    } else if (GameState.currentWeek <= 5) {
        GameState.gamePhase = 'early';
    } else if (GameState.currentWeek <= 9) {
        GameState.gamePhase = 'mid';
    } else {
        GameState.gamePhase = 'late';
    }
}

function triggerScriptedEvents() {
    if (GameState.currentWeek === 3 && GameState.currentDay === 1) {
        recordKeyMoment('Early Growing Pains', 'First real test of agency management', 'milestone');
    }
    
    if (GameState.currentWeek === 5 && GameState.currentDay === 1) {
        recordKeyMoment('Mid-Point Push', 'Halfway through the gauntlet', 'milestone');
    }
    
    if (GameState.currentWeek === 10 && GameState.currentDay === 1) {
        recordKeyMoment('Final Stretch', 'The home stretch begins', 'milestone');
    }
}

function checkFailureConditions() {
    if (GameState.money < -5000) {
        handleGameEnd('bankruptcy');
        return true;
    }

    const activeMembersCount = GameState.team.filter(m => 
        m.id !== 'player' && m.morale.current >= 10
    ).length;
    
    if (activeMembersCount === 0 && GameState.team.length > 1) {
        handleGameEnd('team_quit');
        return true;
    }

    const teamBurnout = GameState.team.filter(m => 
        m.id !== 'player' && m.morale.current < 10
    ).length;
    
    if (teamBurnout >= Math.max(2, GameState.team.length - 1)) {
        handleGameEnd('burnout');
        return true;
    }

    return false;
}

function updateGameStats() {
    if (GameState.teamMorale > GameState.gameStats.highestMorale) {
        GameState.gameStats.highestMorale = GameState.teamMorale;
    }
    if (GameState.teamMorale < GameState.gameStats.lowestMorale) {
        GameState.gameStats.lowestMorale = GameState.teamMorale;
    }
}

function calculateVictoryPath() {
    const stats = GameState.gameStats;
    const completedProjects = stats.projectsCompleted;
    const money = GameState.money;
    const avgSatisfaction = completedProjects > 0 
        ? stats.totalSatisfactionPoints / completedProjects 
        : 0;
    const morale = GameState.teamMorale;

    if (completedProjects >= 5 && money >= 25000 && avgSatisfaction >= 75 && morale >= 70) {
        return 'rockstar';
    }
    
    if (completedProjects >= 3 && money >= 10000 && avgSatisfaction >= 60 && morale >= 50) {
        return 'professional';
    }
    
    if (completedProjects >= 2 && money >= 2000) {
        return 'survivor';
    }
    
    return 'struggled';
}

function calculateScore() {
    const stats = GameState.gameStats;
    let score = 0;

    score += stats.projectsCompleted * 1000;
    score += Math.max(0, GameState.money) / 10;
    score += (stats.totalSatisfactionPoints / Math.max(1, stats.projectsCompleted)) * 10;
    score += GameState.teamMorale * 5;
    
    score += stats.perfectDeliveries * 500;
    score += stats.scopeCreepHandled * 200;
    
    score -= stats.projectsFailed * 800;
    score -= stats.deadlinesMissed * 400;
    score -= stats.teamMemberQuits * 600;

    const weekBonus = (12 - GameState.currentWeek) * 100;
    score += Math.max(0, weekBonus);

    return Math.round(Math.max(0, score));
}

function getRankTitle(victoryPath, score) {
    if (victoryPath === 'rockstar') {
        if (score >= 50000) return '🌟 Agency Legend';
        if (score >= 40000) return '🎯 Master Director';
        return '💎 Top Performer';
    }
    
    if (victoryPath === 'professional') {
        if (score >= 30000) return '📈 Solid Professional';
        if (score >= 20000) return '✅ Competent Manager';
        return '👔 Getting By';
    }
    
    if (victoryPath === 'survivor') {
        if (score >= 15000) return '💪 Scrappy Survivor';
        if (score >= 10000) return '🔥 Barely Made It';
        return '😅 Still Standing';
    }
    
    return '📉 Struggling Startup';
}

function getEndGameMessage(endReason, victoryPath) {
    if (endReason === 'bankruptcy') {
        return 'The agency ran out of money. Sometimes the best lessons come from failure. Try managing your budget more carefully next time!';
    }
    
    if (endReason === 'team_quit') {
        return 'Your entire team quit. Remember: happy team, happy agency. Pay attention to morale and don\'t overwork your people!';
    }
    
    if (endReason === 'burnout') {
        return 'Team burnout caused a complete collapse. This is a people business - take care of your team or lose everything.';
    }

    if (victoryPath === 'rockstar') {
        return 'Incredible! You didn\'t just survive - you thrived. Your agency is the talk of the industry. Clients love you, your team is energized, and you\'re profitable. This is what excellence looks like!';
    }
    
    if (victoryPath === 'professional') {
        return 'Well done! You ran a solid agency. Good client relationships, decent profits, and a team that didn\'t hate you. That\'s honestly better than most agencies manage. You should be proud!';
    }
    
    if (victoryPath === 'survivor') {
        return 'You made it through 12 weeks without catastrophic failure. That\'s... something! It was messy, chaotic, and barely held together - but you survived. Welcome to agency life!';
    }
    
    return 'You struggled through, but didn\'t quite hit the mark. Every agency has rough patches - learn from this and come back stronger!';
}

function processWeeklyCosts() {
    const teamSize = GameState.team.filter(m => m.id !== 'player' && (!m.hasQuit || m.hasQuit === false)).length;
    const weeklyCosts = teamSize * 600 + 300;
    
    GameState.money -= weeklyCosts;
    
    GameState.conversationHistory.push({
        title: 'Weekly Costs',
        message: `Payroll and overhead: -$${weeklyCosts.toLocaleString()}`,
        type: 'info',
        timestamp: `Week ${GameState.currentWeek}`
    });
    
    if (GameState.money < 1000 && GameState.money > 0) {
        recordKeyMoment('Low on Cash', 'Running dangerously low on funds', 'crisis');
    }
}

function resetDailyHours() {
    GameState.team.forEach(member => {
        member.hours = 8;
    });
}

function handleGameEnd(endReason = 'victory') {
    GameState.gameOver = true;
    
    if (endReason === 'victory') {
        recordKeyMoment('12 Weeks Complete!', 'Finished the full agency simulation', 'victory');
        GameState.victoryPath = calculateVictoryPath();
        celebrateVictory(GameState.victoryPath);
    } else {
        GameState.victoryPath = 'failed';
        screenShake('heavy');
    }
    
    const score = calculateScore();
    const rank = getRankTitle(GameState.victoryPath, score);
    const message = getEndGameMessage(endReason, GameState.victoryPath);
    
    saveGameAttempt(endReason, GameState.victoryPath, score, rank);
    
    setTimeout(() => {
        showEndGameScreen(endReason, GameState.victoryPath, score, rank, message);
    }, 500);
    
    saveState();
}

document.addEventListener('DOMContentLoaded', () => {
    initGame();
});
