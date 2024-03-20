function terminal({ init: initTextArea, fillText, fillRect, strokeRect, clearRect, clearCanvas, size }) {

    // State
    const state = {};
    state.cursorPos = null;
    state.charMemory = null; // map { (row, col) hash -> last entered character }

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

    function add(v1, v2) {
        return {
            row: v1.row + v2.row,
            col: v1.col + v2.col
        };
    }

    function isPrintable(key) {
        const lowAlph = "abcdefghijklmnopqrstuvwxyz";
        const highAlph = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const number = "0123456789";
        const symb = `!@#$%^&*()-_=+[{]};:'",<.>/?~ `;
        return `${lowAlph}${highAlph}${number}${symb}`.indexOf(key) !== -1; 
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
        state.charMemory[hashCoord(state.cursorPos)] = char;
        fillText(state.cursorPos.row, state.cursorPos.col, char);
    }

    function writeCharAtCoord(char, {row, col}) {
        state.charMemory[hashCoord({row, col})] = char;
        fillText(row, col, char);
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

    function moveCursor(dir) {
        const vec = lookupVecFromDir[dir];
        clearCursor();
        restoreChar(state.cursorPos);
        state.cursorPos = add(state.cursorPos, vec);
        drawCursor();
    }

    // Event handlers
    function handleKeyDown(e) {
        const { key } = e;
        if (isPrintable(key)) {
            writeAtCursor(key);
            moveCursor(cursorDir.RIGHT);

        } else if (key === "ArrowLeft") {
            moveCursor(cursorDir.LEFT);

        } else if (key === "ArrowRight") {
            moveCursor(cursorDir.RIGHT);

        } else if (key === "Backspace") {
            moveCursor(cursorDir.LEFT);
            deleteCharAtCursor();
            drawCursor();

        } else {
            console.log(key);

        }
    }

    function init() {
        state.cursorPos = {row: 0, col: 0};
        state.charMemory = {};
        drawCursor();
        window.addEventListener("keydown", handleKeyDown);
    }

    return {
        init
    };
}