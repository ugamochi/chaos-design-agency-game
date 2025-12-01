// UI rendering and interactions

const UIModule = (function() {
    'use strict';

    function highlightTeamMemberCard(memberId) {
    const card = document.querySelector(`.team-member-card[data-member-id="${memberId}"]`);
    if (!card) return;
    card.classList.add('assignment-changed');
    setTimeout(() => card.classList.remove('assignment-changed'), 1200);
}

    function showProjectCompletion(project) {
    const projectCard = document.querySelector(`[data-project-id="${project.id}"]`);
    if (projectCard) {
        projectCard.classList.add('project-complete-celebration');
        setTimeout(() => {
            projectCard.classList.remove('project-complete-celebration');
        }, 2000);
    }
}

    function showWeekSummary() {
        const DOM = window.DOM || {};
        const activeProjects = window.GameState.projects.filter(p => p.status !== 'complete');
        const upcomingDeadlines = activeProjects.filter(p => p.weeksRemaining < 2);

        const content = `
            <h2>Week ${window.GameState.currentWeek} Summary</h2>

            <div class="summary-section">
                <h3>Projects Progress</h3>
                <div class="summary-projects">
                    ${activeProjects.map(p => `
                        <div class="summary-project">
                            <strong>${p.name}</strong>
                            <div>Progress: ${Math.round(p.progress * 100)}%</div>
                            <div>Weeks Remaining: ${Math.ceil(p.weeksRemaining)}</div>
                            <div>Status: <span class="status-${p.status}">${p.status.toUpperCase()}</span></div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="summary-section">
                <h3>😊 Team Morale</h3>
                <div class="summary-morale">
                    Average: ${window.GameState.teamMorale}%
                    ${window.GameState.team.filter(m => m.id !== 'player').map(m => `
                        <div>${m.name}: 😊 ${m.morale.current}%</div>
                    `).join('')}
                </div>
            </div>

            ${upcomingDeadlines.length > 0 ? `
                <div class="summary-section warning">
                    <h3>⚠️ Upcoming Deadlines</h3>
                    <ul>
                        ${upcomingDeadlines.map(p => `<li>${p.name} - ${Math.ceil(p.weeksRemaining)} weeks left</li>`).join('')}
                    </ul>
                </div>
            ` : ''}

            <button class="btn-primary btn-continue-week">Continue to Week ${window.GameState.currentWeek}</button>
        `;

        const { overlay, modal } = DOM.createModal ? DOM.createModal(content, 'modal-content week-summary') : createModalFallback(content, 'modal-content week-summary');
        
        const continueBtn = modal.querySelector('.btn-continue-week');
        if (continueBtn) {
            continueBtn.addEventListener('click', () => overlay.remove());
        }

        if (DOM.closeModalOnClick) {
            DOM.closeModalOnClick(overlay, modal);
        } else {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.remove();
            });
        }
    }

    function createModalFallback(content, className) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        const modal = document.createElement('div');
        modal.className = className;
        modal.innerHTML = content;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        return { overlay, modal };
    }

    function displayGameState() {
        const C = window.GameConstants || {};
        const E = C.ELEMENTS || {};
        const DOM = window.DOM || {};
        
        DOM.setTextContent(E.CURRENT_WEEK || 'currentWeek', window.GameState.currentWeek);
        DOM.setTextContent(E.CURRENT_DAY || 'currentDay', window.GameState.currentDay);
        DOM.setTextContent(E.MONEY || 'money', `$${window.GameState.money.toLocaleString()}`);
        DOM.setTextContent(E.TEAM_MORALE || 'teamMorale', `${window.GameState.teamMorale}%`);

        const avgSatisfaction = calculateAverageSatisfaction();
        DOM.setTextContent(E.SATISFACTION || 'satisfaction', avgSatisfaction !== null ? `${Math.round(avgSatisfaction)}%` : '--');

        const player = window.GameState.team.find(m => m.id === 'player');
        const burnout = player ? (player.burnout || 0) : 0;
        const burnoutElement = DOM.getById(E.BURNOUT || 'burnout');
        if (burnoutElement) {
            burnoutElement.textContent = `${Math.round(burnout)}%`;
            const thresholds = C.BURNOUT_WARNING_THRESHOLD || 80;
            if (burnout >= thresholds) {
                DOM.setStyle(burnoutElement, { color: '#ff4444', fontWeight: 'bold' });
            } else if (burnout >= (C.BURNOUT_CHOICE_BLOCK_THRESHOLD || 60)) {
                DOM.setStyle(burnoutElement, { color: '#ff8800' });
            } else if (burnout >= 40) {
                DOM.setStyle(burnoutElement, { color: '#ffaa00' });
            } else {
                DOM.setStyle(burnoutElement, { color: '', fontWeight: '' });
            }
        }
        
        const playerHours = player ? (player.hours ?? 40) : 40;
        const playerHoursElement = DOM.getById(E.PLAYER_HOURS || 'playerHours');
        if (playerHoursElement) {
            const baseHours = 40; // Weekly hours
            if (playerHours < 0) {
                DOM.setTextContent(playerHoursElement, `${playerHours.toFixed(1)}/${baseHours} ⚠️`);
                DOM.setStyle(playerHoursElement, { color: '#ff4444', fontWeight: 'bold' });
            } else if (playerHours <= 10) {
                DOM.setTextContent(playerHoursElement, `${playerHours.toFixed(1)}/${baseHours}`);
                DOM.setStyle(playerHoursElement, { color: '#ff8800' });
            } else {
                DOM.setTextContent(playerHoursElement, `${playerHours.toFixed(1)}/${baseHours}`);
                DOM.setStyle(playerHoursElement, { color: '', fontWeight: '' });
            }
        }

        window.updateClock();
        displayProjects();
        displayTeam();
        if (window.OfficeVisualization && window.OfficeVisualization.update) {
            window.OfficeVisualization.update();
        }
        window.updateNotificationBadge();
        window.checkUnassignedProjectsWarning();
        
        const conversationContainer = document.querySelector('.conversation-container');
        if (window.currentConversation !== null && !conversationContainer) {
            window.currentConversation = null;
            window.selectedChoiceId = null;
        }
        
        if (window.currentConversation === null) {
            window.updateMainContent();
        }
        
    }

    function displayProjects() {
    const container = document.getElementById('projectsContainer');
    container.innerHTML = '';

        if (window.GameState.projects.length === 0) {
            container.innerHTML = '<p style="color: #999; font-style: italic;">No active projects</p>';
            return;
        }

        window.GameState.projects.forEach(project => {
        const projectCard = createProjectCard(project);
        container.appendChild(projectCard);
    });
}

    function createProjectCard(project) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.setAttribute('data-project-id', project.id);

    const progressPercent = Math.round(project.progress * 100);
    const weeksRemaining = Math.ceil(project.weeksRemaining);

        const assignedMembers = window.GameState.team.filter(m => m.currentAssignment === project.id);
    const teamAvatars = assignedMembers.map(m => {
        const initials = m.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        return `<span class="team-avatar" title="${m.name}">${initials}</span>`;
    }).join('');
    const hasTeam = assignedMembers.length > 0;

    if (!hasTeam) {
        card.classList.add('project-no-team');
    }

    let satisfactionEmoji = '😐';
    if (project.satisfaction >= 80) satisfactionEmoji = '😊';
    else if (project.satisfaction >= 60) satisfactionEmoji = '🙂';
    else if (project.satisfaction < 40) satisfactionEmoji = '😟';

    let statusIcon = '✓';
    let progressBarColor = '#4caf50';
    let displayStatus = project.status;
    
    if (project.status === 'complete') {
        statusIcon = '✅';
        displayStatus = 'complete';
        progressBarColor = '#4caf50';
    } else if (!hasTeam) {
        statusIcon = '⏸️';
        displayStatus = 'inactive';
        progressBarColor = '#9e9e9e';
    } else if (project.status === 'warning') {
        statusIcon = '⚠';
        progressBarColor = '#ff9800';
    } else if (project.status === 'crisis') {
        statusIcon = '🚨';
        progressBarColor = '#f44336';
    } else if (project.status === 'ok') {
        statusIcon = '✓';
        progressBarColor = '#1976d2';
    }

    let timeDisplay = '';
    let timelinePercent = 0;
    let timelineColor = '#4caf50';
    
    const totalWeeks = project.totalWeeks || 6;
    const weeksElapsed = totalWeeks - project.weeksRemaining;
    
    if (weeksRemaining < 0) {
        timeDisplay = `OVERDUE: ${Math.abs(weeksRemaining)} weeks`;
        timelinePercent = 100;
        timelineColor = '#f44336';
    } else if (weeksRemaining < 1) {
        const daysRemaining = Math.ceil(project.weeksRemaining * 7);
        timeDisplay = `${daysRemaining} days remaining`;
        timelinePercent = (weeksElapsed / totalWeeks) * 100;
        timelineColor = '#ff9800';
    } else {
        timeDisplay = `${weeksRemaining} weeks remaining`;
        timelinePercent = (weeksElapsed / totalWeeks) * 100;
        
        if (weeksRemaining < 2) {
            timelineColor = '#ff9800';
        } else if (weeksRemaining < 4) {
            timelineColor = '#2196f3';
        } else {
            timelineColor = '#4caf50';
        }
    }

    // Phase display logic
    let phasesHTML = '';
    if (project.phases) {
        const phaseNames = ['management', 'design', 'development', 'review'];
        const phaseLabels = { management: 'Management', design: 'Design', development: 'Development', review: 'Review' };
        const phaseIcons = { management: '📋', design: '🎨', development: '💻', review: '✅' };
        
        let phasesContent = '';
        phaseNames.forEach(phaseName => {
            const phase = project.phases[phaseName];
            if (!phase) return;
            
            const phaseProgress = Math.round(phase.progress * 100);
            const phaseStatus = window.getPhaseStatus ? window.getPhaseStatus(project, phaseName) : (phase.status || 'waiting');
            
            // Get assigned team members for this phase
            const phaseAssignedMembers = (phase.teamAssigned || [])
                .map(id => window.GameState.team.find(m => m.id === id))
                .filter(Boolean);
            
            // Create avatars for phase team (same format as project team)
            const phaseTeamAvatars = phaseAssignedMembers.map(m => {
                const initials = m.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                return `<span class="team-avatar phase-team-avatar" title="${m.name}">${initials}</span>`;
            }).join('');
            const phaseHasTeam = phaseAssignedMembers.length > 0;
            
            let phaseStatusIcon = '⏸️';
            let phaseStatusClass = 'waiting';
            let phaseBarColor = '#9e9e9e';
            
            if (phaseStatus === 'complete') {
                phaseStatusIcon = '✓';
                phaseStatusClass = 'complete';
                phaseBarColor = '#4caf50';
            } else if (phaseStatus === 'active') {
                phaseStatusIcon = '▶️';
                phaseStatusClass = 'active';
                phaseBarColor = '#1976d2';
            } else if (phaseStatus === 'ready') {
                phaseStatusIcon = '⏳';
                phaseStatusClass = 'ready';
                phaseBarColor = '#ff9800';
            }
            
            const hasFreelancer = phase.freelancerHired ? ' <span class="freelancer-badge">👤 Freelancer</span>' : '';
            
            phasesContent += `
                <div class="phase-item phase-${phaseStatusClass}">
                    <div class="phase-header">
                        <span class="phase-icon">${phaseIcons[phaseName]}</span>
                        <span class="phase-name">${phaseLabels[phaseName]}</span>
                        <span class="phase-status-icon">${phaseStatusIcon}</span>
                        <span class="phase-progress-text">${phaseProgress}%</span>
                        ${hasFreelancer}
                    </div>
                    <div class="phase-progress-bar">
                        <div class="phase-progress-fill" style="width: ${phaseProgress}%; background: ${phaseBarColor};"></div>
                    </div>
                    <div class="phase-team">
                        <div class="team-avatars ${phaseHasTeam ? '' : 'empty-team'}">
                            ${phaseHasTeam ? phaseTeamAvatars : (phaseStatus === 'complete' ? '<span class="no-team-warning">Completed</span>' : '<span class="no-team-warning">No team</span>')}
                        </div>
                    </div>
                </div>
            `;
        });
        phasesHTML = `
            <div class="phases-wrapper">
                <button class="phases-toggle-btn expanded" data-project-id="${project.id}">
                    <span class="phases-toggle-icon">▼</span>
                    <span>Phases</span>
                </button>
                <div class="project-phases-collapsible">
                    <div class="project-phases">
                        ${phasesContent}
                    </div>
                </div>
            </div>
        `;
    }

    card.innerHTML = `
        <div class="project-header">
            <div class="project-title">
                <span class="status-icon status-${project.status}">${statusIcon}</span>
                <div>
                    <div class="project-name">${project.name}</div>
                    <div class="project-client">${project.client}</div>
                </div>
            </div>
            <div class="project-meta">
                <span class="budget">💰 $${(project.budget || 0).toLocaleString()}</span>
                <span class="satisfaction">${satisfactionEmoji} ${project.satisfaction}%</span>
            </div>
        </div>
        <div class="project-progress-bar">
            <div class="project-progress-fill" style="width: ${progressPercent}%; background: ${progressBarColor};">
                <span>${progressPercent}%</span>
            </div>
        </div>
        ${phasesHTML}
        <div class="project-timeline-section">
            <div class="timeline-header">
                <span>${timeDisplay}</span>
                <span class="project-status ${displayStatus}">${displayStatus.toUpperCase()}</span>
            </div>
            <div class="timeline-bar">
                <div class="timeline-fill" style="width: ${Math.min(timelinePercent, 100)}%; background: ${timelineColor};"></div>
            </div>
        </div>
        <div class="project-details">
            <div class="detail-item">
                <label>Estimated Hours</label>
                <span>${Math.round(project.estimatedHours || 25)}h</span>
            </div>
            <div class="detail-item">
                <label>Hours Completed</label>
                <span>${Math.round(project.hoursCompleted || 0)}h / ${Math.round(project.estimatedHours || 25)}h</span>
            </div>
            <div class="detail-item">
                <label>Risk</label>
                <span>${project.risk?.scopeLabel || 'On estimate'}</span>
            </div>
        </div>
        <div class="project-team">
            <label>Team</label>
            <div class="team-avatars ${hasTeam ? '' : 'empty-team'}">
                ${hasTeam ? teamAvatars : (project.status === 'complete' ? '<span class="no-team-warning">Completed</span>' : '<span class="no-team-warning">Assign team →</span>')}
            </div>
        </div>
        ${project.phases ? '<button class="btn btn-secondary btn-small assign-phase-btn" data-project-id="' + project.id + '">Assign to Phases</button>' : ''}
    `;

    if (!hasTeam && project.status !== 'complete') {
        card.classList.add('no-assignment-warning');
        card.classList.add('pulse-warning');
        const warning = document.createElement('div');
        warning.className = 'no-assignment-message assign-phase-warning';
        warning.innerHTML = `
            <span class="warning-icon-small">⚠️</span>
            <strong>NO TEAM ASSIGNED</strong> - This project won't progress!
            <br>
            <span class="warning-hint">Click here to auto-assign available workers</span>
        `;
        card.appendChild(warning);
    }

    return card;
}

    function displayTeam() {
    const container = document.getElementById('teamContainer');
    container.innerHTML = '';

        if (window.GameState.team.length === 0) {
            container.innerHTML = '<p style="color: #999; font-style: italic;">No team members available</p>';
            return;
        }

        window.GameState.team.forEach(member => {
            const status = window.getTeamMemberStatus(member.id);
            const memberCard = createTeamMemberCard(member, status);
            container.appendChild(memberCard);
        });
}

    function createTeamMemberCard(member, status) {
        const card = document.createElement('div');
        card.className = `team-member-card ${status.assignmentClass}`;
        card.setAttribute('data-member-id', member.id);

        const characteristics = member.characteristics || {};
        const traits = [];
        if (characteristics.doesNotLoseMorale) traits.push('🛡️ Stable morale');
        if (characteristics.canWorkWeekends) traits.push('📅 Weekend worker');
        if (characteristics.oftenGetsIll) traits.push('🤒 Prone to illness');
        if (characteristics.workSpeedMultiplier && characteristics.workSpeedMultiplier !== 1.0) {
            const speed = Math.round(characteristics.workSpeedMultiplier * 100);
            traits.push(speed > 100 ? `⚡ ${speed}% speed` : `🐌 ${speed}% speed`);
        }
        if (characteristics.qualityMultiplier && characteristics.qualityMultiplier !== 1.0) {
            const quality = Math.round(characteristics.qualityMultiplier * 100);
            traits.push(quality > 100 ? `✨ ${quality}% quality` : `📉 ${quality}% quality`);
        }

        const bio = member.bio || '';
        const showBio = bio.length > 0;

        card.innerHTML = `
            <div class="team-member-header">
                <div class="team-member-avatar">${member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}</div>
                <div class="team-member-info">
                    <div class="team-member-name">${member.name}</div>
                    <div class="team-member-role">${member.role}</div>
                    <div class="team-member-status ${status.assignmentClass}">
                        <span class="status-dot"></span>
                        <span>${status.assignmentLabel}${member.isIll ? ' (Ill)' : ''}</span>
                    </div>
                </div>
            </div>
            ${showBio ? `
                <div class="team-member-bio">
                    <p>${bio}</p>
                </div>
            ` : ''}
            ${traits.length > 0 ? `
                <div class="team-member-traits">
                    ${traits.map(trait => `<span class="trait-badge">${trait}</span>`).join('')}
                </div>
            ` : ''}
            <div class="team-member-stats">
                <div class="team-member-skill">
                    <strong>🎯 Skill:</strong>
                    <span>${member.skill}/5</span>
                </div>
                <div class="team-member-morale">
                    <strong>😊 Morale:</strong>
                    <span>${member.morale && typeof member.morale.current === 'number' ? member.morale.current : 0}%</span>
                </div>
                <div class="team-member-hours">
                    <strong>⏰ Hours:</strong>
                    <span class="${member.hours !== undefined && member.hours !== null && member.hours <= 10 && member.hours >= 0 ? 'hours-low' : ''} ${member.hours !== undefined && member.hours !== null && member.hours < 0 ? 'hours-overtime' : ''}">${(member.hours !== undefined && member.hours !== null ? member.hours : 40).toFixed(1)}/40</span>
                    ${(member.hours !== undefined && member.hours !== null && member.hours < 0) || (member.hoursWorkedThisWeek && member.hoursWorkedThisWeek > 40) ? `<span class="overtime-indicator" title="Overtime: ${member.hours !== undefined && member.hours !== null && member.hours < 0 ? Math.abs(member.hours).toFixed(1) : (member.hoursWorkedThisWeek - 40).toFixed(1)}h">⚠️</span>` : ''}
                </div>
            </div>
            <div class="team-member-actions">
                <button class="btn btn-small assign-btn" data-member-id="${member.id}">
                    ${status.isAvailable ? 'Assign to Project' : 'Reassign'}
                </button>
            </div>
        `;

    card.querySelector('.assign-btn').addEventListener('click', () => {
        showAssignmentModal(member.id);
    });

    return card;
}

    function showAssignmentModal(memberId) {
        const member = window.GameState.team.find(m => m.id === memberId);
        if (!member) return;

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';

        const activeProjects = window.GameState.projects.filter(p => p.status !== 'complete');

    modal.innerHTML = `
        <div class="modal-content assignment-modal">
            <h3>Assign ${member.name}</h3>
            <div class="assignment-options">
                ${activeProjects.map(project => `
                    <button class="assignment-option" data-project-id="${project.id}">
                        <div class="project-name">${project.name}</div>
                        <div class="project-status">
                            <span>${Math.round(project.progress * 100)}% complete</span>
                            <span>${Math.ceil(project.weeksRemaining)} weeks left</span>
                        </div>
                    </button>
                `).join('')}
            </div>
            <button class="btn btn-secondary btn-cancel">Cancel</button>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelectorAll('.assignment-option').forEach(option => {
        option.addEventListener('click', () => {
            const projectId = option.getAttribute('data-project-id');
            window.assignTeamMember(memberId, projectId);
            modal.remove();
        });
    });

    modal.querySelector('.btn-cancel').addEventListener('click', () => modal.remove());

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

    function calculateAverageSatisfaction() {
        if (window.GameState.projects.length === 0) return null;

        const totalSatisfaction = window.GameState.projects.reduce((sum, project) => {
            return sum + project.satisfaction;
        }, 0);

        return totalSatisfaction / window.GameState.projects.length;
}

    function updateMainContent() {
    const conversationContainer = document.querySelector('.conversation-container');
    
    if (window.currentConversation !== null && !conversationContainer) {
        window.currentConversation = null;
        window.selectedChoiceId = null;
    }

    if (window.currentConversation !== null) {
        return;
    }

    const contentArea = document.getElementById('contentArea');
    const activityFeed = document.getElementById('activityFeed');
    if (activityFeed) {
            const recentEvents = window.GameState.conversationHistory.slice(-5).reverse();
        if (recentEvents.length > 0) {
            activityFeed.innerHTML = recentEvents.map(event => {
                const eventClass = event.type || 'info';
                return `
                    <div class="activity-item ${eventClass}">
                        <strong>${event.title || 'Event'}</strong>
                        <p>${event.message || ''}</p>
                        <small>${event.timestamp || ''}</small>
                    </div>
                `;
            }).join('');
        } else {
            activityFeed.innerHTML = '<p class="welcome-message">No recent activity.</p>';
        }
    }

    if (!contentArea.querySelector('.conversation-container') && !contentArea.querySelector('.consequence-feedback')) {
        const existingWelcome = contentArea.querySelector('.welcome-message');
        if (!existingWelcome) {
            contentArea.innerHTML = '<p class="welcome-message">Welcome to Agency Chaos Simulator! Click "Advance Day" to start.</p>';
        }
    }
}

    function filterChoicesByBurnout(choices, burnout) {
        if (!choices || !Array.isArray(choices) || choices.length === 0) {
            return [];
        }

        if (burnout < 40) {
            return choices;
        }

        if (burnout >= 80) {
            const filteredChoices = choices.filter(choice => {
                const cons = choice.consequences || {};
                const hasLargePositiveMorale = cons.teamMorale && (
                    (typeof cons.teamMorale === 'number' && cons.teamMorale > 5) ||
                    (typeof cons.teamMorale === 'object' && (cons.teamMorale.delta || cons.teamMorale.amount || 0) > 5)
                );
                const hasLargePositiveMoney = cons.money && cons.money > 500;
                return !hasLargePositiveMorale && !hasLargePositiveMoney;
            });
            return filteredChoices.length > 0 ? filteredChoices : [choices[0]];
        }

        if (burnout >= 60) {
            const filteredChoices = choices.filter(choice => {
                const cons = choice.consequences || {};
                const hasVeryLargePositiveMorale = cons.teamMorale && (
                    (typeof cons.teamMorale === 'number' && cons.teamMorale > 10) ||
                    (typeof cons.teamMorale === 'object' && (cons.teamMorale.delta || cons.teamMorale.amount || 0) > 10)
                );
                const hasVeryLargePositiveMoney = cons.money && cons.money > 1000;
                return !hasVeryLargePositiveMorale && !hasVeryLargePositiveMoney;
            });
            return filteredChoices.length > 0 ? filteredChoices : [choices[0]];
        }

        return choices.filter(choice => {
            const cons = choice.consequences || {};
            const hasExtremePositiveMorale = cons.teamMorale && (
                (typeof cons.teamMorale === 'number' && cons.teamMorale > 15) ||
                (typeof cons.teamMorale === 'object' && (cons.teamMorale.delta || cons.teamMorale.amount || 0) > 15)
            );
            return !hasExtremePositiveMorale;
        });
    }

    function displayConversation(conversation) {
        window.currentConversation = conversation;
        window.selectedChoiceId = null;
        window.currentConversationStartTime = Date.now();
        window.currentConversationMeta = {
            linkedProjectId: conversation.linkedProjectId,
            responseDeadlineHours: conversation.responseDeadlineHours
        };
    
        // Update game state but don't update main content (we'll set conversation HTML next)
        
        // Update other UI elements without touching contentArea
        document.getElementById('currentWeek').textContent = window.GameState.currentWeek;
        document.getElementById('currentDay').textContent = window.GameState.currentDay;
        document.getElementById('money').textContent = `$${window.GameState.money.toLocaleString()}`;
        document.getElementById('teamMorale').textContent = `${window.GameState.teamMorale}%`;
        const avgSatisfaction = calculateAverageSatisfaction();
        document.getElementById('satisfaction').textContent = avgSatisfaction !== null ? `${Math.round(avgSatisfaction)}%` : '--';
        window.updateClock();
        displayProjects();
        displayTeam();
        window.updateNotificationBadge();
        window.checkUnassignedProjectsWarning();

    const player = window.GameState.team.find(m => m.id === 'player');
    const playerBurnout = player ? (player.burnout || 0) : 0;
    const availableChoices = filterChoicesByBurnout(conversation.choices, playerBurnout);
    
    const contentArea = document.getElementById('contentArea');
    const choicesHtml = availableChoices.map(choice => `
        <button class="choice-btn" data-choice-id="${choice.id}">
            <div class="choice-text">${choice.text}</div>
            <div class="consequence-hint">${window.formatConsequences(choice.consequences)}</div>
        </button>
    `).join('');
    
    const burnoutWarning = playerBurnout >= 60 ? `
        <div class="burnout-warning">
            ⚠️ High burnout (${Math.round(playerBurnout)}%) - Some options are unavailable. Rest to recover.
        </div>
    ` : '';

    contentArea.innerHTML = `
        <div class="conversation-container urgency-${conversation.urgency}">
            <div class="conversation-header">
                <div class="conversation-from">${conversation.from || 'Client'}</div>
                <div class="conversation-subject">${conversation.subject || 'Message'}</div>
                ${conversation.responseDeadlineHours ? `<div class="response-timer">Reply within ${conversation.responseDeadlineHours}h</div>` : ''}
            </div>
            <div class="conversation-body">${conversation.body}</div>
            ${burnoutWarning}
            <div class="conversation-choices">${choicesHtml}</div>
            <div class="conversation-actions">
                <button class="btn btn-secondary remind-btn">Remind me later</button>
                <button class="btn btn-primary send-response-btn" disabled>Send Response</button>
            </div>
        </div>
    `;

        contentArea.querySelectorAll('.choice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const choiceId = btn.getAttribute('data-choice-id');
                if (choiceId && window.handleChoice) {
                    window.handleChoice(conversation.id, choiceId);
                } else {
                    console.error('Choice button clicked but handleChoice not available or no choice ID', { choiceId, handleChoice: window.handleChoice });
                }
            });
        });

        const sendBtn = contentArea.querySelector('.send-response-btn');
        if (sendBtn) {
            sendBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const btn = e.target.closest('.send-response-btn');
                if (btn && !btn.disabled) {
                    btn.disabled = true;
                    window.submitConversationChoice();
                }
            });
        }

    const remindBtn = contentArea.querySelector('.remind-btn');
    if (remindBtn) {
        remindBtn.addEventListener('click', () => {
            const conversationContainer = contentArea.querySelector('.conversation-container');
            
            if (conversationContainer) {
                conversationContainer.classList.add('slide-out-right');
            }
            
            window.showSuccessToast('📌 Conversation postponed - I\'ll remind you later today', 2500);
            
            setTimeout(() => {
                window.deferConversation(conversation.id);
                window.currentConversation = null;
                window.selectedChoiceId = null;
                window.displayGameState();
                window.checkForConversations();
            }, 300);
        });
    }
}

    function showConsequenceFeedback(flavorText, consequences) {
    const contentArea = document.getElementById('contentArea');
    
    const existingFeedback = contentArea.querySelector('.consequence-feedback');
    if (existingFeedback) {
        existingFeedback.remove();
    }
    
    const feedback = document.createElement('div');
    feedback.className = 'consequence-feedback';
    feedback.id = 'currentConsequenceFeedback';
        const summary = window.formatConsequences(consequences);
    feedback.innerHTML = `
        <p class="feedback-flavor"><strong>${flavorText || 'Decision logged.'}</strong></p>
        <div class="feedback-consequences">${summary}</div>
        <div class="feedback-hint">
            <small>💡 Click "Advance Day" to continue</small>
        </div>
    `;
    contentArea.appendChild(feedback);
}

    function animateResourceChange(resourceId, oldValue, newValue) {
    const element = document.getElementById(resourceId);
    if (!element) return;

    const diff = newValue - oldValue;
    if (diff === 0) return;

    element.classList.add('resource-changing');

    const changeOverlay = document.createElement('span');
    changeOverlay.className = `resource-change ${diff > 0 ? 'positive' : 'negative'}`;
    changeOverlay.textContent = diff > 0 ? `+${diff}` : `${diff}`;
    element.parentElement.appendChild(changeOverlay);

    setTimeout(() => {
        changeOverlay.classList.add('fade-out');
        setTimeout(() => changeOverlay.remove(), 500);
        element.classList.remove('resource-changing');
    }, 1500);
}

    function highlightProject(projectId) {
    const projectCards = document.querySelectorAll('.project-card');
    projectCards.forEach(card => {
        const nameEl = card.querySelector('.project-name');
        const project = window.GameState.projects.find(p => p.id === projectId);
        if (project && nameEl && nameEl.textContent === project.name) {
            card.classList.add('project-highlight');
            setTimeout(() => {
                card.classList.remove('project-highlight');
            }, 2000);
        }
    });
}

    function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        const count = window.GameState.conversationQueue.length;
        badge.textContent = count > 0 ? `${count} notification${count !== 1 ? 's' : ''}` : '0 notifications';
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

    function checkUnassignedProjectsWarning() {
        const activeProjects = window.GameState.projects.filter(p => p.status !== 'complete');
        const unassignedProjects = activeProjects.filter(p => {
            const assignedMembers = window.GameState.team.filter(m => m.currentAssignment === p.id);
            return assignedMembers.length === 0;
        });

        let warningBanner = document.getElementById('unassignedProjectsWarning');
        
        if (unassignedProjects.length > 0 && !window.GameState.gameOver) {
        if (!warningBanner) {
            warningBanner = document.createElement('div');
            warningBanner.id = 'unassignedProjectsWarning';
            warningBanner.className = 'unassigned-warning-banner';
            
            const header = document.querySelector('.header');
            header.parentNode.insertBefore(warningBanner, header.nextSibling);
        }
        
        const projectNames = unassignedProjects.map(p => p.name).join(', ');
        warningBanner.innerHTML = `
            <div class="warning-icon">⚠️</div>
            <div class="warning-content">
                <strong>Action Required!</strong>
                ${unassignedProjects.length} project${unassignedProjects.length > 1 ? 's' : ''} ha${unassignedProjects.length > 1 ? 've' : 's'} no team assigned: <em>${projectNames}</em>
                <br>
                <span class="warning-subtext">Projects won't make progress until you assign team members. Click on team member cards below to assign them.</span>
            </div>
            <button class="warning-dismiss" onclick="this.parentElement.style.display='none'">×</button>
        `;
    } else if (warningBanner) {
        warningBanner.remove();
    }
}

    function showResetConfirmModal() {
        const DOM = window.DOM || {};
        const C = window.GameConstants || {};
        const STORAGE = C.STORAGE_KEYS || {};
        
        const modal = DOM.getById ? DOM.getById('resetModal') : document.getElementById('resetModal');
        if (!modal) return;

        DOM.setStyle ? DOM.setStyle(modal, { display: 'flex' }) : (modal.style.display = 'flex');

        const confirmBtn = DOM.getById ? DOM.getById('resetConfirmBtn') : document.getElementById('resetConfirmBtn');
        const cancelBtn = DOM.getById ? DOM.getById('resetCancelBtn') : document.getElementById('resetCancelBtn');

        const closeModal = () => {
            DOM.setStyle ? DOM.setStyle(modal, { display: 'none' }) : (modal.style.display = 'none');
        };

        if (confirmBtn) {
            confirmBtn.onclick = () => {
                localStorage.removeItem(STORAGE.GAME_STATE || 'agencyChaosState');
                localStorage.removeItem(STORAGE.TUTORIAL || 'agencyChaosTutorial');
                location.reload();
            };
        }

        if (cancelBtn) {
            cancelBtn.onclick = closeModal;
        }
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        }, { once: true });
    }

    function viewSummary() {
    const summary = `
=== AGENCY CHAOS SIMULATOR SUMMARY ===
Week: ${window.GameState.currentWeek} | Day: ${window.GameState.currentDay}
Money: $${window.GameState.money.toLocaleString()}
Team Morale: ${window.GameState.teamMorale}
Average Client Satisfaction: ${calculateAverageSatisfaction() !== null ? Math.round(calculateAverageSatisfaction()) + '%' : 'N/A'}

Active Projects: ${window.GameState.projects.filter(p => p.status !== 'complete').length}
Completed Projects: ${window.GameState.projects.filter(p => p.status === 'complete').length}

Team Members: ${window.GameState.team.length}
Pending Conversations: ${window.GameState.conversationQueue.length}
Conversation History: ${window.GameState.conversationHistory.length}
    `;

    alert(summary);
    console.log(summary);
}

    function showEndGameScreen(endReason, victoryPath, score, rank, message) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay end-game-modal';
    
    const isVictory = endReason === 'victory';
    const pathClass = isVictory ? `victory-${victoryPath}` : 'defeat';
    
        const stats = window.GameState.gameStats;
        const avgSatisfaction = stats.projectsCompleted > 0 
            ? Math.round(stats.totalSatisfactionPoints / stats.projectsCompleted) 
            : 0;

        const keyMomentsHtml = window.GameState.keyMoments.slice(-10).map(moment => `
        <div class="key-moment ${moment.type}">
            <span class="moment-week">Week ${moment.week}.${moment.day}</span>
            <span class="moment-title">${moment.title}</span>
            <span class="moment-desc">${moment.description}</span>
        </div>
    `).join('');

    modal.innerHTML = `
        <div class="modal-content end-game-content ${pathClass}">
            <div class="end-game-header">
                <h1>${isVictory ? '🎉 Game Complete!' : '💔 Game Over'}</h1>
                <h2 class="rank-title">${rank}</h2>
            </div>

            <div class="end-game-message">
                <p>${message}</p>
            </div>

            <div class="end-game-stats">
                <div class="stat-section">
                    <h3>Final Stats</h3>
                    <div class="stat-grid">
                        <div class="stat-item">
                            <span class="stat-label">Weeks Survived</span>
                            <span class="stat-value">${window.GameState.currentWeek}/12</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">💰 Final Money</span>
                            <span class="stat-value ${window.GameState.money >= 0 ? 'positive' : 'negative'}">$${window.GameState.money.toLocaleString()}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">📦 Projects Completed</span>
                            <span class="stat-value">${stats.projectsCompleted}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">⭐ Avg Satisfaction</span>
                            <span class="stat-value">${avgSatisfaction}%</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">😊 Team Morale</span>
                            <span class="stat-value">${window.GameState.teamMorale}%</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Perfect Deliveries</span>
                            <span class="stat-value">${stats.perfectDeliveries}</span>
                        </div>
                    </div>
                </div>

                <div class="stat-section">
                    <h3>Performance Breakdown</h3>
                    <div class="stat-grid">
                        <div class="stat-item ${stats.projectsFailed > 0 ? 'negative' : ''}">
                            <span class="stat-label">Projects Failed</span>
                            <span class="stat-value">${stats.projectsFailed}</span>
                        </div>
                        <div class="stat-item ${stats.deadlinesMissed > 0 ? 'negative' : ''}">
                            <span class="stat-label">Deadlines Missed</span>
                            <span class="stat-value">${stats.deadlinesMissed}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Scope Creep Handled</span>
                            <span class="stat-value">${stats.scopeCreepHandled}</span>
                        </div>
                        <div class="stat-item ${stats.teamMemberQuits > 0 ? 'negative' : ''}">
                            <span class="stat-label">Team Quits</span>
                            <span class="stat-value">${stats.teamMemberQuits}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">😊 Highest Morale</span>
                            <span class="stat-value">${stats.highestMorale}%</span>
                        </div>
                        <div class="stat-item ${stats.lowestMorale < 30 ? 'negative' : ''}">
                            <span class="stat-label">😊 Lowest Morale</span>
                            <span class="stat-value">${stats.lowestMorale}%</span>
                        </div>
                    </div>
                </div>

                <div class="stat-section score-section">
                    <h3>Final Score</h3>
                    <div class="final-score">${score.toLocaleString()}</div>
                </div>

                ${window.GameState.keyMoments.length > 0 ? `
                    <div class="stat-section key-moments-section">
                        <h3>Key Moments</h3>
                        <div class="key-moments-list">
                            ${keyMomentsHtml}
                        </div>
                    </div>
                ` : ''}
            </div>

            <div class="end-game-actions">
                <button class="btn btn-primary btn-play-again">Play Again</button>
                <button class="btn btn-secondary btn-share-score">Copy Score to Clipboard</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.btn-play-again').addEventListener('click', () => {
        localStorage.removeItem('agencyChaosState');
        location.reload();
    });

    modal.querySelector('.btn-share-score').addEventListener('click', () => {
            const shareText = `Agency Chaos Simulator - ${rank}\nScore: ${score.toLocaleString()}\nProjects: ${stats.projectsCompleted} | Money: $${window.GameState.money.toLocaleString()} | Satisfaction: ${avgSatisfaction}%`;
        
        navigator.clipboard.writeText(shareText).then(() => {
            const btn = modal.querySelector('.btn-share-score');
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        }).catch(() => {
            alert(shareText);
        });
    });
}

    function attachButtonListener(buttonId, handler, errorMsg) {
        const DOM = window.DOM || {};
        const Logger = window.Logger || console;
        const button = DOM.getById ? DOM.getById(buttonId) : document.getElementById(buttonId);
        
        if (!button) {
            Logger.error(`${buttonId} not found`);
            return false;
        }
        
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            try {
                handler();
            } catch (error) {
                Logger.error(errorMsg || `Error in ${buttonId}:`, error);
            }
        });
        return true;
    }

    function setupEventListeners() {
        const Logger = window.Logger || console;
        

        attachButtonListener('autoAssignBtn', () => {
            const headerMenuDropdown = document.getElementById('headerMenuDropdown');
            if (headerMenuDropdown) headerMenuDropdown.style.display = 'none';
            if (window.autoAssignAvailableWorkers) {
                window.autoAssignAvailableWorkers();
            } else {
                Logger.error('window.autoAssignAvailableWorkers is not defined');
            }
        }, 'Error in autoAssignAvailableWorkers');

        attachButtonListener('callInSickBtn', () => {
            const headerMenuDropdown = document.getElementById('headerMenuDropdown');
            if (headerMenuDropdown) headerMenuDropdown.style.display = 'none';
            if (window.callInSick) {
                window.callInSick();
            } else {
                Logger.error('window.callInSick is not defined');
            }
        }, 'Error in callInSick');

        attachButtonListener('viewSummaryBtn', () => {
            const headerMenuDropdown = document.getElementById('headerMenuDropdown');
            if (headerMenuDropdown) headerMenuDropdown.style.display = 'none';
            viewSummary();
        }, 'Error in viewSummary');

        attachButtonListener('testBtn', () => {
            const Logger = window.Logger || console;
            Logger.log('Current Game State:', JSON.stringify(window.GameState, null, 2));
            Logger.log('Projects:', window.GameState.projects);
            Logger.log('Week:', window.GameState.currentWeek, 'Day:', window.GameState.currentDay);
        }, 'Error in testBtn');

        attachButtonListener('resetBtn', () => {
            const headerMenuDropdown = document.getElementById('headerMenuDropdown');
            if (headerMenuDropdown) headerMenuDropdown.style.display = 'none';
            showResetConfirmModal();
        }, 'Error in showResetConfirmModal');

        const DOM = window.DOM || {};
        const projectsContainer = DOM.getById ? DOM.getById('projectsContainer') : document.getElementById('projectsContainer');
        if (projectsContainer) {
            projectsContainer.addEventListener('click', (e) => {
                if (e.target.classList.contains('assign-phase-btn') || e.target.closest('.assign-phase-btn')) {
                    const btn = e.target.classList.contains('assign-phase-btn') ? e.target : e.target.closest('.assign-phase-btn');
                    const projectId = btn.getAttribute('data-project-id');
                    if (projectId) {
                        showPhaseAssignmentModal(projectId);
                    }
                } else if (e.target.classList.contains('assign-phase-warning') || e.target.closest('.assign-phase-warning')) {
                    if (window.autoAssignAvailableWorkers) {
                        window.autoAssignAvailableWorkers();
                    } else {
                        Logger.error('window.autoAssignAvailableWorkers is not defined');
                    }
                } else if (e.target.classList.contains('phases-toggle-btn') || e.target.closest('.phases-toggle-btn')) {
                    const btn = e.target.classList.contains('phases-toggle-btn') ? e.target : e.target.closest('.phases-toggle-btn');
                    const projectId = btn.getAttribute('data-project-id');
                    const phasesContainer = btn.nextElementSibling;
                    if (phasesContainer && phasesContainer.classList.contains('project-phases-collapsible')) {
                        const computedDisplay = window.getComputedStyle(phasesContainer).display;
                        const isExpanded = computedDisplay !== 'none';
                        phasesContainer.style.display = isExpanded ? 'none' : 'block';
                        btn.classList.toggle('expanded', !isExpanded);
                    }
                }
            });
        }

        attachButtonListener('settingsBtn', () => {
            if (window.showSettingsModal) {
                window.showSettingsModal();
            } else {
                showSettingsModal();
            }
        }, 'Error in showSettingsModal');
        
        attachButtonListener('closeSettingsBtn', () => {
            if (window.hideSettingsModal) {
                window.hideSettingsModal();
            } else {
                hideSettingsModal();
            }
        }, 'Error in hideSettingsModal');
        
        const toggleResourcesBtn = document.getElementById('toggleResourcesBtn');
        if (toggleResourcesBtn) {
            toggleResourcesBtn.type = 'button';
            toggleResourcesBtn.style.cursor = 'pointer';
            toggleResourcesBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                console.log('Resource toggle clicked');
                const extraResources = document.querySelectorAll('.resource-item-extra');
                if (extraResources.length === 0) {
                    console.warn('No extra resources found');
                    return;
                }
                const firstItem = extraResources[0];
                const currentDisplay = window.getComputedStyle(firstItem).display;
                const isExpanded = currentDisplay !== 'none';
                console.log('Current display:', currentDisplay, 'isExpanded:', isExpanded);
                
                extraResources.forEach(item => {
                    item.style.display = isExpanded ? 'none' : 'flex';
                });
                toggleResourcesBtn.textContent = isExpanded ? '▼' : '▲';
                toggleResourcesBtn.classList.toggle('expanded', !isExpanded);
            });
        } else {
            console.warn('toggleResourcesBtn not found');
        }
        
        const headerMenuBtn = document.getElementById('headerMenuBtn');
        const headerMenuDropdown = document.getElementById('headerMenuDropdown');
        if (headerMenuBtn && headerMenuDropdown) {
            headerMenuBtn.type = 'button';
            headerMenuBtn.style.cursor = 'pointer';
            headerMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                console.log('Menu button clicked');
                const currentDisplay = window.getComputedStyle(headerMenuDropdown).display;
                const isVisible = currentDisplay !== 'none';
                console.log('Current dropdown display:', currentDisplay, 'isVisible:', isVisible);
                headerMenuDropdown.style.display = isVisible ? 'none' : 'flex';
            });
            
            document.addEventListener('click', (e) => {
                if (headerMenuBtn && headerMenuDropdown && 
                    !headerMenuBtn.contains(e.target) && 
                    !headerMenuDropdown.contains(e.target)) {
                    headerMenuDropdown.style.display = 'none';
                }
            });
        } else {
            console.warn('headerMenuBtn or headerMenuDropdown not found', { headerMenuBtn, headerMenuDropdown });
        }
        
        attachButtonListener('helpBtn', () => {
            hideSettingsModal();
            showHelpModal();
        });
        
        attachButtonListener('closeHelpBtn', hideHelpModal);
        
        attachButtonListener('creditsBtn', () => {
            hideSettingsModal();
            showCreditsModal();
        });
        
        attachButtonListener('closeCreditsBtn', hideCreditsModal);
        
        attachButtonListener('highScoresBtn', () => {
            hideSettingsModal();
            showHighScoresModal();
        });
        
        attachButtonListener('restartGameBtn', () => {
            hideSettingsModal();
            showResetConfirmModal();
        });

        const tutorialToggle = DOM.getById ? DOM.getById('tutorialToggle') : document.getElementById('tutorialToggle');
        if (tutorialToggle) {
            tutorialToggle.checked = window.tutorialState.enabled;
            tutorialToggle.addEventListener('change', (e) => {
                window.TutorialModule.setTutorialEnabled(e.target.checked);
            });
        }

        if (window.initButtonAnimations) {
            window.initButtonAnimations();
        }
    }

    function showSettingsModal() {
        const DOM = window.DOM || {};
        const modal = DOM.getById ? DOM.getById('settingsModal') : document.getElementById('settingsModal');
        if (modal) {
            DOM.setStyle ? DOM.setStyle(modal, { display: 'flex' }) : (modal.style.display = 'flex');
            const tutorialToggle = DOM.getById ? DOM.getById('tutorialToggle') : document.getElementById('tutorialToggle');
            if (tutorialToggle) {
                tutorialToggle.checked = window.tutorialState.enabled;
            }
        }
    }

    function hideSettingsModal() {
        const DOM = window.DOM || {};
        const modal = DOM.getById ? DOM.getById('settingsModal') : document.getElementById('settingsModal');
        if (modal) {
            DOM.setStyle ? DOM.setStyle(modal, { display: 'none' }) : (modal.style.display = 'none');
        }
    }

    function showHelpModal() {
        const DOM = window.DOM || {};
        const modal = DOM.getById ? DOM.getById('helpModal') : document.getElementById('helpModal');
        if (modal) {
            DOM.setStyle ? DOM.setStyle(modal, { display: 'flex' }) : (modal.style.display = 'flex');
        }
    }

    function toggleModal(modalId, show = true) {
        const DOM = window.DOM || {};
        const modal = DOM.getById ? DOM.getById(modalId) : document.getElementById(modalId);
        if (modal) {
            DOM.setStyle ? DOM.setStyle(modal, { display: show ? 'flex' : 'none' }) : (modal.style.display = show ? 'flex' : 'none');
        }
    }

    function hideHelpModal() {
        toggleModal('helpModal', false);
    }

    function showCreditsModal() {
        toggleModal('creditsModal', true);
    }

    function hideCreditsModal() {
        toggleModal('creditsModal', false);
    }

    function showHighScoresModal() {
        const DOM = window.DOM || {};
        const C = window.GameConstants || {};
        const attempts = getGameAttempts();
        
        const attemptsHtml = attempts.length > 0 ? attempts.map((attempt, index) => `
            <div class="attempt-card ${attempt.victoryPath}">
                <div class="attempt-header">
                    <span class="attempt-number">#${index + 1}</span>
                    <span class="attempt-date">${new Date(attempt.timestamp).toLocaleDateString()}</span>
                </div>
                <div class="attempt-stats">
                    <div class="stat-row">
                        <span class="stat-label">Outcome:</span>
                        <span class="stat-value">${attempt.rankTitle}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Score:</span>
                        <span class="stat-value">${attempt.score.toLocaleString()}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Weeks:</span>
                        <span class="stat-value">${attempt.weeks}/${C.TOTAL_WEEKS || 12}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Projects:</span>
                        <span class="stat-value">${attempt.projectsCompleted}</span>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Final $:</span>
                        <span class="stat-value ${attempt.money >= 0 ? 'positive' : 'negative'}">$${attempt.money.toLocaleString()}</span>
                    </div>
                </div>
            </div>
        `).join('') : '<p style="color: #999; text-align: center; padding: 2rem;">No previous attempts yet. Complete a game to see your history!</p>';
        
        const content = `
            <h2>🏆 Previous Attempts</h2>
            <div class="attempts-container">
                ${attemptsHtml}
            </div>
            <button class="btn btn-primary close-high-scores">Close</button>
        `;
        
        const { overlay, modal } = DOM.createModal ? DOM.createModal(content, 'modal-content high-scores-modal') : createModalFallback(content, 'modal-content high-scores-modal');
        
        const closeBtn = modal.querySelector('.close-high-scores');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => overlay.remove());
        }
        
        if (DOM.closeModalOnClick) {
            DOM.closeModalOnClick(overlay, modal);
        } else {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.remove();
            });
        }
    }

    function showPhaseAssignmentModal(projectId) {
        const project = window.GameState.projects.find(p => p.id === projectId);
        if (!project || !project.phases) {
            window.showWarningToast('Project not found or does not use phases', 2000);
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';

        const phaseNames = ['management', 'design', 'development', 'review'];
        const phaseLabels = { management: 'Management', design: 'Design', development: 'Development', review: 'Review' };
        const phaseIcons = { management: '📋', design: '🎨', development: '💻', review: '✅' };

        let phasesHTML = '';
        phaseNames.forEach(phaseName => {
            const phase = project.phases[phaseName];
            if (!phase) return;

            const phaseStatus = window.getPhaseStatus ? window.getPhaseStatus(project, phaseName) : phase.status;
            const currentTeam = (phase.teamAssigned || []).map(id => {
                const member = window.GameState.team.find(m => m.id === id);
                return member;
            }).filter(Boolean);

            // Count how many assignments each member has across all projects/phases
            const getMemberAssignmentCount = (memberId) => {
                return window.GameState.projects.reduce((count, p) => {
                    if (!p.phases || p.status === 'complete') return count;
                    const activePhases = ['management', 'design', 'development', 'review'].filter(phaseName => {
                        const phase = p.phases[phaseName];
                        return phase && phase.teamAssigned && phase.teamAssigned.includes(memberId);
                    });
                    return count + activePhases.length;
                }, 0);
            };

            let teamCheckboxes = '';
            window.GameState.team.forEach(member => {
                if (member.hasQuit || member.isIll) return;
                
                const isAssigned = phase.teamAssigned && phase.teamAssigned.includes(member.id);
                const efficiency = window.getEfficiencyForPhase ? window.getEfficiencyForPhase(member, phaseName) : 0.6;
                const efficiencyPercent = Math.round(efficiency * 100);
                const assignmentCount = getMemberAssignmentCount(member.id);
                const assignmentInfo = assignmentCount > 0 ? ` (${assignmentCount} assignments)` : '';
                
                let efficiencyClass = 'efficiency-low';
                let efficiencyIcon = '⚠️';
                if (efficiency >= 1.0) {
                    efficiencyClass = 'efficiency-high';
                    efficiencyIcon = '⭐';
                } else if (efficiency >= 0.9) {
                    efficiencyClass = 'efficiency-medium';
                    efficiencyIcon = '✓';
                }

                teamCheckboxes += `
                    <label class="team-member-option ${isAssigned ? 'assigned' : ''}">
                        <input type="checkbox" 
                               ${isAssigned ? 'checked' : ''} 
                               data-member-id="${member.id}">
                        <span class="member-name">${member.name}${assignmentInfo}</span>
                        <span class="member-role">${member.role}</span>
                        <span class="efficiency-badge ${efficiencyClass}" title="Efficiency: ${efficiencyPercent}%">
                            ${efficiencyIcon} ${efficiencyPercent}%
                        </span>
                    </label>
                `;
            });

            const freelancerCost = (project.complexity || 1) * 200;
            const canHireFreelancer = !phase.freelancerHired && window.GameState.money >= freelancerCost;

            phasesHTML += `
                <div class="phase-assignment-section phase-${phaseStatus}" data-phase-name="${phaseName}">
                    <div class="phase-assignment-header">
                        <span class="phase-icon-large">${phaseIcons[phaseName]}</span>
                        <div>
                            <h3>${phaseLabels[phaseName]}</h3>
                            <span class="phase-status-badge status-${phaseStatus}">${phaseStatus}</span>
                        </div>
                    </div>
                    <div class="team-assignment-list">
                        ${teamCheckboxes || '<p class="no-team-message">No team members available</p>'}
                    </div>
                    ${canHireFreelancer ? `
                        <button class="btn btn-secondary btn-hire-freelancer" 
                                data-phase="${phaseName}"
                                title="Hire freelancer for $${freelancerCost.toLocaleString()} (1.5x speed)">
                            👤 Hire Freelancer ($${freelancerCost.toLocaleString()})
                        </button>
                    ` : phase.freelancerHired ? `
                        <div class="freelancer-hired">👤 Freelancer already hired</div>
                    ` : `
                        <div class="freelancer-unavailable">Need $${freelancerCost.toLocaleString()} to hire freelancer</div>
                    `}
                </div>
            `;
        });

        modal.innerHTML = `
            <div class="modal-content phase-assignment-modal">
                <h2>Assign Team to Phases: ${project.name}</h2>
                <div class="assignment-info">
                    <p>💡 Workers can be assigned to multiple projects and phases. Hours are split evenly across all assignments.</p>
                </div>
                <div class="phases-assignment-container">
                    ${phasesHTML}
                </div>
                <div class="modal-actions">
                    <button class="btn btn-secondary btn-assign-all-phases" data-project-id="${projectId}">Assign Selected to All Phases</button>
                    <button class="btn btn-primary btn-save-phases">Save Assignments</button>
                    <button class="btn btn-secondary btn-cancel-phases">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle "Assign to All Phases" button
        const assignAllBtn = modal.querySelector('.btn-assign-all-phases');
        if (assignAllBtn) {
            assignAllBtn.addEventListener('click', () => {
                // Get all checked members
                const checkedMembers = [];
                modal.querySelectorAll('.phase-assignment-section input[type="checkbox"]:checked').forEach(checkbox => {
                    const memberId = checkbox.getAttribute('data-member-id');
                    if (memberId && !checkedMembers.includes(memberId)) {
                        checkedMembers.push(memberId);
                    }
                });
                
                if (checkedMembers.length === 0) {
                    window.showWarningToast('Please select at least one team member first', 2000);
                    return;
                }
                
                // Assign each checked member to all phases
                checkedMembers.forEach(memberId => {
                    window.assignTeamMemberToAllPhases(memberId, projectId);
                });
                
                window.showSuccessToast(`Assigned ${checkedMembers.length} team member(s) to all phases`, 2000);
                modal.remove();
                window.displayGameState();
                window.saveState();
            });
        }

        // Handle freelancer hiring
        modal.querySelectorAll('.btn-hire-freelancer').forEach(btn => {
            btn.addEventListener('click', () => {
                const phaseName = btn.getAttribute('data-phase');
                const result = window.hireFreelancer(projectId, phaseName);
                if (result.success) {
                    window.showSuccessToast(result.message, 3000);
                    modal.remove();
                    window.displayGameState();
                    window.saveState();
                } else {
                    window.showWarningToast(result.message, 3000);
                }
            });
        });

        // Handle save
        modal.querySelector('.btn-save-phases').addEventListener('click', () => {
            phaseNames.forEach(phaseName => {
                const phase = project.phases[phaseName];
                if (!phase) return;

                // Find the phase section by data attribute (more reliable)
                const phaseSection = modal.querySelector(`.phase-assignment-section[data-phase-name="${phaseName}"]`);
                if (!phaseSection) return;

                const phaseCheckboxes = phaseSection.querySelectorAll('input[type="checkbox"]');
                const newTeam = [];
                
                phaseCheckboxes.forEach(checkbox => {
                    if (checkbox.checked && !checkbox.disabled) {
                        const memberId = checkbox.getAttribute('data-member-id');
                        if (memberId) {
                            newTeam.push(memberId);
                            window.assignTeamMemberToPhase(memberId, projectId, phaseName);
                        }
                    } else {
                        const memberId = checkbox.getAttribute('data-member-id');
                        if (memberId) {
                            window.removeTeamMemberFromPhase(memberId, projectId, phaseName);
                        }
                    }
                });

                phase.teamAssigned = newTeam;
            });

            window.displayGameState();
            window.saveState();
            modal.remove();
            window.showSuccessToast('Phase assignments saved!', 2000);
        });

        // Handle cancel
        modal.querySelector('.btn-cancel-phases').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    function getGameAttempts() {
    const attemptsJson = localStorage.getItem('agencyChaosAttempts');
    return attemptsJson ? JSON.parse(attemptsJson) : [];
}

    function saveGameAttempt(endReason, victoryPath, score, rank) {
    const attempts = getGameAttempts();
    
    const attempt = {
        timestamp: Date.now(),
        endReason,
        victoryPath,
        score,
        rankTitle: rank,
            weeks: window.GameState.currentWeek,
            money: window.GameState.money,
            projectsCompleted: window.GameState.gameStats.projectsCompleted,
            avgSatisfaction: window.GameState.gameStats.projectsCompleted > 0 
                ? Math.round(window.GameState.gameStats.totalSatisfactionPoints / window.GameState.gameStats.projectsCompleted) 
                : 0,
            teamMorale: window.GameState.teamMorale
    };
    
    attempts.unshift(attempt);
    
    if (attempts.length > 10) {
        attempts.pop();
    }
    
    localStorage.setItem('agencyChaosAttempts', JSON.stringify(attempts));
}

    function updateClock() {
        if (typeof window.GameState.currentHour !== 'number') {
            window.GameState.currentHour = 9;
        }
        if (window.GameState.currentMinute === undefined) {
            window.GameState.currentMinute = 0;
        }
        
        // Ensure hour is always an integer
        const hour = Math.floor(window.GameState.currentHour || 9);
        const minute = Math.floor(window.GameState.currentMinute || 0);
        const isPM = hour >= 12;
        const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
        const period = isPM ? 'PM' : 'AM';
        const minuteStr = minute.toString().padStart(2, '0');
        const timeString = `${displayHour}:${minuteStr} ${period}`;
    
        const clockElement = document.getElementById('gameClock');
        const clockIcon = document.querySelector('.clock-icon');
        const clockDisplay = document.querySelector('.clock-display');
        const visualClock = document.querySelector('.visual-clock');
    
        if (clockElement) {
            clockElement.textContent = timeString;
        }
        
        // Update visual clock animation if it exists
        if (visualClock) {
            updateVisualClock(hour, minute);
        }
    
    // Calculate remaining work hours (work day: 9 AM to 6 PM = 9 hours)
    const workDayStart = 9;
    const workDayEnd = 18;
    let remainingHours = 0;
    if (hour >= workDayStart && hour < workDayEnd) {
        remainingHours = workDayEnd - hour;
    } else if (hour < workDayStart) {
        remainingHours = workDayEnd - workDayStart;
    }
    
    // Update clock icon based on time
    if (clockIcon) {
        const clockEmojis = ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'];
        const emojiIndex = (hour % 12);
        clockIcon.textContent = clockEmojis[emojiIndex];
    }
    
    // Add remaining hours indicator
    if (clockDisplay && remainingHours > 0) {
        let hoursIndicator = clockDisplay.querySelector('.hours-remaining');
        if (!hoursIndicator) {
            hoursIndicator = document.createElement('span');
            hoursIndicator.className = 'hours-remaining';
            clockDisplay.appendChild(hoursIndicator);
        }
        hoursIndicator.textContent = `${remainingHours}h left`;
        hoursIndicator.style.color = remainingHours <= 2 ? '#ff4444' : remainingHours <= 4 ? '#ff8800' : '#666';
        hoursIndicator.style.fontSize = '0.75rem';
        hoursIndicator.style.marginLeft = '0.5rem';
    } else if (clockDisplay) {
        const hoursIndicator = clockDisplay.querySelector('.hours-remaining');
        if (hoursIndicator) {
            hoursIndicator.remove();
        }
    }
    
    // Add pause indicator when timer is waiting for player input
    if (clockDisplay) {
        const isPaused = window.currentConversation !== null;
        const hasUnreadNotifications = window.GameState.conversationQueue && window.GameState.conversationQueue.length > 0;
        const shouldShowIndicator = isPaused || hasUnreadNotifications;
        
        let pauseIndicator = clockDisplay.querySelector('.clock-pause-indicator');
        
        if (shouldShowIndicator) {
            if (!pauseIndicator) {
                pauseIndicator = document.createElement('span');
                pauseIndicator.className = 'clock-pause-indicator';
                clockDisplay.appendChild(pauseIndicator);
            }
            pauseIndicator.textContent = '📬 You have unread notifications';
            pauseIndicator.style.display = 'inline-flex';
        } else if (pauseIndicator) {
            pauseIndicator.remove();
        }
    }
}

    function advanceClock() {
        const clockElement = document.getElementById('gameClock');
        if (clockElement) {
            clockElement.classList.add('time-advance');
            setTimeout(() => clockElement.classList.remove('time-advance'), 600);
        }
        
        // Advance time by a few hours per day
        const hoursToAdvance = 2 + Math.floor(Math.random() * 3); // 2-4 hours per day
        window.GameState.currentHour = (window.GameState.currentHour + hoursToAdvance) % 24;
        
        // If we roll over midnight, reset to morning
        if (window.GameState.currentHour < 7) {
            window.GameState.currentHour = 9; // Reset to 9 AM for new day
        }
        
        window.updateClock();
    }

    return {
        highlightTeamMemberCard,
        showProjectCompletion,
        showWeekSummary,
        displayGameState,
        displayProjects,
        createProjectCard,
        displayTeam,
        createTeamMemberCard,
        showAssignmentModal,
        calculateAverageSatisfaction,
        updateMainContent,
        displayConversation,
        showConsequenceFeedback,
        animateResourceChange,
        highlightProject,
        updateNotificationBadge,
        checkUnassignedProjectsWarning,
        showResetConfirmModal,
        viewSummary,
        showEndGameScreen,
        setupEventListeners,
        showSettingsModal,
        hideSettingsModal,
        showHelpModal,
        hideHelpModal,
        showCreditsModal,
        hideCreditsModal,
        showHighScoresModal,
        getGameAttempts,
        saveGameAttempt,
        updateClock,
        showPhaseAssignmentModal,
        advanceClock
    };
})();

