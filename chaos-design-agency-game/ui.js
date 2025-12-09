// UI rendering and interactions

const UIModule = (function() {
    'use strict';

    function initDayProgressBar() {
        // Create day progress bar if it doesn't exist
        if (document.querySelector('.day-progress-container')) {
            return; // Already initialized
        }

        // Find the clock/time display element
        const clockElement = document.getElementById('gameClock');
        const clockParent = clockElement ? clockElement.closest('.header-time, .clock-display') : null;
        const targetContainer = clockParent || document.querySelector('.header-time') || document.querySelector('.header-top-row');
        
        if (!targetContainer) {
            console.warn('Could not find time block, appending to header');
            return;
        }

        const container = document.createElement('div');
        container.className = 'day-progress-container';
        
        const bar = document.createElement('div');
        bar.className = 'day-progress-bar';
        bar.id = 'dayProgressBar';
        
        container.appendChild(bar);
        targetContainer.appendChild(container);
        
        console.log('Day progress bar initialized in time block');
    }
    
    function updatePauseIndicator() {
        const isPaused = window.currentConversation !== null || window.GameState.gameOver;
        let indicator = document.getElementById('clockPauseIndicator');
        
        if (isPaused) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'clockPauseIndicator';
                indicator.className = 'clock-pause-indicator';
                
                const header = document.querySelector('.messages-header') || document.querySelector('.main-content-header');
                if (header) {
                    header.appendChild(indicator);
                }
            }
            
            if (window.GameState.gameOver) {
                indicator.innerHTML = '⏸️ Game Over';
            } else if (window.currentConversation) {
                indicator.innerHTML = '⏸️ Waiting for response';
            }
            indicator.style.display = 'inline-flex';
        } else if (indicator) {
            indicator.style.display = 'none';
        }
    }

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
                DOM.setTextContent(playerHoursElement, `${playerHours.toFixed(1)}/${baseHours} ⚠️ (this week)`);
                DOM.setStyle(playerHoursElement, { color: '#ff4444', fontWeight: 'bold' });
            } else if (playerHours <= 10) {
                DOM.setTextContent(playerHoursElement, `${playerHours.toFixed(1)}/${baseHours} (this week)`);
                DOM.setStyle(playerHoursElement, { color: '#ff8800' });
            } else {
                DOM.setTextContent(playerHoursElement, `${playerHours.toFixed(1)}/${baseHours} (this week)`);
                DOM.setStyle(playerHoursElement, { color: '', fontWeight: '' });
            }
        }

        // Update scores
        const currentScore = window.calculateScore ? window.calculateScore() : 0;
        const bestScore = window.getBestScore ? window.getBestScore() : 0;
        
        DOM.setTextContent('currentScore', currentScore.toLocaleString());
        DOM.setTextContent('bestScore', bestScore > 0 ? bestScore.toLocaleString() : '--');

        window.updateClock();
        displayProjects();
        displayTeam();
        
        // Update all hours indicators
        window.GameState.team.forEach(member => {
            updateHoursIndicator(member);
        });
        
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

        // Add tutorial hint if not already present
        let tutorialHint = container.previousElementSibling;
        if (!tutorialHint || !tutorialHint.classList.contains('section-tutorial-hint')) {
            tutorialHint = document.createElement('div');
            tutorialHint.className = 'section-tutorial-hint';
            tutorialHint.innerHTML = `
                <div class="tutorial-hint-header">
                    <span class="tutorial-hint-icon">💡</span>
                    <span class="tutorial-hint-title">How Projects Work</span>
                    <button class="tutorial-hint-toggle" aria-label="Toggle tutorial">▼</button>
                </div>
                <div class="tutorial-hint-content">
                    <p><strong>📋 Phases:</strong> Projects have 4 phases (Management → Design → Development → Review). Each phase must reach 50% before the next starts.</p>
                    <p><strong>👥 Assignments:</strong> Click "Assign to Phases" to assign workers to specific phases. Workers only contribute to assigned phases.</p>
                    <p><strong>⚠️ Warnings:</strong> Projects without team on active phases won't progress. Assign workers to keep projects moving!</p>
                </div>
            `;
            const projectTimeline = container.closest('.project-timeline');
            if (projectTimeline) {
                projectTimeline.insertBefore(tutorialHint, container);
            }
            
            // Toggle functionality
            const toggleBtn = tutorialHint.querySelector('.tutorial-hint-toggle');
            const content = tutorialHint.querySelector('.tutorial-hint-content');
            if (toggleBtn && content) {
                let isExpanded = localStorage.getItem('projectsTutorialExpanded') !== 'false';
                if (!isExpanded) {
                    content.style.display = 'none';
                    toggleBtn.textContent = '▶';
                }
                toggleBtn.addEventListener('click', () => {
                    isExpanded = content.style.display !== 'none';
                    content.style.display = isExpanded ? 'none' : 'block';
                    toggleBtn.textContent = isExpanded ? '▶' : '▼';
                    localStorage.setItem('projectsTutorialExpanded', !isExpanded);
                });
            }
        }

        if (window.GameState.projects.length === 0) {
            container.innerHTML = '<p style="color: #999; font-weight: 600;">No active projects</p>';
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

        // Check if ANY phase has team members assigned (for project-level team display)
    let allAssignedMemberIds = new Set();
    if (project.phases) {
        ['management', 'design', 'development', 'review'].forEach(phaseName => {
            const phase = project.phases[phaseName];
            if (phase && phase.teamAssigned) {
                phase.teamAssigned.forEach(id => allAssignedMemberIds.add(id));
            }
        });
    }
    
    const assignedMembers = Array.from(allAssignedMemberIds)
        .map(id => window.GameState.team.find(m => m.id === id))
        .filter(Boolean);
    const teamAvatars = assignedMembers.map(m => {
        const initials = m.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        const roleIcon = m.role ? (m.role.toLowerCase() === 'manager' ? '👔' : m.role.toLowerCase() === 'designer' ? '🎨' : '💻') : '👥';
        return `<span class="team-avatar" title="${m.name}">${roleIcon} ${initials}</span>`;
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
            
            // Get assigned team members for THIS PHASE specifically
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
            <strong>NO TEAM ON ACTIVE PHASES</strong> - Project not progressing!
            <br>
            <span class="warning-hint">Click "Assign to Phases" to assign workers to specific phases</span>
        `;
        card.appendChild(warning);
    }

    return card;
}

    function displayTeam() {
    const container = document.getElementById('teamContainer');
    container.innerHTML = '';

        // Add tutorial hint if not already present
        let tutorialHint = container.previousElementSibling;
        if (!tutorialHint || !tutorialHint.classList.contains('section-tutorial-hint')) {
            tutorialHint = document.createElement('div');
            tutorialHint.className = 'section-tutorial-hint';
            tutorialHint.innerHTML = `
                <div class="tutorial-hint-header">
                    <span class="tutorial-hint-icon">💡</span>
                    <span class="tutorial-hint-title">How Team Management Works</span>
                    <button class="tutorial-hint-toggle" aria-label="Toggle tutorial">▼</button>
                </div>
                <div class="tutorial-hint-content">
                    <p><strong>⏰ Hours:</strong> Each worker has 40 hours/week. Hours are deducted when working on active phases. Workers stop at 0 hours (you can go negative).</p>
                    <p><strong>💰 Payroll:</strong> Workers are paid weekly based on hours worked × rate × efficiency. Minimum €100/week per worker.</p>
                    <p><strong>😊 Morale:</strong> Low morale workers may quit. Keep them happy by managing workload and responding to conversations.</p>
                    <p><strong>📋 Assignments:</strong> Workers show projects they're assigned to. Click project cards to assign workers to specific phases.</p>
                </div>
            `;
            const teamSection = container.closest('.team-section');
            if (teamSection) {
                teamSection.insertBefore(tutorialHint, container);
            }
            
            // Toggle functionality
            const toggleBtn = tutorialHint.querySelector('.tutorial-hint-toggle');
            const content = tutorialHint.querySelector('.tutorial-hint-content');
            if (toggleBtn && content) {
                let isExpanded = localStorage.getItem('teamTutorialExpanded') !== 'false';
                if (!isExpanded) {
                    content.style.display = 'none';
                    toggleBtn.textContent = '▶';
                }
                toggleBtn.addEventListener('click', () => {
                    isExpanded = content.style.display !== 'none';
                    content.style.display = isExpanded ? 'none' : 'block';
                    toggleBtn.textContent = isExpanded ? '▶' : '▼';
                    localStorage.setItem('teamTutorialExpanded', !isExpanded);
                });
            }
        }

        if (window.GameState.team.length === 0) {
            container.innerHTML = '<p style="color: #999; font-weight: 600;">No team members available</p>';
            return;
        }

        window.GameState.team.forEach(member => {
            const status = window.getTeamMemberStatus(member.id);
            const memberCard = createTeamMemberCard(member, status);
            container.appendChild(memberCard);
        });
        
        // Ensure hours indicators are updated after cards are created
        window.GameState.team.forEach(member => {
            updateHoursIndicator(member);
        });
}

    function createTeamMemberCard(member, status) {
        const card = document.createElement('div');
        card.className = `team-member-card ${status.assignmentClass}`;
        card.setAttribute('data-member-id', member.id);
        
        // Add special state classes for visual indicators
        if (member.isIll) {
            card.classList.add('ill');
        }
        if (member.hasQuit) {
            card.classList.add('quit');
        }

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

        // Derive project assignments from phase assignments
        const projectsFromPhases = new Set();
        window.GameState.projects.forEach(project => {
            if (!project.phases) return;
            ['management', 'design', 'development', 'review'].forEach(phaseName => {
                const phase = project.phases[phaseName];
                if (phase && phase.teamAssigned && phase.teamAssigned.includes(member.id)) {
                    projectsFromPhases.add(project);
                }
            });
        });
        
        const assignmentList = projectsFromPhases.size > 0
            ? Array.from(projectsFromPhases).map(p => p.name).join(', ')
            : 'No Project';
        
        const projectName = assignmentList;
        const assignedProjectCount = projectsFromPhases.size;

        card.innerHTML = `
            <div class="team-member-card-header" data-accordion-toggle>
                <div class="team-member-avatar">${member.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}</div>
                
                <div class="team-member-main-info">
                    <div class="team-member-identity">
                        <div class="team-member-name">${member.name}</div>
                        <div class="team-member-role">${member.role}</div>
                    </div>
                    
                    <div class="team-member-project-compact">
                        <span class="project-icon">📋</span>
                        <span class="project-text">${projectName}</span>
                    </div>
                </div>
                
                <div class="team-member-expand-icon">▼</div>
            </div>
            <div class="team-member-card-content" style="display: none;">
                <div class="team-member-status ${status.assignmentClass}">
                    <span class="status-dot"></span>
                    <span>${status.assignmentLabel}${member.isIll ? ' (Ill)' : ''}</span>
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
                </div>
                <div class="team-member-actions">
                    <button class="btn btn-small assign-btn" data-member-id="${member.id}">
                        ${status.isAvailable ? 'Assign to Project' : 'Reassign'}
                    </button>
                </div>
            </div>
        `;

        // Add hours indicator after main-info section
        const mainInfo = card.querySelector('.team-member-main-info');
        if (mainInfo) {
            const hoursIndicator = createHoursIndicator(member);
            mainInfo.parentElement.insertBefore(hoursIndicator, mainInfo.nextSibling);
        }

        const toggleBtn = card.querySelector('[data-accordion-toggle]');
        const content = card.querySelector('.team-member-card-content');
        const expandIcon = card.querySelector('.team-member-expand-icon');

        toggleBtn.addEventListener('click', () => {
            const isExpanded = content.style.display !== 'none';
            content.style.display = isExpanded ? 'none' : 'block';
            expandIcon.textContent = isExpanded ? '▼' : '▲';
            card.classList.toggle('expanded', !isExpanded);
        });

        card.querySelector('.assign-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            showAssignmentModal(member.id);
        });

        return card;
    }

    function createHoursIndicator(member) {
        const container = document.createElement('div');
        container.className = 'hours-indicator';
        container.id = `hours-indicator-${member.id}`;
        
        // Add special state classes
        if (member.hasQuit) {
            container.classList.add('member-quit');
        }
        if (member.isIll) {
            container.classList.add('member-ill');
        }
        
        // Create the progress bar
        const bar = document.createElement('div');
        bar.className = 'hours-bar';
        bar.id = `hours-bar-${member.id}`;
        
        // Create text label
        const label = document.createElement('div');
        label.className = 'hours-label';
        label.id = `hours-label-${member.id}`;
        
        container.appendChild(bar);
        container.appendChild(label);
        
        // Initialize with current values (using element references directly)
        updateHoursIndicatorElements(member, bar, label, container);
        
        return container;
    }

    function updateHoursIndicatorElements(member, bar, label, container) {
        if (!bar || !label || !container) {
            return; // Elements don't exist
        }
        
        const currentHours = Math.max(0, member.hours || 0); // Don't show negative visually
        const maxHours = member.maxHours || 40;
        const percentage = Math.min(100, (currentHours / maxHours) * 100);
        
        // Update bar width
        bar.style.width = `${percentage}%`;
        
        // Update color based on percentage
        bar.classList.remove('hours-full', 'hours-good', 'hours-low', 'hours-critical', 'hours-debt');
        
        if (member.hours < 0) {
            bar.classList.add('hours-debt');
        } else if (percentage >= 80) {
            bar.classList.add('hours-full');
        } else if (percentage >= 50) {
            bar.classList.add('hours-good');
        } else if (percentage >= 20) {
            bar.classList.add('hours-low');
        } else {
            bar.classList.add('hours-critical');
        }
        
        // Update label text
        const displayHours = Math.round((member.hours || 0) * 10) / 10; // Round to 1 decimal, show actual (including negative)
        const hourIcon = displayHours <= 0 ? '⏳' : (displayHours < 10 ? '⚡' : '⏱️');
        label.textContent = `${hourIcon} ${displayHours}h / ${maxHours}h`;
        
        // Update special states
        if (member.hasQuit) {
            container.classList.add('member-quit');
        } else {
            container.classList.remove('member-quit');
        }
        
        if (member.isIll) {
            container.classList.add('member-ill');
        } else {
            container.classList.remove('member-ill');
        }
    }

    function updateHoursIndicator(member) {
        const bar = document.getElementById(`hours-bar-${member.id}`);
        const label = document.getElementById(`hours-label-${member.id}`);
        const container = document.getElementById(`hours-indicator-${member.id}`);
        
        if (!bar || !label || !container) {
            return; // Elements don't exist yet
        }
        
        // Use the shared update logic
        updateHoursIndicatorElements(member, bar, label, container);
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
    const contentArea = document.getElementById('contentArea');
    
    if (window.currentConversation !== null && !conversationContainer) {
        window.currentConversation = null;
        window.selectedChoiceId = null;
    }

    if (window.currentConversation !== null) {
        return;
    }

    // Add tutorial hint to content area when empty
    if (contentArea && (!contentArea.innerHTML.trim() || contentArea.querySelector('.welcome-message'))) {
        // Check if tutorial hint already exists
        let existingHint = contentArea.querySelector('.content-tutorial-hint');
        if (!existingHint) {
            existingHint = document.createElement('div');
            existingHint.className = 'content-tutorial-hint section-tutorial-hint';
            existingHint.innerHTML = `
                <div class="tutorial-hint-header">
                    <span class="tutorial-hint-icon">💡</span>
                    <span class="tutorial-hint-title">How the Game Works</span>
                    <button class="tutorial-hint-toggle" aria-label="Toggle tutorial">▼</button>
                </div>
                <div class="tutorial-hint-content">
                    <p><strong>📧 Conversations:</strong> Client messages appear here. Respond quickly to maintain satisfaction. Some have deadlines!</p>
                    <p><strong>⏱️ Real-Time:</strong> The game runs in real-time (1 game hour = 1 real second). Time pauses during conversations.</p>
                    <p><strong>📋 Projects:</strong> Assign workers to project phases via "Assign to Phases" button. Projects progress through phases sequentially.</p>
                    <p><strong>💰 Money:</strong> Earn money by completing projects. Pay workers weekly based on hours worked. Watch your budget!</p>
                    <p><strong>😊 Morale:</strong> Keep team morale high. Low morale workers may quit. Respond to conversations and manage workload.</p>
                </div>
            `;
            const welcomeMsg = contentArea.querySelector('.welcome-message');
            if (welcomeMsg) {
                contentArea.insertBefore(existingHint, welcomeMsg);
            } else {
                contentArea.appendChild(existingHint);
            }
            
            // Toggle functionality
            const toggleBtn = existingHint.querySelector('.tutorial-hint-toggle');
            const content = existingHint.querySelector('.tutorial-hint-content');
            if (toggleBtn && content) {
                let isExpanded = localStorage.getItem('contentTutorialExpanded') !== 'false';
                if (!isExpanded) {
                    content.style.display = 'none';
                    toggleBtn.textContent = '▶';
                }
                toggleBtn.addEventListener('click', () => {
                    isExpanded = content.style.display !== 'none';
                    content.style.display = isExpanded ? 'none' : 'block';
                    toggleBtn.textContent = isExpanded ? '▶' : '▼';
                    localStorage.setItem('contentTutorialExpanded', !isExpanded);
                });
            }
        }
    }

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
        const processedConversation = window.replaceHardcodedNames ? window.replaceHardcodedNames(conversation) : conversation;
        
        window.currentConversation = processedConversation;
        window.selectedChoiceId = null;
        window.currentConversationStartTime = Date.now();
        window.currentConversationMeta = {
            linkedProjectId: processedConversation.linkedProjectId,
            responseDeadlineHours: processedConversation.responseDeadlineHours
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
        
        // Update hours indicators even when clock is paused
        window.GameState.team.forEach(member => {
            updateHoursIndicator(member);
        });
        
        window.updateNotificationBadge();
        window.checkUnassignedProjectsWarning();

    const player = window.GameState.team.find(m => m.id === 'player');
    const playerBurnout = player ? (player.burnout || 0) : 0;
    const availableChoices = filterChoicesByBurnout(processedConversation.choices, playerBurnout);
    
    const contentArea = document.getElementById('contentArea');
    const choicesHtml = availableChoices.map(choice => {
        const cons = choice.consequences || {};
        const icons = [];
        if (cons.money) icons.push(cons.money > 0 ? '💰' : '💸');
        if (cons.teamMorale) icons.push(cons.teamMorale > 0 ? '😊' : '😟');
        if (cons.projectProgress) icons.push('📈');
        if (cons.playerBurnout) icons.push(cons.playerBurnout < 0 ? '🧘' : '🔥');
        if (cons.responseDeadlineHours) icons.push('⏳');
        const iconStr = icons.length ? `<span class="choice-icons">${icons.join(' ')}</span>` : '';
        return `
            <button class="choice-btn" data-choice-id="${choice.id}">
                <div class="choice-text">${iconStr} ${choice.text}</div>
                <div class="consequence-hint">${window.formatConsequences(choice.consequences)}</div>
            </button>
        `;
    }).join('');
    
    const burnoutWarning = playerBurnout >= 60 ? `
        <div class="burnout-warning">
            ⚠️ High burnout (${Math.round(playerBurnout)}%) - Some options are unavailable. Rest to recover.
        </div>
    ` : '';

    // Build inbox-style list (current + queued conversations)
    const inboxItems = [];
    inboxItems.push({ convo: processedConversation, status: 'active' });
    const queuedIds = (window.GameState.conversationQueue || []).filter(id => id !== processedConversation.id);
    queuedIds.forEach(id => {
        const convo = (window.AllConversations || []).find(c => c.id === id);
        if (convo) inboxItems.push({ convo, status: 'queued' });
    });
    const listItemsHtml = inboxItems.length ? inboxItems.map(item => {
        const c = item.convo || {};
        const preview = (c.body || '').replace(/<[^>]+>/g, '').slice(0, 120) || 'New message';
        const urgencyIcon = c.urgency === 'high' ? '⚠️' : c.urgency === 'low' ? '⏳' : '✉️';
        const deadline = c.responseDeadlineHours ? `<span class="message-pill">⏳ ${c.responseDeadlineHours}h</span>` : '';
        const tag = c.topic ? `<span class="message-pill soft">#${c.topic}</span>` : '';
        const cls = `message-item ${item.status === 'active' ? 'active' : ''}`;
        return `
            <div class="${cls}">
                <div class="message-item-header">
                    <div class="message-from">${urgencyIcon} ${c.from || 'Client'}</div>
                    <div class="message-time">${deadline}</div>
                </div>
                <div class="message-subject">${c.subject || 'Message'}</div>
                <div class="message-preview">${preview}</div>
                <div class="message-tags">${deadline} ${tag}</div>
            </div>
        `;
    }).join('') : `<div class="message-empty">📭 Inbox is clear</div>`;

    contentArea.innerHTML = `
        <div class="messages-inbox">
            <div class="messages-list-pane">
                <div class="messages-list-header">
                    <div class="messages-list-title">📥 Inbox</div>
                    <div class="messages-list-filters">
                        <span class="message-filter active">All</span>
                        <span class="message-filter">Unread</span>
                    </div>
                </div>
                <div class="messages-search">
                    <span class="search-icon">🔍</span>
                    <input type="text" placeholder="Search messages" disabled aria-label="Search messages (coming soon)">
                </div>
                <div class="messages-list">
                    ${listItemsHtml}
                </div>
            </div>
            <div class="messages-detail-pane">
                <div class="conversation-container urgency-${processedConversation.urgency}">
                    <div class="conversation-header">
                        <div class="conversation-from">👤 ${processedConversation.from || 'Client'}</div>
                        <div class="conversation-subject">${processedConversation.subject || 'Message'}</div>
                        ${processedConversation.responseDeadlineHours ? `<div class="response-timer">⏳ Reply within ${processedConversation.responseDeadlineHours}h</div>` : ''}
                    </div>
                    <div class="conversation-body">${processedConversation.body}</div>
                    ${burnoutWarning}
                    <div class="conversation-choices">${choicesHtml}</div>
                    <div class="conversation-actions">
                        <button class="btn btn-secondary remind-btn">🔔 Remind me later</button>
                        <button class="btn btn-primary send-response-btn" disabled>Send Response</button>
                    </div>
                </div>
            </div>
        </div>
    `;

        contentArea.querySelectorAll('.choice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const choiceId = btn.getAttribute('data-choice-id');
                if (choiceId && window.handleChoice) {
                    window.handleChoice(processedConversation.id, choiceId);
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
                    // Double-check conversation is still active and not resolved
                    const conversationId = processedConversation.id;
                    if (window.GameState.resolvedConversations.includes(conversationId)) {
                        console.warn('Conversation already resolved, ignoring click');
                        return;
                    }
                    if (!window.currentConversation || window.currentConversation.id !== conversationId) {
                        console.warn('Conversation mismatch, ignoring click');
                        return;
                    }
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
                window.deferConversation(processedConversation.id);
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
            // Check if ANY active phase has team members assigned
            if (!p.phases) return false;
            
            let hasActivePhaseWithTeam = false;
            ['management', 'design', 'development', 'review'].forEach(phaseName => {
                const phase = p.phases[phaseName];
                if (!phase) return;
                
                const phaseStatus = window.getPhaseStatus ? window.getPhaseStatus(p, phaseName) : phase.status;
                if ((phaseStatus === 'active' || phaseStatus === 'ready') && 
                    phase.teamAssigned && phase.teamAssigned.length > 0) {
                    hasActivePhaseWithTeam = true;
                }
            });
            
            return !hasActivePhaseWithTeam;
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
                <strong>⚠️ Action Required!</strong>
                ${unassignedProjects.length} project${unassignedProjects.length > 1 ? 's' : ''} ha${unassignedProjects.length > 1 ? 've' : 's'} no team on active phases: <em>${projectNames}</em>
                <br>
                <span class="warning-subtext">🚧 Projects won't progress until you assign workers to specific phases. Click "Assign to Phases" on each project card.</span>
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
Average Client Reputation: ${calculateAverageSatisfaction() !== null ? Math.round(calculateAverageSatisfaction()) + '%' : 'N/A'}

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
                            <span class="stat-label">⭐ Avg Reputation</span>
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
            const shareText = `Agency Chaos Simulator - ${rank}\nScore: ${score.toLocaleString()}\nProjects: ${stats.projectsCompleted} | Money: $${window.GameState.money.toLocaleString()} | Reputation: ${avgSatisfaction}%`;
        
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

        attachButtonListener('pauseBtn', () => {
            if (window.isTimerRunning && window.isTimerRunning()) {
                if (window.pauseTimer) {
                    window.pauseTimer();
                    Logger.log('Game paused');
                }
            } else {
                if (window.resumeTimer) {
                    window.resumeTimer();
                    Logger.log('Game resumed');
                }
            }
        }, 'Error in pause/resume');

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
        const phaseDescriptions = {
            management: '📋 Planning & setup. Assign managers or experienced team members. Starts first.',
            design: '🎨 Visual design & UX. Assign designers. Starts when Management reaches 50%.',
            development: '💻 Building & coding. Assign developers. Starts when Design reaches 50%.',
            review: '✅ Testing & polish. Assign anyone. Starts when Development reaches 50%.'
        };

        // Build phase assignment grid - each phase shows team members with checkboxes
        let phasesHTML = '<div class="phases-assignment-grid">';
        
        phaseNames.forEach(phaseName => {
            const phase = project.phases[phaseName];
            if (!phase) return;

            // Initialize teamAssigned array if it doesn't exist
            if (!phase.teamAssigned) {
                phase.teamAssigned = [];
            }

            const phaseStatus = window.getPhaseStatus ? window.getPhaseStatus(project, phaseName) : phase.status;
            const progressPercent = Math.round((phase.progress || 0) * 100);
            
            // Build team member checkboxes for this phase
            let teamCheckboxes = '';
            window.GameState.team.forEach(member => {
                if (member.hasQuit || member.isIll) return;
                
                const isAssignedToPhase = phase.teamAssigned.includes(member.id);
                const efficiency = window.getEfficiencyForPhase ? window.getEfficiencyForPhase(member, phaseName) : 0.6;
                const efficiencyPercent = Math.round(efficiency * 100);
                
                let efficiencyClass = 'efficiency-low';
                if (efficiency >= 1.0) {
                    efficiencyClass = 'efficiency-high';
                } else if (efficiency >= 0.9) {
                    efficiencyClass = 'efficiency-medium';
                }

                teamCheckboxes += `
                    <label class="team-member-checkbox-option ${isAssignedToPhase ? 'assigned' : ''}">
                        <input type="checkbox" 
                               ${isAssignedToPhase ? 'checked' : ''} 
                               data-member-id="${member.id}"
                               data-phase-name="${phaseName}">
                        <span class="member-name-short">${member.name}</span>
                        <span class="efficiency-dot ${efficiencyClass}" title="${member.role}: ${efficiencyPercent}% efficiency"></span>
                    </label>
                `;
            });
            
            phasesHTML += `
                <div class="phase-assignment-column phase-${phaseStatus}" data-phase-name="${phaseName}">
                    <div class="phase-column-header">
                        <h3>${phaseIcons[phaseName]} ${phaseLabels[phaseName]}</h3>
                        <span class="phase-status-badge status-${phaseStatus}">${phaseStatus}</span>
                        <div class="phase-progress-bar-mini">
                            <div class="phase-progress-fill-mini" style="width: ${progressPercent}%"></div>
                        </div>
                        <div class="phase-tutorial-hint">
                            <span class="phase-hint-icon">💡</span>
                            <span class="phase-hint-text">${phaseDescriptions[phaseName]}</span>
                        </div>
                    </div>
                    <div class="team-checkbox-list">
                        ${teamCheckboxes || '<p class="no-team-message">No team available</p>'}
                    </div>
                </div>
            `;
        });
        phasesHTML += '</div>';

        modal.innerHTML = `
            <div class="modal-content phase-assignment-modal phase-assignment-modal-wide">
                <h2>Assign Team to Phases: ${project.name}</h2>
                <div class="assignment-info">
                    <p><strong>⚙️ Phase-Specific Assignment:</strong> Workers only contribute to phases they're assigned to.</p>
                    <p><strong>⏰ Hour Splitting:</strong> If assigned to multiple active phases, hours are split evenly.</p>
                    <p><strong>💤 Idle Workers:</strong> Unassigned workers sit idle and don't contribute to any phase.</p>
                </div>
                
                ${phasesHTML}
                
                <div class="modal-actions">
                    <button class="btn btn-primary btn-save-phases">Save Assignments</button>
                    <button class="btn btn-secondary btn-cancel-phases">Cancel</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);


        // Handle save
        modal.querySelector('.btn-save-phases').addEventListener('click', () => {
            // Save phase-specific assignments
            phaseNames.forEach(phaseName => {
                const phase = project.phases[phaseName];
                if (!phase) return;

                // Collect checked members for this phase
                const phaseColumn = modal.querySelector(`.phase-assignment-column[data-phase-name="${phaseName}"]`);
                if (!phaseColumn) return;

                const assignedToPhase = [];
                const checkboxes = phaseColumn.querySelectorAll('input[type="checkbox"][data-phase-name="' + phaseName + '"]');
                
                checkboxes.forEach(checkbox => {
                    if (checkbox.checked) {
                        const memberId = checkbox.getAttribute('data-member-id');
                        if (memberId) {
                            assignedToPhase.push(memberId);
                        }
                    }
                });

                // Update phase team assignments
                phase.teamAssigned = assignedToPhase;
            });

            // Clear old project-level assignments (we're now phase-specific only)
            project.teamAssigned = [];

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
    
        // Update progress bar label
        const label = document.getElementById('dayProgressLabel');
        if (label) {
            label.textContent = timeString;
        }
        
        // Calculate progress (9 AM = 0%, 6 PM = 100%)
        const startHour = 9;
        const endHour = 18;
        const totalMinutes = (endHour - startHour) * 60; // 540 minutes
        const elapsedMinutes = ((hour - startHour) * 60) + minute;
        const progress = Math.min(100, Math.max(0, (elapsedMinutes / totalMinutes) * 100));
        
        // Update progress bar
        const bar = document.getElementById('dayProgressBar');
        if (bar) {
            bar.style.width = `${progress}%`;
            
            // Add pulsing animation when day is almost over (>90%)
            if (progress >= 90) {
                bar.classList.add('ending');
            } else {
                bar.classList.remove('ending');
            }
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

    function updatePauseButton() {
        const pauseBtn = document.getElementById('pauseBtn');
        if (!pauseBtn) return;
        
        const isPaused = window.isGamePaused && window.isGamePaused();
        const isManuallyPaused = window.GameState.isManuallyPaused;
        const isConversation = window.currentConversation !== null;
        const isGameOver = window.GameState.gameOver;
        
        // Disable button during conversation or game over
        if (isConversation || isGameOver) {
            pauseBtn.disabled = true;
            pauseBtn.style.opacity = '0.5';
            pauseBtn.style.cursor = 'not-allowed';
            
            // When conversation is active, show pause icon (game IS paused by conversation)
            // and tooltip should match the actual state
            if (isConversation) {
                pauseBtn.classList.remove('paused'); // Show pause icon (⏸️)
                if (isManuallyPaused) {
                    pauseBtn.title = 'Cannot resume during conversation';
                } else {
                    pauseBtn.title = 'Cannot pause during conversation';
                }
            } else if (isGameOver) {
                // Game over: show pause icon since game is stopped
                pauseBtn.classList.remove('paused');
                pauseBtn.title = 'Game over';
            }
        } else {
            // Button is enabled - show correct state based on manual pause
            pauseBtn.disabled = false;
            pauseBtn.style.opacity = '1';
            pauseBtn.style.cursor = 'pointer';
            
            if (isManuallyPaused) {
                pauseBtn.classList.add('paused');
                pauseBtn.title = 'Resume game (Space)';
            } else {
                pauseBtn.classList.remove('paused');
                pauseBtn.title = 'Pause game (Space)';
            }
        }
        
        // Update body class for global paused state
        if (isPaused) {
            document.body.classList.add('game-paused');
        } else {
            document.body.classList.remove('game-paused');
        }
    }

    function initPauseButton() {
        const pauseBtn = document.getElementById('pauseBtn');
        if (!pauseBtn) {
            console.warn('Pause button not found in DOM');
            return;
        }
        
        // Click handler
        pauseBtn.addEventListener('click', () => {
            if (pauseBtn.disabled) return;
            window.togglePause && window.togglePause();
        });
        
        // Keyboard handler (Space or P key)
        document.addEventListener('keydown', (e) => {
            // Ignore if typing in input field
            if (e.target.tagName === 'INPUT' || 
                e.target.tagName === 'TEXTAREA' || 
                e.target.isContentEditable) {
                return;
            }
            
            // Space or P key
            if (e.code === 'Space' || e.key === 'p' || e.key === 'P') {
                e.preventDefault(); // Prevent page scroll on space
                if (!pauseBtn.disabled) {
                    window.togglePause && window.togglePause();
                }
            }
        });
        
        // Initialize button state
        updatePauseButton();
        
        // Update button state periodically (in case of auto-pause)
        setInterval(updatePauseButton, 100);
        
        console.log('Pause button initialized');
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
        initDayProgressBar,
        updateClock,
        updatePauseButton,
        initPauseButton,
        highlightTeamMemberCard,
        showProjectCompletion,
        showWeekSummary,
        displayGameState,
        displayProjects,
        createProjectCard,
        displayTeam,
        createTeamMemberCard,
        createHoursIndicator,
        updateHoursIndicator,
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
        showPhaseAssignmentModal,
        advanceClock
    };
})();

// Expose on window for backward compatibility
window.initDayProgressBar = UIModule.initDayProgressBar;
window.updateClock = UIModule.updateClock;
window.updatePauseButton = UIModule.updatePauseButton;
window.initPauseButton = UIModule.initPauseButton;
window.highlightTeamMemberCard = UIModule.highlightTeamMemberCard;
window.showProjectCompletion = UIModule.showProjectCompletion;
window.showWeekSummary = UIModule.showWeekSummary;
window.displayGameState = UIModule.displayGameState;
window.displayProjects = UIModule.displayProjects;
window.createProjectCard = UIModule.createProjectCard;
window.displayTeam = UIModule.displayTeam;
window.createTeamMemberCard = UIModule.createTeamMemberCard;
window.createHoursIndicator = UIModule.createHoursIndicator;
window.updateHoursIndicator = UIModule.updateHoursIndicator;
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
window.showPhaseAssignmentModal = UIModule.showPhaseAssignmentModal;
window.advanceClock = UIModule.advanceClock;

