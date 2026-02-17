// Employee Sprites - Renders employees as animated circles
// Handles smooth movement, color changes, and visual effects
// Activity movement is COSMETIC ONLY - not tracked in game state

const EmployeeSprites = (function() {
    'use strict';

    const COLORS = {
        player: 0x845EF7,              // Purple for player
        teamMember: 0xFF6B6B,          // Red for idle workers
        teamMemberWorking: 0x51CF66,   // Green for working on project
        teamMemberMeeting: 0xFFA94D,   // Orange for coffee/bathroom
        textLight: 0x868E96,
        wall: 0x000000,
        nameBg: 0xF5F5F0
    };

    let container = null;
    let employeeMap = new Map();
    let positionCache = new Map();
    let activityTargets = new Map();
    let deskSeatAssignments = new Map();
    let memberActivities = new Map();     // Cosmetic only
    let activityTimers = new Map();       // Cosmetic only

    function init(parentContainer) {
        container = new PIXI.Container();
        parentContainer.addChild(container);
    }

    function getDeskSeatPosition(memberId, index, totalSeats) {
        const LAYOUT = window.OfficeScene ? window.OfficeScene.getLayout() : null;
        if (!LAYOUT) return { x: 200, y: 160 };

        const desk = LAYOUT.workersDesk;
        const padding = 12;

        // 4 corners of workers desk
        const corners = [
            { x: desk.x + padding, y: desk.y - padding },
            { x: desk.x + desk.width - padding, y: desk.y - padding },
            { x: desk.x + desk.width - padding, y: desk.y + desk.height + padding },
            { x: desk.x + padding, y: desk.y + desk.height + padding }
        ];

        const cornerIndex = index % corners.length;
        return corners[cornerIndex];
    }

    // COSMETIC: Random activity for visual variety
    function getRandomActivity(isUnassigned) {
        const rand = Math.random();

        if (isUnassigned) {
            // Idle workers wander more
            if (rand < 0.70) return 'sofa';
            if (rand < 0.85) return 'coffee';
            return 'bathroom';
        }

        // Working employees mostly at desk
        if (rand < 0.80) return 'desk';
        if (rand < 0.90) return 'bathroom';
        if (rand < 0.95) return 'coffee';
        return 'meeting';
    }

    // COSMETIC: How long to stay at each location
    function getActivityDuration(activity) {
        switch (activity) {
            case 'desk': return 20000 + Math.random() * 40000;      // 20-60 sec
            case 'bathroom': return 3000 + Math.random() * 5000;    // 3-8 sec
            case 'coffee': return 5000 + Math.random() * 10000;     // 5-15 sec
            case 'meeting': return 10000 + Math.random() * 20000;   // 10-30 sec
            case 'sofa': return 30000 + Math.random() * 60000;      // 30-90 sec
            default: return 20000;
        }
    }

    function getActivityPosition(activity, member, memberIndex, allIdleWorkers) {
        const LAYOUT = window.OfficeScene ? window.OfficeScene.getLayout() : null;
        if (!LAYOUT) return { x: 200, y: 160 };

        const meeting = LAYOUT.meetingRoom;
        const coffee = LAYOUT.coffeeArea;
        const bathroom = LAYOUT.toilet;
        const sofa = LAYOUT.sofa;

        switch (activity) {
            case 'sofa': {
                const idleIndex = allIdleWorkers ? allIdleWorkers.findIndex(m => m.id === member.id) : 0;
                const spacing = sofa.width / Math.max((allIdleWorkers ? allIdleWorkers.length + 1 : 2), 2);
                return {
                    x: sofa.x + spacing * (idleIndex + 1),
                    y: sofa.y + sofa.height / 2
                };
            }
            case 'bathroom':
                return {
                    x: bathroom.x + 30 + Math.random() * (bathroom.width - 60),
                    y: bathroom.y + 30 + Math.random() * (bathroom.height - 60)
                };
            case 'coffee': {
                const angle = Math.random() * Math.PI * 2;
                const dist = 15 + Math.random() * 20;
                return {
                    x: coffee.x + coffee.width / 2 + Math.cos(angle) * dist,
                    y: coffee.y + coffee.height / 2 + Math.sin(angle) * dist
                };
            }
            case 'meeting': {
                const angle = Math.random() * Math.PI * 2;
                const dist = 20 + Math.random() * 30;
                return {
                    x: meeting.x + meeting.width / 2 + Math.cos(angle) * dist,
                    y: meeting.y + meeting.height / 2 + Math.sin(angle) * dist
                };
            }
            case 'desk':
            default:
                return getDeskSeatPosition(member.id, memberIndex, 8);
        }
    }

    function getOrCreateActivityTarget(activity, member, seatIndex, idleWorkers) {
        const prev = activityTargets.get(member.id);
        if (prev && prev.activity === activity) {
            return { x: prev.x, y: prev.y };
        }
        const pos = getActivityPosition(activity, member, seatIndex, idleWorkers);
        activityTargets.set(member.id, { activity, x: pos.x, y: pos.y });
        return pos;
    }

    // Check if worker is assigned to any project (for color coding)
    function isWorkerAssigned(member) {
        let hasAssignment = false;
        if (window.GameState && window.GameState.projects) {
            window.GameState.projects.forEach(project => {
                if (!project.phases) return;
                ['management', 'design', 'development', 'review'].forEach(phaseName => {
                    const phase = project.phases[phaseName];
                    if (phase && phase.teamAssigned && phase.teamAssigned.includes(member.id)) {
                        hasAssignment = true;
                    }
                });
            });
        }
        return hasAssignment;
    }

    // Get current project name for a worker
    function getCurrentProject(member) {
        if (!window.GameState || !window.GameState.projects) return null;
        
        for (const project of window.GameState.projects) {
            if (!project.phases || project.status === 'complete') continue;
            
            for (const phaseName of ['management', 'design', 'development', 'review']) {
                const phase = project.phases[phaseName];
                if (phase && phase.teamAssigned && phase.teamAssigned.includes(member.id)) {
                    // Truncate long project names
                    const projectName = project.name || 'Unknown';
                    return projectName.length > 20 ? projectName.substring(0, 17) + '...' : projectName;
                }
            }
        }
        return null;
    }

    // COSMETIC: Update visual activity (purely for animation)
    function updateMemberActivity(member) {
        const unassigned = !isWorkerAssigned(member);
        const now = Date.now();
        const currentActivity = memberActivities.get(member.id) || 'desk';
        const activityTimer = activityTimers.get(member.id) || 0;

        if (now > activityTimer) {
            const newActivity = getRandomActivity(unassigned);
            memberActivities.set(member.id, newActivity);
            activityTimers.set(member.id, now + getActivityDuration(newActivity));
            return newActivity;
        }

        return currentActivity;
    }

    function getTeamMemberLocation(member) {
        if (!member || member.hasQuit || member.isIll) {
            return null;
        }

        const LAYOUT = window.OfficeScene ? window.OfficeScene.getLayout() : null;
        if (!LAYOUT) return { type: 'desk', x: 200, y: 160 };

        // Player always at their desk
        if (member.id === 'player') {
            return {
                type: 'playerDesk',
                x: LAYOUT.playerDesk.x + LAYOUT.playerDesk.width / 2,
                y: LAYOUT.playerDesk.y + 20
            };
        }

        const activeWorkers = window.GameState.team.filter(m => !m.hasQuit && !m.isIll && m.id !== 'player');
        const seatIndex = deskSeatAssignments.get(member.id) ?? activeWorkers.indexOf(member);

        if (seatIndex < 0 || !deskSeatAssignments.has(member.id)) {
            deskSeatAssignments.set(member.id, activeWorkers.indexOf(member));
        }

        const idleWorkers = activeWorkers.filter(m => !isWorkerAssigned(m));
        const currentActivity = updateMemberActivity(member);  // Cosmetic activity
        const position = getOrCreateActivityTarget(currentActivity, member, seatIndex, idleWorkers);

        return {
            type: currentActivity,
            x: position.x,
            y: position.y
        };
    }

    function getTeamMemberColor(member, location) {
        if (member.id === 'player') {
            return COLORS.player;
        }

        // Color by assignment status (what actually matters)
        if (isWorkerAssigned(member)) {
            return COLORS.teamMemberWorking;  // Green when working
        }

        // Idle workers are red
        if (location.type === 'sofa') {
            return COLORS.teamMember;  // Red when lounging
        }

        // Slightly different shade when on break
        if (location.type === 'bathroom' || location.type === 'coffee') {
            return COLORS.teamMemberMeeting;  // Orange during break
        }

        return COLORS.teamMember;  // Default red for unassigned
    }

    function createEmployeeSprite(member) {
        const spriteContainer = new PIXI.Container();
        const radius = member.id === 'player' ? 8 : 6;

        const circle = new PIXI.Graphics();
        circle.beginFill(0xFFFFFF);
        circle.drawCircle(0, 0, radius);
        circle.endFill();
        circle.lineStyle(2, COLORS.wall, 1);
        circle.drawCircle(0, 0, radius);

        spriteContainer.addChild(circle);

        // Info box style
        const textStyle = new PIXI.TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 9,
            fontWeight: '400',
            fill: 0x000000,
            align: 'left'
        });

        const infoContainer = new PIXI.Container();
        infoContainer.y = radius + 12;

        // Create text (will be updated later)
        const infoText = new PIXI.Text('', textStyle);
        infoText.anchor.set(0, 0);
        infoText.x = 5;
        infoText.y = 3;

        // Background box
        const infoBg = new PIXI.Graphics();
        
        infoContainer.addChild(infoBg);
        infoContainer.addChild(infoText);
        spriteContainer.addChild(infoContainer);

        spriteContainer.circle = circle;
        spriteContainer.infoText = infoText;
        spriteContainer.infoBg = infoBg;
        spriteContainer.infoContainer = infoContainer;

        return spriteContainer;
    }

    function updateEmployees(employees) {
        if (!container || !employees) return;

        const activeTeam = employees.filter(m => m && !m.hasQuit);

        activeTeam.forEach(member => {
            const location = getTeamMemberLocation(member);
            if (!location) {
                if (employeeMap.has(member.id)) {
                    const sprite = employeeMap.get(member.id);
                    container.removeChild(sprite);
                    sprite.destroy({ children: true });
                    employeeMap.delete(member.id);
                }
                return;
            }

            let sprite = employeeMap.get(member.id);
            if (!sprite) {
                sprite = createEmployeeSprite(member);
                employeeMap.set(member.id, sprite);
                container.addChild(sprite);
                sprite.x = location.x;
                sprite.y = location.y;
                positionCache.set(member.id, { x: location.x, y: location.y });
            }

            const currentPos = positionCache.get(member.id) || { x: sprite.x, y: sprite.y };
            const targetPos = location;
            const smoothing = location.type === 'desk' ? 0.2 : 0.05;

            // Smooth movement to target
            window.AnimationHelper.updatePosition(sprite, targetPos.x, targetPos.y, smoothing);
            positionCache.set(member.id, { x: sprite.x, y: sprite.y, ...targetPos });

            // Update color based on assignment status
            const color = getTeamMemberColor(member, location);
            sprite.circle.clear();
            sprite.circle.beginFill(color);
            sprite.circle.drawCircle(0, 0, member.id === 'player' ? 8 : 6);
            sprite.circle.endFill();
            sprite.circle.lineStyle(2, COLORS.wall, 1);
            sprite.circle.drawCircle(0, 0, member.id === 'player' ? 8 : 6);

            // Update info text
            const name = member.name || member.id;
            const morale = member.morale && member.morale.current !== undefined 
                ? Math.round(member.morale.current) 
                : '?';
            const project = getCurrentProject(member);
            
            let infoLines = [name];
            if (member.id !== 'player') {
                infoLines.push(`😊 ${morale}%`);
                if (project) {
                    infoLines.push(`📋 ${project}`);
                } else {
                    infoLines.push('💤 Idle');
                }
            } else {
                infoLines.push('🎯 Manager');
            }
            
            sprite.infoText.text = infoLines.join('\n');
            
            // Update background size
            const textMetrics = sprite.infoText.getBounds();
            const padding = 6;
            sprite.infoBg.clear();
            sprite.infoBg.beginFill(COLORS.nameBg, 0.95);
            sprite.infoBg.lineStyle(0.5, 0x000000, 1);
            sprite.infoBg.drawRoundedRect(
                0, 0, 
                textMetrics.width + padding * 2, 
                textMetrics.height + padding * 2, 
                3
            );
            sprite.infoBg.endFill();

            // Subtle transparency for different states
            if (location.type === 'coffee' || location.type === 'meeting') {
                sprite.alpha = 0.9;
            } else if (location.type === 'bathroom') {
                sprite.alpha = 0.7;
            } else {
                sprite.alpha = 1.0;
            }
        });

        // Remove sprites for quit/fired members
        employeeMap.forEach((sprite, memberId) => {
            if (!activeTeam.find(m => m.id === memberId)) {
                container.removeChild(sprite);
                sprite.destroy({ children: true });
                employeeMap.delete(memberId);
                positionCache.delete(memberId);
            }
        });
    }

    function getContainer() {
        return container;
    }

    function reset() {
        employeeMap.forEach(sprite => {
            if (sprite.parent) {
                sprite.parent.removeChild(sprite);
            }
            sprite.destroy({ children: true });
        });
        employeeMap.clear();
        positionCache.clear();
        activityTargets.clear();
        deskSeatAssignments.clear();
        memberActivities.clear();
        activityTimers.clear();
    }

    function destroy() {
        reset();
        if (container) {
            container.destroy({ children: true });
            container = null;
        }
    }

    return {
        init,
        updateEmployees,
        getContainer,
        reset,
        destroy
    };
})();

window.EmployeeSprites = EmployeeSprites;