// Expose on window for backward compatibility
window.highlightTeamMemberCard = UIModule.highlightTeamMemberCard;
window.showProjectCompletion = UIModule.showProjectCompletion;
window.showWeekSummary = UIModule.showWeekSummary;
window.displayGameState = UIModule.displayGameState;
window.displayProjects = UIModule.displayProjects;
window.createProjectCard = UIModule.createProjectCard;
window.displayTeam = UIModule.displayTeam;
window.createTeamMemberCard = UIModule.createTeamMemberCard;
window.showAssignmentModal = UIModule.showAssignmentModal;
window.calculateAverageSatisfaction = UIModule.calculateAverageSatisfaction;
window.updateMainContent = UIModule.updateMainContent;
window.displayConversation = UIModule.displayConversation;
window.showConsequenceFeedback = UIModule.showConsequenceFeedback;
window.animateResourceChange = UIModule.animateResourceChange;
window.highlightProject = UIModule.highlightProject;
window.updateNotificationBadge = UIModule.updateNotificationBadge;
window.checkUnassignedProjectsWarning = UIModule.checkUnassignedProjectsWarning;
window.showResetConfirmModal = UIModule.showResetConfirmModal;
window.viewSummary = UIModule.viewSummary;
window.showEndGameScreen = UIModule.showEndGameScreen;
window.setupEventListeners = UIModule.setupEventListeners;
window.showSettingsModal = UIModule.showSettingsModal;
window.hideSettingsModal = UIModule.hideSettingsModal;
window.showHelpModal = UIModule.showHelpModal;
window.hideHelpModal = UIModule.hideHelpModal;
window.showCreditsModal = UIModule.showCreditsModal;
window.hideCreditsModal = UIModule.hideCreditsModal;
window.showHighScoresModal = UIModule.showHighScoresModal;
window.getGameAttempts = UIModule.getGameAttempts;
window.saveGameAttempt = UIModule.saveGameAttempt;
window.updateClock = UIModule.updateClock;
window.showPhaseAssignmentModal = UIModule.showPhaseAssignmentModal;
window.advanceClock = UIModule.advanceClock;

