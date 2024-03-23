function terminal({ fillText, fillRect, fillCanvas, fillStyle, size }) {

    // State
    const state = {};
    state.cursorPos = null;
    state.charMemory = null; // map { (row, col) hash -> last entered character }
    
    state.cmdIndex = null;
    state.cmds = null;
    
    state.path = null;

    state.cmdStartPos = null;

    state.cmdFunction = () => {};

    state.scroll = null;
    state.maxScroll = null;

    // Static
    const fontColor = 'white';
    const bkgColor = '#444444';

    const cursorDir = {
        UP: 0,
        RIGHT: 1,
        DOWN: 2,
        LEFT: 3
    };

    const lookupVecFromDir = [
        {row: -1, col: 0},
        {row: 0, col: 1},
        {row: 1, col: 0},
        {row: 0, col: -1}
    ];

    // Pure
    function hashCoord({row, col}) {
        return JSON.stringify({row, col});
    }

    function numberToPos(number) {
        return {
            row: Math.floor(number / size.cols),
            col: number % size.cols
        };
    }

    function eq(v1, v2) {
        return v1.row === v2.row && v1.col === v2.col;
    }

    function add(v1, v2) {
        return {
            row: v1.row + v2.row,
            col: v1.col + v2.col
        };
    }

    function sub(v1, v2) {
        return {
            row: v1.row - v2.row,
            col: v1.col - v2.col
        };
    }

    function charMagnitude({row, col}) {
        return row * size.cols + col;
    }

    function characterDistance(p1, p2) {
        return charMagnitude(p2) - charMagnitude(p1);
    }

    function isPrintable(key) {
        const lowAlph = "abcdefghijklmnopqrstuvwxyz";
        const highAlph = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const number = "0123456789";
        const symb = `!@#$%^&*()-_=+[{]};:'",<.>/?~ `;
        return `${lowAlph}${highAlph}${number}${symb}`.indexOf(key) !== -1; 
    }

    function renderScroll() {
        fillCanvasWithColor(bkgColor);
        for (let row = state.scroll; row < state.scroll + size.rows; row++) {
            for (let col = 0; col < size.cols; col++) {
                const char = getCharMemoryAbs({row, col});
                if (char !== null) writeCharAtCoord(char, {row: row - state.scroll, col});
            }
        }
    }

    function scroll(n) {
        state.scroll += n;
        if (state.scroll < 0) state.scroll = 0;
        renderScroll();
    }

    function scrollIfNecessary({ row, col }) {
        const viewTopLine = state.scroll; 
        const viewBotLine = state.scroll + size.rows - 1; 
        if (row < viewTopLine) {
            scroll(row - viewTopLine);
            
        } else if (row > viewBotLine) {
            scroll(viewTopLine - row);

        }
    }

    function movePos({row, col}, dir) {
        const vec = lookupVecFromDir[dir];
        let {row: nrow, col: ncol} = add({row, col}, vec);

        // Wrap coord if exceeds left/right bounds
        if (ncol >= size.cols) {
            nrow += 1;
            ncol = 0;

        } else if (ncol < 0) {
            nrow -= 1;
            ncol = size.cols - 1;

        }

        // Clamp row at top
        if (nrow < 0) nrow = 0;

        scrollIfNecessary({row: nrow, col: ncol});
        
        return {row: nrow, col: ncol};
    }

    // Helper
    function getPrompt() {
        return `${state.path.join("")}$ `;
    }

    function fillCanvasWithColor(color) {
        fillStyle(color);
        fillCanvas();
    }

    function fillRectWithColor(row, col, color) {
        fillStyle(color);
        fillRect(row, col);
    }

    function relativeFromAbsPos(cp) {
        return {
            row: cp.row - state.scroll,
            col: cp.col
        };
    }

    // Memory
    function saveCharMemory({row, col}, char) { // relative to viewport
        const globalRow = state.scroll + row;
        state.maxScroll = Math.max(state.maxScroll, globalRow);
        state.charMemory[hashCoord({row: globalRow, col})] = char;
    }

    function getCharMemory({row, col}) { // relative to viewport
        return getCharMemoryAbs({row: row + state.scroll, col})
    }

    function getCharMemoryAbs({row, col}) {
        const h = hashCoord({row, col});
        if (h in state.charMemory) return state.charMemory[h];
        return null;
    }

    function restoreChar({row, col}) {
        const char = getCharMemoryAbs({row, col});
        if (char !== null) writeCharAtCoord(char, {row: row - state.scroll, col});
    }

    function deleteCharMemory({row, col}) {
        delete state.charMemory[hashCoord({row: row + state.scroll, col})];
    }

    // Write
    function fillTextWithColor(row, col, char, color) {
        fillStyle(color);
        saveCharMemory({row, col}, char);
        fillText(row, col, char);
    }

    function writeCharAtCoord(char, {row, col}) {
        fillTextWithColor(row, col, char, fontColor);
    }

    function writeTextAtCursor(text) {
        let cp = state.cursorPos;
        for (let char of text) {
            if (char === "\n") {
                cp = movePos(cp, cursorDir.DOWN);
                cp.col = 0;
            } else {
                writeCharAtCoord(char, relativeFromAbsPos(cp));
                cp = movePos(cp, cursorDir.RIGHT);
            }
        }
    }

    function writePrompt() {
        const prompt = getPrompt();
        writeTextAtCursor(prompt);
        moveCursor(cursorDir.RIGHT, prompt.length);
        drawCursor();
    }

    // Cursor
    function clearCursor() {
        const cp = getCursorPosRelative();
        fillRectWithColor(cp.row, cp.col, bkgColor);
    }

    function drawCursor() {
        const cp = getCursorPosRelative();
        fillRectWithColor(cp.row, cp.col, fontColor);
    }

    function moveCursor(dir, times) {
        if (times === undefined) times = 1;
        clearCursor();
        restoreChar(state.cursorPos);
        for (let i = 0; i < times; i++) {
            state.cursorPos = movePos(state.cursorPos, dir);
        }
        drawCursor();
    }

    function cursorDeltaFromText(data) {
        const rows = data.split("\n");
        return {
            row: rows.length - 1, 
            col: rows[rows.length - 1].length
        };
    }

    function cursorNewLine() {
        state.cursorPos = movePos(state.cursorPos, cursorDir.DOWN);
        state.cursorPos.col = 0;
    }

    function getCursorPosRelative() {
        return {
            row: state.cursorPos.row - state.scroll,
            col: state.cursorPos.col
        };
    }

    // Cmd
    function cmdShiftInsertChar(cursorPos, char) {
        const cmdPos = getCommandPosRelative();
        const cmdIndex = characterDistance(cmdPos, cursorPos);
        const ccmd = state.cmds[state.cmdIndex];
        let cpos = {...cursorPos};
        for (let i = cmdIndex; i < ccmd.length; i++) {
            cpos = movePos(cpos, cursorDir.RIGHT);
            fillRectWithColor(cpos.row, cpos.col, bkgColor);
            writeCharAtCoord(ccmd[i], cpos);
        }
        fillRectWithColor(cursorPos.row, cursorPos.col, bkgColor);
        const cp = getCursorPosRelative();
        writeCharAtCoord(char, cp);
        state.cmds[state.cmdIndex].splice(cmdIndex, 0, char);
    }

    function cmdShiftDeleteChar(pos) {
        const cmdPos = getCommandPosRelative();
        const cmdIndex = characterDistance(cmdPos, pos);
        const ccmd = state.cmds[state.cmdIndex];
        let cpos = {...pos};
        for (let i = cmdIndex; i < ccmd.length - 1; i++) {
            fillRectWithColor(cpos.row, cpos.col, bkgColor);
            writeCharAtCoord(ccmd[i + 1], cpos);
            cpos = movePos(cpos, cursorDir.RIGHT);
        }
        const cmdEnd = numberToPos(charMagnitude(cmdPos) + ccmd.length - 1);
        deleteCharMemory(cmdEnd);
        fillRectWithColor(cmdEnd.row, cmdEnd.col, bkgColor);
        state.cmds[state.cmdIndex].splice(cmdIndex, 1);
    }

    function clearCmd() {
        clearCursor();
        let cmdPos = getCommandPosRelative();
        for (let i = 0; i < state.cmds[state.cmdIndex].length; i++) {
            deleteCharMemory(cmdPos);
            fillRectWithColor(cmdPos.row, cmdPos.col, bkgColor);
            cmdPos = movePos(cmdPos, cursorDir.RIGHT);
        }
    }

    function showCmd() {
        state.cursorPos = state.cmdStartPos;
        const cmd = state.cmds[state.cmdIndex];
        writeTextAtCursor(cmd);
        state.cursorPos = numberToPos(charMagnitude(state.cursorPos) + cmd.length);
        drawCursor();
    }

    function getCommandPosRelative() {
        return {
            row: state.cmdStartPos.row - state.scroll,
            col: state.cmdStartPos.col
        };
    }

    // Command Event
    function onCommand(cmd) {
        return state.cmdFunction(cmd);
    }

    // Event handlers
    function handleMouseWheel(e) {
        const { deltaY } = e;
        if (deltaY < 0) {
            scroll(-1);
            drawCursor();
        } else {
            if (state.scroll < state.maxScroll) {
                scroll(1);
                drawCursor();
            }
        }
    }

    function handleKeyDown(e) {
        
        const { key } = e;
        
        const cmdOffset = characterDistance(getCommandPosRelative(), getCursorPosRelative());

        if (isPrintable(key)) {
            cmdShiftInsertChar(getCursorPosRelative(), key);
            moveCursor(cursorDir.RIGHT);

        } else if (key === "ArrowUp") {
            clearCmd();
            state.cmdIndex += 1;
            state.cmdIndex = Math.min(state.cmdIndex, state.cmds.length - 1);
            showCmd(state.cmdIndex);

        } else if (key === "ArrowDown") {
            clearCmd();
            state.cmdIndex -= 1;
            state.cmdIndex = Math.max(state.cmdIndex, 0);
            showCmd(state.cmdIndex);

        } else if (key === "ArrowLeft") {
            if (cmdOffset > 0) {
                moveCursor(cursorDir.LEFT);
            }

        } else if (key === "ArrowRight") {
            if (cmdOffset < state.cmds[state.cmdIndex].length) {
                moveCursor(cursorDir.RIGHT);
            }

        } else if (key === "Backspace") {
            if (cmdOffset > 0) {
                moveCursor(cursorDir.LEFT);
                cmdShiftDeleteChar(getCursorPosRelative());
                drawCursor();
            }
            
        } else if (key === "Enter") {
            debugger
            const cmd = state.cmds[state.cmdIndex];

            if (state.cmdIndex !== 0) state.cmds[0] = cmd;

            clearCursor();
            cursorNewLine();

            state.cmds.unshift([]);
            state.cmdIndex = 0;

            const { type, data } = onCommand(cmd.join(""));

            if (type === "text") {
                writeTextAtCursor(data);
                state.cursorPos = add(state.cursorPos, cursorDeltaFromText(data));
            }

            cursorNewLine();
            writePrompt();
            state.cmdStartPos = {...state.cursorPos};

        } else {
            // console.log(key);

        }
    }

    function init() {
        fillCanvasWithColor(bkgColor);

        state.cursorPos = {row: 0, col: 0};
        state.charMemory = {}; // map { (row, col) hash -> last entered character }
        state.cmdIndex = 0;
        state.cmds = [[]];
        state.path = ["/"];
        state.scroll = 0;
        state.maxScroll = 0;

        writePrompt();
        state.cmdStartPos = {...state.cursorPos};
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("wheel", handleMouseWheel);
    }

    return {
        init,
        onCommand: func => state.cmdFunction = func
    };
}