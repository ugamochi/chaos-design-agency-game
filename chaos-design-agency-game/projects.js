// Project and team management logic

const ProjectsModule = (function() {
    'use strict';

    function checkForIllness() {
        window.GameState.team.forEach(member => {
        if (member.isIll) {
            member.isIll = false;
            return;
        }

        let illnessChance = 0.02;
        
        if (member.morale.current < 30) {
            illnessChance += 0.05;
        }
        if (member.currentAssignment && member.daysOnAssignment > 10) {
            illnessChance += 0.03;
        }
        if (member.morale.current < 20) {
            illnessChance += 0.05;
        }

        if (Math.random() < illnessChance) {
            member.isIll = true;
            member.hours = Math.max(0, member.hours - 8);
            
            window.showIllnessPopup(member);
            
            window.GameState.conversationHistory.push({
                title: `${member.name} is Ill`,
                message: `${member.name} called in sick today. They won't be able to work on projects.`,
                type: 'warning',
                timestamp: `Week ${window.GameState.currentWeek}, Day ${window.GameState.currentDay}`
            });
        }
    });
}

    function showIllnessPopup(member) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>😷 ${member.name} is Ill</h2>
            <p>${member.name} called in sick today and won't be able to work on projects.</p>
            <p style="color: #666; font-size: 0.9rem;">They've lost 8 hours for today.</p>
            <button class="btn btn-primary">OK</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.querySelector('button').addEventListener('click', () => {
        modal.remove();
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

    function updateTeamMorale() {
        window.GameState.team.forEach(member => {
        if (member.id === 'player') return;

        if (typeof member.lowMoraleTriggered !== 'boolean') {
            member.lowMoraleTriggered = false;
        }
        if (typeof member.highMoraleTriggered !== 'boolean') {
            member.highMoraleTriggered = false;
        }

        let moraleChange = 0;

        if (member.currentAssignment && member.daysOnAssignment > 10) {
            moraleChange += member.morale.modifiers.overworked || -5;
        }

        adjustMemberMorale(member, moraleChange);

        if (member.currentAssignment) {
            member.daysOnAssignment++;
        }
        
        if (!member.currentAssignment && member.hours > 0 && !member.isIll) {
            const idleHours = Math.min(member.hours, 2);
            member.hours = Math.max(0, member.hours - idleHours);
        }

        const currentMorale = member.morale.current;
        if (currentMorale < 25 && !member.lowMoraleTriggered) {
            triggerTeamEvent(member, 'low_morale');
            member.lowMoraleTriggered = true;
        } else if (currentMorale >= 30) {
            member.lowMoraleTriggered = false;
        }

        if (currentMorale > 85 && !member.highMoraleTriggered) {
            triggerTeamEvent(member, 'high_morale');
            member.highMoraleTriggered = true;
        } else if (currentMorale <= 80) {
            member.highMoraleTriggered = false;
        }
    });
    
        const player = window.GameState.team.find(m => m.id === 'player');
    if (player && !player.currentAssignment && player.hours > 0 && !player.isIll) {
        const idleHours = Math.min(player.hours, 2);
        player.hours = Math.max(0, player.hours - idleHours);
    }

    recalculateTeamMorale();
}

    function getClientProfile(project) {
        return project.clientProfile || window.DEFAULT_CLIENT_PROFILE;
    }

    function updateProjectRisk(project) {
    const risk = project.risk || {};
    const estimatedHours = project.estimatedHours || 25;
    const originalHours = project.originalEstimatedHours || estimatedHours;
    const hoursDelta = estimatedHours - originalHours;
    const hoursDeltaPercent = originalHours ? (hoursDelta / originalHours) * 100 : 0;
    
    if (hoursDeltaPercent >= 30) risk.scope = 'high';
    else if (hoursDeltaPercent >= 10) risk.scope = 'medium';
    else risk.scope = 'low';

    if (project.satisfaction <= 40) risk.satisfaction = 'high';
    else if (project.satisfaction <= 65) risk.satisfaction = 'medium';
    else risk.satisfaction = 'low';

    if (project.weeksRemaining <= 0) risk.timeline = 'high';
    else if (project.weeksRemaining <= 1.5) risk.timeline = 'medium';
    else risk.timeline = 'low';

    risk.scopeLabel = hoursDelta > 0 ? `+${Math.round(hoursDelta)}h` : hoursDelta < 0 ? `${Math.round(hoursDelta)}h` : 'On estimate';
    risk.timelineLabel = project.weeksRemaining <= 0 ? 'Overdue' : `${Math.ceil(project.weeksRemaining)} wk left`;
    risk.satisfactionLabel = `${Math.round(project.satisfaction)}% happy`;

    project.risk = risk;
}

    function calculateSatisfactionScores(project) {
        const profile = getClientProfile(project);
        const assignedMembers = window.GameState.team.filter(m => m.currentAssignment === project.id);

    const avgSkill = assignedMembers.length
        ? assignedMembers.reduce((sum, m) => sum + (m.skill || 1), 0) / assignedMembers.length
        : 2.5;
    const avgMorale = assignedMembers.length
        ? assignedMembers.reduce((sum, m) => sum + (m.morale?.current || 50), 0) / assignedMembers.length
        : window.GameState.teamMorale || 50;
    const designQuality = Math.min(1, (avgSkill / 5) * (avgMorale / 100));

    const expectedProgress = 1 - (project.weeksRemaining / project.totalWeeks);
    const progressDelta = project.progress - expectedProgress;
    const meetingDeadlines = Math.max(0, Math.min(1, 0.5 + progressDelta));

    const responseHours = project.lastResponseHours ?? 24;
    const responsiveness = Math.max(0, Math.min(1, responseHours <= 4 ? 1 : 4 / responseHours));

    const budgetStatus = project.budgetStatus ?? 1;

    return {
        designQuality,
        meetingDeadlines,
        responsiveness,
        stayingInBudget: Math.max(0, Math.min(1, budgetStatus))
    };
}

    function updateProjectSatisfaction(project) {
    const profile = getClientProfile(project);
    const weights = profile.satisfactionFactors;
    const scores = calculateSatisfactionScores(project);

    const satisfaction =
        (scores.designQuality * (weights.designQuality || 0)) +
        (scores.meetingDeadlines * (weights.meetingDeadlines || 0)) +
        (scores.responsiveness * (weights.responsiveness || 0)) +
        (scores.stayingInBudget * (weights.stayingInBudget || 0));

    const normalized = Math.max(0, Math.min(1, satisfaction));
    project.satisfaction = Math.round(normalized * 100);
    updateProjectRisk(project);
}

    function handleScopeCreepRequest(change) {
        if (!change) return;
        const changes = Array.isArray(change) ? change : [change];

        changes.forEach(entry => {
            const project = window.GameState.projects.find(p => p.id === entry.projectId);
            if (!project) return;

            const hoursDelta = entry.hoursDelta !== undefined ? entry.hoursDelta : (entry.delta ? (entry.delta || 0) * 25 : 0);
            if (hoursDelta !== 0) {
                project.estimatedHours = Math.max(10, (project.estimatedHours || 25) + hoursDelta);
                window.GameState.gameStats.scopeCreepHandled++;
            }

            if (entry.timelineWeeks) {
                project.totalWeeks += entry.timelineWeeks;
                project.weeksRemaining += entry.timelineWeeks;
            }

            if (entry.budgetDelta) {
                project.budget += entry.budgetDelta;
                window.GameState.money += entry.budgetDelta;
            }

            if (entry.teamStress && entry.teamStress !== 0) {
                window.GameState.team
                    .filter(m => m.currentAssignment === project.id)
                    .forEach(member => window.adjustMemberMorale(member, entry.teamStress));
                window.recalculateTeamMorale();
            }

            project.progress = Math.min(1, project.hoursCompleted / project.estimatedHours);
            updateProjectSatisfaction(project);
        });
    }

    function generateWeeklyClientFeedback() {
        window.GameState.projects.forEach(project => {
        if (project.status === 'complete') return;
        updateProjectSatisfaction(project);
        const satisfaction = project.satisfaction;
        let message = '';
        let moraleDelta = 0;
        if (satisfaction >= 80) {
            message = `${project.client} loved the latest update!`;
            moraleDelta = 3;
        } else if (satisfaction >= 55) {
            message = `${project.client} says things look fine—keep it up.`;
        } else {
            message = `${project.client} is getting anxious about progress.`;
            moraleDelta = -4;
        }
            window.GameState.conversationHistory.push({
                title: `Client Feedback – ${project.client}`,
                message,
                type: satisfaction >= 80 ? 'success' : (satisfaction < 55 ? 'warning' : 'info'),
                timestamp: `Week ${window.GameState.currentWeek}`
            });
            if (moraleDelta !== 0) {
                window.GameState.team
                    .filter(m => m.currentAssignment === project.id)
                    .forEach(member => window.adjustMemberMorale(member, moraleDelta));
                window.recalculateTeamMorale();
            }
        });
    }

    function cloneClientProfile(profile = window.DEFAULT_CLIENT_PROFILE) {
        return Utils.cloneObject(profile);
    }

    function buildProjectFromTemplate(template = {}, overrides = {}) {
        const profile = cloneClientProfile(template.clientProfile || window.DEFAULT_CLIENT_PROFILE);
    const totalWeeks = overrides.totalWeeks ?? template.totalWeeks ?? 6;
    const oldComplexity = overrides.complexity ?? template.complexity ?? 1;
    
    const estimatedHours = overrides.estimatedHours ?? (oldComplexity * 25);
    const hoursCompleted = overrides.hoursCompleted ?? 0;

    return {
        id: overrides.id || template.id || `proj-${Date.now()}`,
        name: overrides.name || template.name || 'Project',
        client: overrides.client || template.client || 'Client',
        type: overrides.type || template.type || 'custom',
        budget: overrides.budget ?? template.budget ?? 10000,
        totalWeeks,
        weeksRemaining: overrides.weeksRemaining ?? template.totalWeeks ?? totalWeeks,
        estimatedHours,
        originalEstimatedHours: overrides.originalEstimatedHours ?? estimatedHours,
        hoursCompleted,
        description: overrides.description || template.description || '',
        requiredSkills: overrides.requiredSkills || template.requiredSkills || [],
        baseClientSatisfaction: template.baseClientSatisfaction || 0.75,
        progress: overrides.progress ?? (hoursCompleted / estimatedHours),
        status: overrides.status || 'active',
        teamAssigned: overrides.teamAssigned || [],
        satisfaction: overrides.satisfaction ?? Math.round((template.baseClientSatisfaction || 0.75) * 100),
        clientProfile: profile,
        lastResponseHours: 24,
        budgetStatus: 1,
        satisfactionTrend: [],
        risk: {},
        ...overrides
    };
}

    function hydrateProject(project = {}) {
        project.clientProfile = cloneClientProfile(project.clientProfile || window.DEFAULT_CLIENT_PROFILE);
    
    if (project.complexity && !project.estimatedHours) {
        project.estimatedHours = project.complexity * 25;
    }
    if (!project.estimatedHours) {
        project.estimatedHours = 25;
    }
    if (!project.originalEstimatedHours) {
        project.originalEstimatedHours = project.estimatedHours;
    }
    if (project.hoursCompleted === undefined || project.hoursCompleted === null) {
        project.hoursCompleted = project.progress ? project.progress * project.estimatedHours : 0;
    }
    
    project.lastResponseHours = project.lastResponseHours ?? 24;
    project.budgetStatus = project.budgetStatus ?? 1;
    project.satisfaction = project.satisfaction ?? Math.round((project.baseClientSatisfaction || 0.75) * 100);
    project.risk = project.risk || {};
    
    project.progress = Math.min(1, project.hoursCompleted / project.estimatedHours);
    
    updateProjectRisk(project);
    return project;
}

    function updateProjects() {
        window.GameState.projects.forEach(project => {
        if (project.status === 'active' || project.status === 'ok' || project.status === 'warning' || project.status === 'crisis') {
            const assignedMembers = window.GameState.team.filter(m =>
                m.currentAssignment === project.id && !m.isIll
            );

            if (assignedMembers.length === 0) {
                updateProjectSatisfaction(project);
                return;
            }

            let statusMultiplier = 1.0;
            if (project.status === 'crisis') {
                statusMultiplier = 0;
            } else if (project.status === 'warning') {
                statusMultiplier = 0.5;
            }

            const playerProjects = window.GameState.projects.filter(p =>
                p.id !== project.id && window.GameState.team.some(m => m.currentAssignment === p.id && m.id === 'player')
            ).length;
            const playerOnMultipleProjects = playerProjects > 0;

            assignedMembers.forEach(member => {
                if (!member.hours || member.hours <= 0) return;
                
                let hoursToSpend = 0;
                if (member.id === 'player') {
                    const totalPlayerProjects = playerProjects + 1;
                    hoursToSpend = Math.min(member.hours, (member.hours / totalPlayerProjects) * statusMultiplier);
                } else {
                    hoursToSpend = Math.min(member.hours, 6 * statusMultiplier);
                }
                
                if (hoursToSpend > 0) {
                    project.hoursCompleted = (project.hoursCompleted || 0) + hoursToSpend;
                    member.hours = Math.max(0, member.hours - hoursToSpend);
                }
            });

            project.progress = Math.min(1, project.hoursCompleted / project.estimatedHours);

            if (project.progress >= 1.0) {
                project.progress = 1.0;
                completeProject(project.id);
            }

            project.weeksRemaining = Math.max(0, project.weeksRemaining - (1 / 7));

            updateProjectSatisfaction(project);
        }
    });
}

    function checkProjectDeadlines() {
        window.GameState.projects.forEach(project => {
        if (project.status === 'complete') return;

        const status = getProjectStatus(project.id);
        const oldStatus = project.status;
        project.status = status;

            if (oldStatus !== 'crisis' && status === 'crisis') {
                window.GameState.gameStats.deadlinesMissed++;
                window.recordKeyMoment('Project Crisis!', `${project.name} is in crisis`, 'crisis');
            }

            if (project.weeksRemaining < 0 && project.satisfaction < 20 && !project.failureLogged) {
                project.failureLogged = true;
                window.GameState.gameStats.projectsFailed++;
                window.recordKeyMoment('Project Failed', `${project.name} collapsed due to low satisfaction and missed deadline`, 'failure');
            }
        });
    }

    function getProjectStatus(projectId) {
        const project = window.GameState.projects.find(p => p.id === projectId);
    if (!project) return 'active';

    if (project.progress >= 1.0) {
        return 'complete';
    }

    const weeksOverdue = project.weeksRemaining < 0;
    const veryLowSatisfaction = project.satisfaction < 30;

    if (weeksOverdue || veryLowSatisfaction) {
        return 'crisis';
    }

    const approachingDeadline = project.weeksRemaining < 2;
    const lowProgress = project.progress < 0.7;

    if (approachingDeadline && lowProgress) {
        return 'warning';
    }

    return 'ok';
}

    function completeProject(projectId) {
        const project = window.GameState.projects.find(p => p.id === projectId);
        if (!project) return;

        project.status = 'complete';

        const budget = project.budget || 10000;
        const satisfactionMultiplier = project.satisfaction / 100;
        const payment = Math.round(budget * satisfactionMultiplier);
        window.GameState.money += payment;

        if (!window.GameState.portfolio) {
            window.GameState.portfolio = { completedProjects: 0, totalEarnings: 0 };
        }
        window.GameState.portfolio.completedProjects++;
        window.GameState.portfolio.totalEarnings += payment;

        window.GameState.gameStats.projectsCompleted++;
        window.GameState.gameStats.totalSatisfactionPoints += project.satisfaction;
        
        if (project.satisfaction >= 90 && project.weeksRemaining > 0) {
            window.GameState.gameStats.perfectDeliveries++;
            window.recordKeyMoment('Perfect Delivery!', `${project.name} completed with ${project.satisfaction}% satisfaction`, 'success');
        } else if (project.satisfaction >= 80) {
            window.recordKeyMoment('Great Work!', `${project.name} completed successfully`, 'success');
        }

        window.GameState.team.forEach(member => {
            if (member.currentAssignment === projectId) {
                member.currentAssignment = null;
                member.daysOnAssignment = 0;
                if (member.morale) {
                    member.morale.current = Math.min(100, member.morale.current + 5);
                }
            }
        });

        window.celebrateProjectCompletion(project.name);

        window.GameState.conversationHistory.push({
            title: `Project Completed: ${project.name}`,
            message: `You've completed ${project.name} for ${project.client}. Payment received: $${payment.toLocaleString()} (${Math.round(satisfactionMultiplier * 100)}% of budget)`,
            type: 'success',
            timestamp: `Week ${window.GameState.currentWeek}, Day ${window.GameState.currentDay}`
        });

        window.showProjectCompletion(project);

        console.log(`Project ${project.name} completed! Payment: $${payment.toLocaleString()}`);
    }

    function getTeamMemberStatus(memberId) {
        const member = window.GameState.team.find(m => m.id === memberId);
    if (!member) return null;

    const morale = member.morale.current;
    let status = 'neutral';
    let mood = 'neutral';

    if (morale < 25) {
        status = 'burned_out';
        mood = 'burned_out';
    } else if (morale < 50) {
        status = 'stressed';
        mood = 'stressed';
    } else if (morale > 85) {
        status = 'excellent';
        mood = 'happy';
    } else if (morale > 70) {
        mood = 'happy';
    }

    let assignmentClass = member.currentAssignment ? 'working' : 'available';
    let assignmentLabel = member.currentAssignment ? 'Working' : 'Available';
    if (status === 'burned_out') {
        assignmentClass = 'burned';
        assignmentLabel = 'Burned Out';
    } else if (status === 'stressed') {
        assignmentClass = 'stressed';
        assignmentLabel = member.currentAssignment ? 'Stressed on project' : 'Stressed';
    } else if (status === 'excellent') {
        assignmentClass = 'excellent';
        assignmentLabel = 'Thriving';
        } else if (member.currentAssignment) {
            const project = window.GameState.projects.find(p => p.id === member.currentAssignment);
        if (project) {
            assignmentLabel = `On ${project.name}`;
        }
    }

    return {
        member,
        status,
        mood,
        assignment: member.currentAssignment,
        isAvailable: !member.currentAssignment,
        assignmentClass,
        assignmentLabel
    };
}

    function assignTeamMember(memberId, projectId) {
        const member = window.GameState.team.find(m => m.id === memberId);
    if (!member) return false;

    if (member.currentAssignment && member.currentAssignment !== projectId) {
        if (member.id !== 'player') {
            member.currentAssignment = null;
            member.daysOnAssignment = 0;
        }
    }

    if (projectId) {
        member.currentAssignment = projectId;
        if (member.daysOnAssignment === undefined) {
            member.daysOnAssignment = 0;
        }
    } else {
        member.currentAssignment = null;
        member.daysOnAssignment = 0;
    }

        window.GameState.projects.forEach(project => {
            if (project.id === projectId) {
                if (!project.teamAssigned.includes(memberId)) {
                    project.teamAssigned.push(memberId);
                }
            } else {
                project.teamAssigned = project.teamAssigned.filter(id => id !== memberId);
            }
        });

        window.displayGameState();
        window.highlightTeamMemberCard(memberId);
        window.saveState();
        return true;
    }

    function getAvailableTeamMembers() {
        return window.GameState.team.filter(m => !m.currentAssignment || m.id === 'player');
    }

    return {
        checkForIllness,
        showIllnessPopup,
        updateTeamMorale,
        getClientProfile,
        updateProjectRisk,
        calculateSatisfactionScores,
        updateProjectSatisfaction,
        handleScopeCreepRequest,
        generateWeeklyClientFeedback,
        cloneClientProfile,
        buildProjectFromTemplate,
        hydrateProject,
        updateProjects,
        checkProjectDeadlines,
        getProjectStatus,
        completeProject,
        getTeamMemberStatus,
        assignTeamMember,
        getAvailableTeamMembers
    };
})();

// Expose on window for backward compatibility
window.checkForIllness = ProjectsModule.checkForIllness;
window.showIllnessPopup = ProjectsModule.showIllnessPopup;
window.updateTeamMorale = ProjectsModule.updateTeamMorale;
window.getClientProfile = ProjectsModule.getClientProfile;
window.updateProjectRisk = ProjectsModule.updateProjectRisk;
window.calculateSatisfactionScores = ProjectsModule.calculateSatisfactionScores;
window.updateProjectSatisfaction = ProjectsModule.updateProjectSatisfaction;
window.handleScopeCreepRequest = ProjectsModule.handleScopeCreepRequest;
window.generateWeeklyClientFeedback = ProjectsModule.generateWeeklyClientFeedback;
window.cloneClientProfile = ProjectsModule.cloneClientProfile;
window.buildProjectFromTemplate = ProjectsModule.buildProjectFromTemplate;
window.hydrateProject = ProjectsModule.hydrateProject;
window.updateProjects = ProjectsModule.updateProjects;
window.checkProjectDeadlines = ProjectsModule.checkProjectDeadlines;
window.getProjectStatus = ProjectsModule.getProjectStatus;
window.completeProject = ProjectsModule.completeProject;
window.getTeamMemberStatus = ProjectsModule.getTeamMemberStatus;
window.assignTeamMember = ProjectsModule.assignTeamMember;
window.getAvailableTeamMembers = ProjectsModule.getAvailableTeamMembers;

