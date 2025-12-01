// UI rendering and interactions

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
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    const activeProjects = GameState.projects.filter(p => p.status !== 'complete');
    const upcomingDeadlines = activeProjects.filter(p => p.weeksRemaining < 2);

    modal.innerHTML = `
        <div class="modal-content week-summary">
            <h2>Week ${GameState.currentWeek} Summary</h2>

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
                    Average: ${GameState.teamMorale}%
                    ${GameState.team.filter(m => m.id !== 'player').map(m => `
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

            <button class="btn-primary btn-continue-week">Continue to Week ${GameState.currentWeek}</button>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.btn-continue-week').addEventListener('click', () => {
        modal.remove();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function displayGameState() {
    document.getElementById('currentWeek').textContent = GameState.currentWeek;
    document.getElementById('currentDay').textContent = GameState.currentDay;

    document.getElementById('money').textContent = `$${GameState.money.toLocaleString()}`;
    document.getElementById('teamMorale').textContent = `${GameState.teamMorale}%`;

    const avgSatisfaction = calculateAverageSatisfaction();
    document.getElementById('satisfaction').textContent = avgSatisfaction !== null ? `${Math.round(avgSatisfaction)}%` : '--';

    updateClock();
    displayProjects();
    displayTeam();
    updateNotificationBadge();
    checkUnassignedProjectsWarning();

    if (currentConversation === null) {
        updateMainContent();
    }
}

