// Conversation management logic

let currentConversation = null;
let selectedChoiceId = null;
let currentConversationStartTime = null;
let currentConversationMeta = null;

function recordConversationResponse(conversation) {
    if (!conversation || currentConversationStartTime === null) return;
    const elapsedHours = (Date.now() - currentConversationStartTime) / (1000 * 60 * 60);
    const meta = currentConversationMeta || {};
    const linkedProjectId = meta.linkedProjectId || conversation.linkedProjectId || conversation.projectId;
    if (linkedProjectId) {
        const project = GameState.projects.find(p => p.id === linkedProjectId);
        if (project) {
            project.lastResponseHours = elapsedHours;
            const responseDeadline = meta.responseDeadlineHours || conversation.responseDeadlineHours;
            if (responseDeadline) {
                const delta = elapsedHours - responseDeadline;
                if (delta > 0) {
                    project.satisfaction = Math.max(0, project.satisfaction - Math.round(delta * 1.5));
                } else {
                    project.satisfaction = Math.min(100, project.satisfaction + 3);
                }
            }
            updateProjectSatisfaction(project);
        }
    }
    currentConversationStartTime = null;
    currentConversationMeta = null;
}

function triggerClientEvent(projectId, eventType) {
    const project = GameState.projects.find(p => p.id === projectId);
    if (!project) return;

    const eventMap = {
        scope_warning: 'scope_creep_techcorp',
        payment_issue: 'payment_delayed'
    };

    const conversationId = eventMap[eventType];
    if (conversationId) {
        queueConversation(conversationId);
    } else {
        console.log(`Client event (${eventType}) logged for ${project.name}`);
    }
}

function deferConversation(conversationId) {
    GameState.deferredConversations[conversationId] = {
        week: GameState.currentWeek,
        day: GameState.currentDay
    };
}

function isConversationDeferred(conversationId) {
    const entry = GameState.deferredConversations[conversationId];
    if (!entry) return false;
    return entry.week === GameState.currentWeek && entry.day === GameState.currentDay;
}

function purgeDeferredConversations() {
    Object.entries(GameState.deferredConversations).forEach(([id, entry]) => {
        if (entry.week !== GameState.currentWeek || entry.day !== GameState.currentDay) {
            delete GameState.deferredConversations[id];
        }
    });
}

function getCurrentConversations() {
    return AllConversations.filter(conv => {
        if (conv.week === 0 && conv.day === 0) return false;

        const matchesTime = conv.week === GameState.currentWeek && conv.day === GameState.currentDay;

        const notResolved = !GameState.resolvedConversations.includes(conv.id);

        return matchesTime && notResolved;
    });
}

function checkForConversations() {
    const conversations = getCurrentConversations().filter(conv => !isConversationDeferred(conv.id));

    if (conversations.length > 0) {
        conversations.slice(1).forEach(conv => {
            queueConversation(conv.id);
        });

        displayConversation(conversations[0]);
    } else if (GameState.conversationQueue.length > 0 && currentConversation === null) {
        const nextConvId = GameState.conversationQueue.shift();
        const nextConv = AllConversations.find(c => c.id === nextConvId);
        if (nextConv) {
            displayConversation(nextConv);
        }
    }
}

function queueConversation(conversationId) {
    if (!GameState.conversationQueue.includes(conversationId)) {
        GameState.conversationQueue.push(conversationId);
        updateNotificationBadge();
    }
}

function handleChoice(conversationId, choiceId) {
    if (!currentConversation || currentConversation.id !== conversationId) {
        console.warn('Conversation mismatch or no active conversation');
        return;
    }

    selectedChoiceId = choiceId;
    const choiceButtons = document.querySelectorAll('.choice-btn');
    choiceButtons.forEach(btn => {
        if (btn.dataset.choiceId === choiceId) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });

    const sendBtn = document.querySelector('.send-response-btn');
    if (sendBtn) {
        sendBtn.disabled = false;
    }
}

function submitConversationChoice() {
    if (!currentConversation || !selectedChoiceId) return;

    const choice = currentConversation.choices.find(c => c.id === selectedChoiceId);
    if (!choice) return;

    const player = GameState.team.find(m => m.id === 'player');
    if (player && player.hours > 0) {
        const hoursSpent = Math.min(player.hours, 0.5);
        player.hours = Math.max(0, player.hours - hoursSpent);
    }

    recordConversationResponse(currentConversation);
    applyConsequences(choice.consequences || {}, currentConversation);
    showConsequenceFeedback(choice.flavorText || '', choice.consequences || {});

    GameState.resolvedConversations.push(currentConversation.id);
    currentConversation = null;
    selectedChoiceId = null;

    displayGameState();
    saveState();

    setTimeout(() => {
        checkForConversations();
    }, 600);
}

