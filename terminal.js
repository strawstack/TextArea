function terminal({ init: initTextArea, fillText, fillRect, strokeRect, clearRect, clearCanvas, size }) {

    // State
    const state = {};
    state.cursorPos = null;
    state.charMemory = null; // map { (row, col) hash -> last entered character }
    
    state.cmdIndex = null;
    state.cmds = null;
    
    state.path = null;

    state.cmdStartPos = null;

    // Static
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

        // Clamp row inside document
        if (nrow < 0) nrow = 0;
        if (nrow >= size.rows) nrow = size.rows - 1;

        return {row: nrow, col: ncol};
    }

    function getPrompt() {
        return `${state.path.join("")}$ `;
    }

    // Memory
    function getLastChar({row, col}) {
        const h = hashCoord({row, col});
        return (h in state.charMemory) ? state.charMemory[h] : null;
    }

    function restoreChar({row, col}) {
        const h = hashCoord({row, col});
        let char = null;
        if (h in state.charMemory) char = state.charMemory[h];
        if (char !== null) fillText(row, col, char);
    }

    // Write
    function writeAtCursor(char) {
        writeCharAtCoord(char, state.cursorPos);
    }

    function writeCharAtCoord(char, {row, col}) {
        state.charMemory[hashCoord({row, col})] = char;
        fillText(row, col, char);
    }

    function writeTextAtCursor(text) {
        let pos = state.cursorPos;
        for (let char of text) {
            writeCharAtCoord(char, pos);
            pos = movePos(pos, cursorDir.RIGHT);
        }
    }

    function writePrompt() {
        const prompt = getPrompt();
        writeTextAtCursor(prompt);
        moveCursor(cursorDir.RIGHT, prompt.length);
        drawCursor();
    }

    // Delete
    function deleteCharAtCursor() {
        const {row, col} = {...state.cursorPos};
        for (let cc = col; cc < size.cols - 1; cc++ ) {
            const char = getLastChar({row, col: cc + 1});
            
            clearRect(row, cc);
            delete state.charMemory[hashCoord({row, col: cc})];

            if (char === null) break;
            writeCharAtCoord(char, {row, col: cc});
        }
        clearRect(row, size.cols - 1);
    }

    // Cursor
    function clearCursor() {
        clearRect(state.cursorPos.row, state.cursorPos.col);
    }

    function drawCursor() {
        fillRect(state.cursorPos.row, state.cursorPos.col);
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

    function moveCursorToPos({row, col}) {
        clearCursor();
        restoreChar(state.cursorPos);
        state.cursorPos = {row, col};
        drawCursor();
    }

    // Cmd
    function updateCmd({row, col}, char) {
        const cmdIndex = characterDistance(state.cmdStartPos, {row, col});
        console.log(cmdIndex);
    }

    function removeFromCmd({row, col}, char) {

    }

    // Event handlers
    function handleKeyDown(e) {

        const { key } = e;
        
        if (isPrintable(key)) {
            writeAtCursor(key);
            updateCmd(state.cursorPos, key);
            moveCursor(cursorDir.RIGHT);

        } else if (key === "ArrowLeft") {
            moveCursor(cursorDir.LEFT);

        } else if (key === "ArrowRight") {
            moveCursor(cursorDir.RIGHT);

        } else if (key === "Backspace") {
            moveCursor(cursorDir.LEFT);
            deleteCharAtCursor();
            removeFromCmd(state.cursorPos, key);
            drawCursor();

        } else if (key === "Enter") {
            

        } else {
            console.log(key);

        }
    }

    function init() {
        state.cursorPos = {row: 0, col: 0};
        state.charMemory = {}; // map { (row, col) hash -> last entered character }
        state.cmdIndex = 0;
        state.cmds = [[]];
        state.path = ["/"];

        writePrompt();
        state.cmdStartPos = {...state.cursorPos};
        window.addEventListener("keydown", handleKeyDown);
    }

    return {
        init
    };
}