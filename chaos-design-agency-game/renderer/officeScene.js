// Office Scene - Renders static office layout (walls, desks, rooms)
// Mini Metro style: minimal geometric shapes

const OfficeScene = (function() {
    'use strict';

    const COLORS = {
        background: 0xF5F5F5,
        wall: 0x000000,
        floor: 0xF5F5F5,
        desk: 0xFFFFFF,
        deskStroke: 0x000000,
        meetingRoom: 0xE8F4E8,
        meetingRoomStroke: 0x000000,
        playerDesk: 0xFFE8CC,
        playerDeskStroke: 0x000000,
        toilet: 0xE8F0FF,
        toiletStroke: 0x000000,
        window: 0xFFFFFF,
        windowStroke: 0x000000,
        door: 0xFFFFFF,
        doorStroke: 0x000000,
        coffee: 0xFFF5E6,
        sofa: 0xC9ADA7
    };

    const LAYOUT = {
        room: { x: 20, y: 20, width: 760, height: 460 },
        walls: [
            { x1: 20, y1: 20, x2: 780, y2: 20 },
            { x1: 780, y1: 20, x2: 780, y2: 480 },
            { x1: 780, y1: 480, x2: 20, y2: 480 },
            { x1: 20, y1: 480, x2: 20, y2: 20 }
        ],
        windows: [
            { x: 100, y: 20, width: 150, height: 8 },
            { x: 300, y: 20, width: 150, height: 8 },
            { x: 500, y: 20, width: 150, height: 8 }
        ],
        door: { x: 20, y: 200, width: 8, height: 80 },
        workersDesk: { x: 100, y: 100, width: 300, height: 120 },
        meetingRoom: { x: 550, y: 100, width: 180, height: 150 },
        playerDesk: { x: 450, y: 100, width: 80, height: 120 },
        toilet: { x: 550, y: 300, width: 180, height: 130 },
        coffeeArea: { x: 100, y: 350, width: 100, height: 80 },
        sofa: { x: 250, y: 350, width: 150, height: 60 }
    };

    let container = null;
    let floorGraphics = null;
    let wallsGraphics = null;
    let roomsGraphics = null;
    let labelsContainer = null;

    function init(parentContainer) {
        container = new PIXI.Container();
        parentContainer.addChild(container);

        floorGraphics = new PIXI.Graphics();
        wallsGraphics = new PIXI.Graphics();
        roomsGraphics = new PIXI.Graphics();
        labelsContainer = new PIXI.Container();

        container.addChild(floorGraphics);
        container.addChild(roomsGraphics);
        container.addChild(wallsGraphics);
        container.addChild(labelsContainer);

        drawFloor();
        drawWalls();
        drawRooms();
        drawLabels();
    }

    function drawFloor() {
        const floor = LAYOUT.room;
        floorGraphics.clear();
        floorGraphics.beginFill(COLORS.floor);
        floorGraphics.drawRect(floor.x, floor.y, floor.width, floor.height);
        floorGraphics.endFill();
    }

    function drawWalls() {
        wallsGraphics.clear();
        wallsGraphics.lineStyle(4, COLORS.wall, 1, 0.5);

        LAYOUT.walls.forEach(wall => {
            wallsGraphics.moveTo(wall.x1, wall.y1);
            wallsGraphics.lineTo(wall.x2, wall.y2);
        });

        LAYOUT.windows.forEach(win => {
            wallsGraphics.beginFill(COLORS.window);
            wallsGraphics.lineStyle(3, COLORS.windowStroke, 1);
            wallsGraphics.drawRect(win.x, win.y, win.width, win.height);
            wallsGraphics.endFill();
        });

        const door = LAYOUT.door;
        wallsGraphics.beginFill(COLORS.door);
        wallsGraphics.lineStyle(3, COLORS.doorStroke, 1);
        wallsGraphics.drawRect(door.x, door.y, door.width, door.height);
        wallsGraphics.endFill();
    }

    function drawRooms() {
        roomsGraphics.clear();

        const meetingRoom = LAYOUT.meetingRoom;
        roomsGraphics.beginFill(COLORS.meetingRoom);
        roomsGraphics.lineStyle(3, COLORS.meetingRoomStroke, 1);
        roomsGraphics.drawRect(meetingRoom.x, meetingRoom.y, meetingRoom.width, meetingRoom.height);
        roomsGraphics.endFill();

        const toilet = LAYOUT.toilet;
        roomsGraphics.beginFill(COLORS.toilet);
        roomsGraphics.lineStyle(3, COLORS.toiletStroke, 1);
        roomsGraphics.drawRect(toilet.x, toilet.y, toilet.width, toilet.height);
        roomsGraphics.endFill();

        const workersDesk = LAYOUT.workersDesk;
        roomsGraphics.beginFill(COLORS.desk);
        roomsGraphics.lineStyle(3, COLORS.deskStroke, 1);
        roomsGraphics.drawRect(workersDesk.x, workersDesk.y, workersDesk.width, workersDesk.height);
        roomsGraphics.endFill();

        const playerDesk = LAYOUT.playerDesk;
        roomsGraphics.beginFill(COLORS.playerDesk);
        roomsGraphics.lineStyle(3, COLORS.playerDeskStroke, 1);
        roomsGraphics.drawRect(playerDesk.x, playerDesk.y, playerDesk.width, playerDesk.height);
        roomsGraphics.endFill();

        const coffee = LAYOUT.coffeeArea;
        roomsGraphics.beginFill(COLORS.coffee);
        roomsGraphics.lineStyle(2, COLORS.deskStroke, 1);
        roomsGraphics.drawRect(coffee.x, coffee.y, coffee.width, coffee.height);
        roomsGraphics.endFill();

        const sofa = LAYOUT.sofa;
        roomsGraphics.beginFill(COLORS.sofa);
        roomsGraphics.lineStyle(2, COLORS.deskStroke, 1);
        roomsGraphics.drawRect(sofa.x, sofa.y, sofa.width, sofa.height);
        roomsGraphics.endFill();

        drawLaptops();
    }

    function drawLaptops() {
        const playerDesk = LAYOUT.playerDesk;
        drawLaptop(roomsGraphics, playerDesk.x + playerDesk.width / 2, playerDesk.y + 55, COLORS.playerDeskStroke);

        const workersDesk = LAYOUT.workersDesk;
        const laptopPositions = [
            { x: workersDesk.x + 60, y: workersDesk.y + 25 },
            { x: workersDesk.x + workersDesk.width - 60, y: workersDesk.y + 25 },
            { x: workersDesk.x + workersDesk.width - 60, y: workersDesk.y + workersDesk.height - 25 },
            { x: workersDesk.x + 60, y: workersDesk.y + workersDesk.height - 25 }
        ];

        laptopPositions.forEach(pos => {
            drawLaptop(roomsGraphics, pos.x, pos.y, COLORS.deskStroke);
        });
    }

    function drawLaptop(graphics, x, y, strokeColor) {
        const laptopWidth = 24;
        const laptopHeight = 18;

        graphics.beginFill(0x2C2C2C);
        graphics.lineStyle(0.5, strokeColor, 1);
        graphics.drawRoundedRect(x - laptopWidth / 2, y, laptopWidth, laptopHeight / 2, 1);
        graphics.endFill();

        graphics.beginFill(0xE8E8E8);
        graphics.lineStyle(0.8, 0x2C2C2C, 1);
        graphics.drawRoundedRect(x - laptopWidth / 2, y - laptopHeight / 2 + 1, laptopWidth, laptopHeight / 2, 0.5);
        graphics.endFill();

        graphics.beginFill(0xA8D5FF, 0.6);
        graphics.drawRoundedRect(x - laptopWidth / 2 + 1, y - laptopHeight / 2 + 2, laptopWidth - 2, laptopHeight / 2 - 2, 0.5);
        graphics.endFill();
    }

    function drawLabels() {
        labelsContainer.removeChildren();

        const style = new PIXI.TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 12,
            fontWeight: '600',
            fill: 0x000000,
            align: 'center'
        });

        const smallStyle = new PIXI.TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 10,
            fontWeight: '600',
            fill: 0x000000,
            align: 'center'
        });

        const lightStyle = new PIXI.TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 10,
            fontWeight: '600',
            fill: 0x868E96,
            align: 'center'
        });

        const meetingRoom = LAYOUT.meetingRoom;
        const meetingText = new PIXI.Text('MEETING', style);
        meetingText.anchor.set(0.5);
        meetingText.x = meetingRoom.x + meetingRoom.width / 2;
        meetingText.y = meetingRoom.y + meetingRoom.height / 2;
        labelsContainer.addChild(meetingText);

        const toilet = LAYOUT.toilet;
        const toiletText = new PIXI.Text('RESTROOM', style);
        toiletText.anchor.set(0.5);
        toiletText.x = toilet.x + toilet.width / 2;
        toiletText.y = toilet.y + toilet.height / 2;
        labelsContainer.addChild(toiletText);

        const coffee = LAYOUT.coffeeArea;
        const coffeeText = new PIXI.Text('☕ COFFEE', smallStyle);
        coffeeText.anchor.set(0.5);
        coffeeText.x = coffee.x + coffee.width / 2;
        coffeeText.y = coffee.y + coffee.height / 2;
        labelsContainer.addChild(coffeeText);

        const sofa = LAYOUT.sofa;
        const sofaText = new PIXI.Text('IDLE AREA', lightStyle);
        sofaText.anchor.set(0.5);
        sofaText.x = sofa.x + sofa.width / 2;
        sofaText.y = sofa.y - 8;
        labelsContainer.addChild(sofaText);

        const workersDesk = LAYOUT.workersDesk;
        const deskText = new PIXI.Text('TEAM DESKS', new PIXI.TextStyle({
            fontFamily: 'Arial, sans-serif',
            fontSize: 11,
            fontWeight: '600',
            fill: 0x868E96,
            align: 'center'
        }));
        deskText.anchor.set(0.5);
        deskText.x = workersDesk.x + workersDesk.width / 2;
        deskText.y = workersDesk.y + workersDesk.height / 2;
        labelsContainer.addChild(deskText);

        const playerDesk = LAYOUT.playerDesk;
        const playerText = new PIXI.Text('YOU', smallStyle);
        playerText.anchor.set(0.5);
        playerText.x = playerDesk.x + playerDesk.width / 2;
        playerText.y = playerDesk.y + playerDesk.height / 2;
        labelsContainer.addChild(playerText);
    }

    function getLayout() {
        return LAYOUT;
    }

    function getContainer() {
        return container;
    }

    function destroy() {
        if (container) {
            container.destroy({ children: true });
            container = null;
            floorGraphics = null;
            wallsGraphics = null;
            roomsGraphics = null;
            labelsContainer = null;
        }
    }

    return {
        init,
        getLayout,
        getContainer,
        destroy
    };
})();

window.OfficeScene = OfficeScene;