function applyConsequences(consequences, conversation) {
    if (!consequences) return;

    if (typeof consequences.money === 'number') {
        const oldMoney = GameState.money;
        GameState.money += consequences.money;
        animateResourceChange('money', oldMoney, GameState.money);
    }

    if (consequences.teamMorale !== undefined) {
        const oldMorale = GameState.teamMorale;
        applyTeamMoraleConsequence(consequences.teamMorale);
        animateResourceChange('teamMorale', oldMorale, GameState.teamMorale);
    }

    if (consequences.projectProgress) {
        const project = GameState.projects.find(p => p.id === (consequences.projectProgress.projectId || conversation?.linkedProjectId));
        if (project && project.status !== 'complete') {
            const oldProgress = project.progress;
            project.progress = Math.max(0, Math.min(1, project.progress + (consequences.projectProgress.delta || 0)));
            updateProjectSatisfaction(project);
            highlightProject(project.id);
            console.log(`Project progress updated for ${project.name}: ${Math.round(oldProgress * 100)}% -> ${Math.round(project.progress * 100)}%`);
        }
    }

    if (consequences.clientSatisfaction) {
        const project = GameState.projects.find(p => p.id === (consequences.clientSatisfaction.projectId || conversation?.linkedProjectId));
        if (project) {
            const delta = consequences.clientSatisfaction.delta || 0;
            project.satisfaction = Math.max(0, Math.min(100, project.satisfaction + delta));
            updateProjectSatisfaction(project);
        }
    }

    if (consequences.scopeChange) {
        handleScopeCreepRequest(consequences.scopeChange);
    }

    if (consequences.spawnConversations) {
        consequences.spawnConversations.forEach(convId => queueConversation(convId));
    }

    if (consequences.addProject) {
        const templateId = consequences.addProject.templateId;
        const template = AllProjectTemplates.find(t => t.id === templateId);
        if (template) {
            const newProject = buildProjectFromTemplate(template, {
                id: `proj-${Date.now()}`,
                progress: 0,
                weeksRemaining: template.totalWeeks
            });
            GameState.projects.push(hydrateProject(newProject));
            showSuccessToast(`📋 New project added: ${template.name}`, 3000);
        }
    }
}

function triggerTeamEvent(target, eventType) {
    const member = typeof target === 'string' ? getTeamMemberById(target) : target;
    if (!member) return;

    const eventMap = {
        low_morale: `team_low_morale_${member.id}`,
        high_morale: `team_high_morale_${member.id}`,
        perfectionist_polish: 'mike_extension_request',
        pragmatic_scope: 'sarah_scope_suggestion',
        eager_help: 'alex_needs_help',
        eager_conflict: 'team_conflict',
        eager_brilliant: 'alex_brilliant_idea'
    };

    const conversationId = eventMap[eventType];
    if (!conversationId) {
        console.log(`Team event triggered without conversation: ${eventType}`);
        return;
    }
    queueConversation(conversationId);
}

function checkTeamEvents() {
    GameState.team.forEach(member => {
        if (member.id === 'player') return;

        if (member.personality.type === 'perfectionist' && member.currentAssignment && Math.random() < 0.05) {
            triggerTeamEvent(member, 'perfectionist_polish');
        }

        if (member.personality.type === 'pragmatic' && member.currentAssignment && Math.random() < 0.05) {
            triggerTeamEvent(member, 'pragmatic_scope');
        }

        if (member.personality.type === 'eager' && member.currentAssignment && Math.random() < 0.08) {
            triggerTeamEvent(member, 'eager_help');
        }

        if (member.personality.type === 'eager' && member.currentAssignment && Math.random() < 0.04) {
            triggerTeamEvent(member, 'eager_brilliant');
        }
    });

    const mike = getTeamMemberById('mike_designer');
    const alex = getTeamMemberById('alex_junior');
    if (mike && alex && mike.currentAssignment && mike.currentAssignment === alex.currentAssignment && Math.random() < 0.03) {
        triggerTeamEvent(mike, 'eager_conflict');
    }
}

function checkTeamPulse() {
    const lowMoraleMembers = GameState.team.filter(m =>
        m.id !== 'player' && m.morale.current < 40
    );

    const burnedOutMembers = GameState.team.filter(m =>
        m.id !== 'player' && m.morale.current < 5
    );

    if (burnedOutMembers.length > 0) {
        burnedOutMembers.forEach(member => {
            if (!member.hasQuit) {
                member.hasQuit = true;
                GameState.gameStats.teamMemberQuits++;
                recordKeyMoment('Team Member Quit', `${member.name} left the agency due to burnout`, 'failure');
                GameState.conversationHistory.push({
                    title: `${member.name} Quit`,
                    message: `${member.name} couldn't take it anymore and left the agency.`,
                    type: 'error',
                    timestamp: `Week ${GameState.currentWeek}, Day ${GameState.currentDay}`
                });
            }
        });
    }

    if (lowMoraleMembers.length > 0 && burnedOutMembers.length === 0) {
        const pulseConv = AllConversations.find(c => c.id === 'team_pulse_check');
        if (pulseConv) {
            const dynamicConv = {
                ...pulseConv,
                week: GameState.currentWeek,
                day: GameState.currentDay,
                body: `
                It's the end of the week and a few folks look worn down:<br>
                ${lowMoraleMembers.map(m => `• <strong>${m.name}</strong> (${m.morale.current}%)`).join('<br>')}<br><br>
                How do you want to respond?`
            };
            displayConversation(dynamicConv);
        }
    }
}