function displayProjects() {
    const container = document.getElementById('projectsContainer');
    container.innerHTML = '';

    if (GameState.projects.length === 0) {
        container.innerHTML = '<p style="color: #999; font-style: italic;">No active projects</p>';
        return;
    }

    GameState.projects.forEach(project => {
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

    const assignedMembers = GameState.team.filter(m => m.currentAssignment === project.id);
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
    `;

    if (!hasTeam && project.status !== 'complete') {
        card.classList.add('no-assignment-warning');
        card.classList.add('pulse-warning');
        const warning = document.createElement('div');
        warning.className = 'no-assignment-message';
        warning.innerHTML = `
            <span class="warning-icon-small">⚠️</span>
            <strong>NO TEAM ASSIGNED</strong> - This project won't progress!
            <br>
            <span class="warning-hint">Click a team member below and assign them to this project</span>
        `;
        card.appendChild(warning);
    }

    return card;
}

function displayTeam() {
    const container = document.getElementById('teamContainer');
    container.innerHTML = '';

    if (GameState.team.length === 0) {
        container.innerHTML = '<p style="color: #999; font-style: italic;">No team members available</p>';
        return;
    }

    GameState.team.forEach(member => {
        const status = getTeamMemberStatus(member.id);
        const memberCard = createTeamMemberCard(member, status);
        container.appendChild(memberCard);
    });
}

function createTeamMemberCard(member, status) {
    const card = document.createElement('div');
    card.className = `team-member-card ${status.assignmentClass}`;
    card.setAttribute('data-member-id', member.id);

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
        <div class="team-member-stats">
            <div class="team-member-skill">
                <strong>🎯 Skill:</strong>
                <span>${member.skill}/5</span>
            </div>
            <div class="team-member-morale">
                <strong>😊 Morale:</strong>
                <span>${member.morale.current}%</span>
            </div>
            <div class="team-member-hours">
                <strong>⏰ Hours:</strong>
                <span class="${member.hours <= 2 ? 'hours-low' : ''}">${(member.hours || 0).toFixed(1)}/8</span>
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
    const member = GameState.team.find(m => m.id === memberId);
    if (!member) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    const activeProjects = GameState.projects.filter(p => p.status !== 'complete');

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
            assignTeamMember(memberId, projectId);
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
    if (GameState.projects.length === 0) return null;

    const totalSatisfaction = GameState.projects.reduce((sum, project) => {
        return sum + project.satisfaction;
    }, 0);

    return totalSatisfaction / GameState.projects.length;
}

function updateMainContent() {
    const advanceBtn = document.getElementById('advanceDayBtn');
    if (advanceBtn) {
        advanceBtn.classList.remove('btn-disabled-while-conversation');
        advanceBtn.title = '';
    }

    if (currentConversation !== null) {
        return;
    }

    const contentArea = document.getElementById('contentArea');
    const activityFeed = document.getElementById('activityFeed');
    if (activityFeed) {
        const recentEvents = GameState.conversationHistory.slice(-5).reverse();
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
        contentArea.innerHTML = '<p class="welcome-message">Welcome to Agency Chaos Simulator! Click "Advance Day" to start.</p>';
    }
}

function displayConversation(conversation) {
    currentConversation = conversation;
    selectedChoiceId = null;
    currentConversationStartTime = Date.now();
    currentConversationMeta = {
        linkedProjectId: conversation.linkedProjectId,
        responseDeadlineHours: conversation.responseDeadlineHours
    };
    
    const player = GameState.team.find(m => m.id === 'player');
    if (player && player.hours > 0) {
        const hoursSpent = Math.min(player.hours, 0.5);
        player.hours = Math.max(0, player.hours - hoursSpent);
    }

    const advanceBtn = document.getElementById('advanceDayBtn');
    if (advanceBtn) {
        advanceBtn.classList.add('btn-disabled-while-conversation');
        advanceBtn.title = 'Respond to conversation first';
    }

    const contentArea = document.getElementById('contentArea');
    const choicesHtml = conversation.choices.map(choice => `
        <button class="choice-btn" data-choice-id="${choice.id}">
            <div class="choice-text">${choice.text}</div>
            <div class="consequence-hint">${formatConsequences(choice.consequences)}</div>
        </button>
    `).join('');

    contentArea.innerHTML = `
        <div class="conversation-container urgency-${conversation.urgency}">
            <div class="conversation-header">
                <div class="conversation-from">${conversation.from || 'Client'}</div>
                <div class="conversation-subject">${conversation.subject || 'Message'}</div>
                ${conversation.responseDeadlineHours ? `<div class="response-timer">Reply within ${conversation.responseDeadlineHours}h</div>` : ''}
            </div>
            <div class="conversation-body">${conversation.body}</div>
            <div class="conversation-choices">${choicesHtml}</div>
            <div class="conversation-actions">
                <button class="btn btn-secondary remind-btn">Remind me later</button>
                <button class="btn btn-primary send-response-btn" disabled>Send Response</button>
            </div>
        </div>
    `;

    contentArea.querySelectorAll('.choice-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            handleChoice(conversation.id, btn.getAttribute('data-choice-id'));
        });
    });

    const sendBtn = contentArea.querySelector('.send-response-btn');
    if (sendBtn) {
        sendBtn.addEventListener('click', () => submitConversationChoice());
    }

    const remindBtn = contentArea.querySelector('.remind-btn');
    if (remindBtn) {
        remindBtn.addEventListener('click', () => {
            const conversationContainer = contentArea.querySelector('.conversation-container');
            
            if (conversationContainer) {
                conversationContainer.classList.add('slide-out-right');
            }
            
            showSuccessToast('📌 Conversation postponed - I\'ll remind you later today', 2500);
            
            setTimeout(() => {
                deferConversation(conversation.id);
                currentConversation = null;
                selectedChoiceId = null;
                displayGameState();
                checkForConversations();
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
    const summary = formatConsequences(consequences);
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
        const project = GameState.projects.find(p => p.id === projectId);
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
        const count = GameState.conversationQueue.length;
        badge.textContent = count > 0 ? `${count} notification${count !== 1 ? 's' : ''}` : '0 notifications';
        badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
}

function checkUnassignedProjectsWarning() {
    const activeProjects = GameState.projects.filter(p => p.status !== 'complete');
    const unassignedProjects = activeProjects.filter(p => {
        const assignedMembers = GameState.team.filter(m => m.currentAssignment === p.id);
        return assignedMembers.length === 0;
    });

    let warningBanner = document.getElementById('unassignedProjectsWarning');
    
    if (unassignedProjects.length > 0 && !GameState.gameOver) {
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
    const modal = document.getElementById('resetModal');
    if (!modal) return;

    modal.style.display = 'flex';

    const confirmBtn = document.getElementById('resetConfirmBtn');
    const cancelBtn = document.getElementById('resetCancelBtn');

    const closeModal = () => {
        modal.style.display = 'none';
    };

    confirmBtn.onclick = () => {
        localStorage.removeItem('agencyChaosState');
        localStorage.removeItem('agencyChaosTutorial'); // Reset tutorial state too
        location.reload();
    };

    cancelBtn.onclick = closeModal;
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    }, { once: true });
}

function viewSummary() {
    const summary = `
=== AGENCY CHAOS SIMULATOR SUMMARY ===
Week: ${GameState.currentWeek} | Day: ${GameState.currentDay}
Money: $${GameState.money.toLocaleString()}
Team Morale: ${GameState.teamMorale}
Average Client Satisfaction: ${calculateAverageSatisfaction() !== null ? Math.round(calculateAverageSatisfaction()) + '%' : 'N/A'}

Active Projects: ${GameState.projects.filter(p => p.status !== 'complete').length}
Completed Projects: ${GameState.projects.filter(p => p.status === 'complete').length}

Team Members: ${GameState.team.length}
Pending Conversations: ${GameState.conversationQueue.length}
Conversation History: ${GameState.conversationHistory.length}
    `;

    alert(summary);
    console.log(summary);
}

function showEndGameScreen(endReason, victoryPath, score, rank, message) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay end-game-modal';
    
    const isVictory = endReason === 'victory';
    const pathClass = isVictory ? `victory-${victoryPath}` : 'defeat';
    
    const stats = GameState.gameStats;
    const avgSatisfaction = stats.projectsCompleted > 0 
        ? Math.round(stats.totalSatisfactionPoints / stats.projectsCompleted) 
        : 0;

    const keyMomentsHtml = GameState.keyMoments.slice(-10).map(moment => `
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
                            <span class="stat-value">${GameState.currentWeek}/12</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">💰 Final Money</span>
                            <span class="stat-value ${GameState.money >= 0 ? 'positive' : 'negative'}">$${GameState.money.toLocaleString()}</span>
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
                            <span class="stat-value">${GameState.teamMorale}%</span>
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

                ${GameState.keyMoments.length > 0 ? `
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
        const shareText = `Agency Chaos Simulator - ${rank}\nScore: ${score.toLocaleString()}\nProjects: ${stats.projectsCompleted} | Money: $${GameState.money.toLocaleString()} | Satisfaction: ${avgSatisfaction}%`;
        
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

function setupEventListeners() {
    document.getElementById('advanceDayBtn').addEventListener('click', () => {
        advanceDay();
        resumeTutorialAfterConversation();
    });

    document.getElementById('viewSummaryBtn').addEventListener('click', () => {
        viewSummary();
    });

    document.getElementById('testBtn').addEventListener('click', () => {
        console.log('Current Game State:', JSON.stringify(GameState, null, 2));
        console.log('Projects:', GameState.projects);
        console.log('Week:', GameState.currentWeek, 'Day:', GameState.currentDay);
    });

    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            showResetConfirmModal();
        });
    }

    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', showSettingsModal);
    }

    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', hideSettingsModal);
    }

    const helpBtn = document.getElementById('helpBtn');
    if (helpBtn) {
        helpBtn.addEventListener('click', () => {
            hideSettingsModal();
            showHelpModal();
        });
    }

    const closeHelpBtn = document.getElementById('closeHelpBtn');
    if (closeHelpBtn) {
        closeHelpBtn.addEventListener('click', hideHelpModal);
    }

    const creditsBtn = document.getElementById('creditsBtn');
    if (creditsBtn) {
        creditsBtn.addEventListener('click', () => {
            hideSettingsModal();
            showCreditsModal();
        });
    }

    const closeCreditsBtn = document.getElementById('closeCreditsBtn');
    if (closeCreditsBtn) {
        closeCreditsBtn.addEventListener('click', hideCreditsModal);
    }

    const highScoresBtn = document.getElementById('highScoresBtn');
    if (highScoresBtn) {
        highScoresBtn.addEventListener('click', () => {
            hideSettingsModal();
            showHighScoresModal();
        });
    }

    const restartGameBtn = document.getElementById('restartGameBtn');
    if (restartGameBtn) {
        restartGameBtn.addEventListener('click', () => {
            hideSettingsModal();
            showResetConfirmModal();
        });
    }

    const tutorialToggle = document.getElementById('tutorialToggle');
    if (tutorialToggle) {
        tutorialToggle.checked = tutorialState.enabled;
        tutorialToggle.addEventListener('change', (e) => {
            tutorialState.enabled = e.target.checked;
            saveTutorialState();
        });
    }

    initButtonAnimations();
}

function showSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'flex';
        const tutorialToggle = document.getElementById('tutorialToggle');
        if (tutorialToggle) {
            tutorialToggle.checked = tutorialState.enabled;
        }
    }
}

function hideSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) modal.style.display = 'none';
}

function showHelpModal() {
    const modal = document.getElementById('helpModal');
    if (modal) modal.style.display = 'flex';
}

function hideHelpModal() {
    const modal = document.getElementById('helpModal');
    if (modal) modal.style.display = 'none';
}

function showCreditsModal() {
    const modal = document.getElementById('creditsModal');
    if (modal) modal.style.display = 'flex';
}

function hideCreditsModal() {
    const modal = document.getElementById('creditsModal');
    if (modal) modal.style.display = 'none';
}

function showHighScoresModal() {
    const attempts = getGameAttempts();
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    
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
                    <span class="stat-value">${attempt.weeks}/12</span>
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
    
    modal.innerHTML = `
        <div class="modal-content high-scores-modal">
            <h2>🏆 Previous Attempts</h2>
            <div class="attempts-container">
                ${attemptsHtml}
            </div>
            <button class="btn btn-primary close-high-scores">Close</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.close-high-scores').addEventListener('click', () => {
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
        weeks: GameState.currentWeek,
        money: GameState.money,
        projectsCompleted: GameState.gameStats.projectsCompleted,
        avgSatisfaction: GameState.gameStats.projectsCompleted > 0 
            ? Math.round(GameState.gameStats.totalSatisfactionPoints / GameState.gameStats.projectsCompleted) 
            : 0,
        teamMorale: GameState.teamMorale
    };
    
    attempts.unshift(attempt);
    
    if (attempts.length > 10) {
        attempts.pop();
    }
    
    localStorage.setItem('agencyChaosAttempts', JSON.stringify(attempts));
}

function updateClock() {
    if (typeof GameState.currentHour !== 'number') {
        GameState.currentHour = 9;
    }
    
    const hour = GameState.currentHour;
    const isPM = hour >= 12;
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    const period = isPM ? 'PM' : 'AM';
    const timeString = `${displayHour}:00 ${period}`;
    
    const clockElement = document.getElementById('gameClock');
    const clockIcon = document.querySelector('.clock-icon');
    
    if (clockElement) {
        clockElement.textContent = timeString;
    }
    
    // Update clock icon based on time
    if (clockIcon) {
        const clockEmojis = ['🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛'];
        const emojiIndex = (hour % 12);
        clockIcon.textContent = clockEmojis[emojiIndex];
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
    GameState.currentHour = (GameState.currentHour + hoursToAdvance) % 24;
    
    // If we roll over midnight, reset to morning
    if (GameState.currentHour < 7) {
        GameState.currentHour = 9; // Reset to 9 AM for new day
    }
    
    updateClock();
}

