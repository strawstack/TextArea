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

    const color = {
        font: 'white',
        background: '#444444'
    };

    const vec = {
        UP: {row: -1, col: 0},
        RIGHT: {row: 0, col: 1},
        DOWN: {row: 1, col: 0},
        LEFT: {row: 0, col: -1}
    };

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

    function renderScroll() {
        fill.canvas(color.background);
        for (let row = state.scroll; row < state.scroll + size.rows; row++) {
            for (let col = 0; col < size.cols; col++) {
                const char = mem.get({row, col});
                if (char !== null) write.char(to.local({row, col}), char, color.font);
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

    function movePos({row, col}, vec) {
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

    const to = {
        global({row, col}) {
            return {
                row: row + state.scroll,
                col
            };
        },
        local({row, col}) {
            return {
                row: row - state.scroll,
                col
            };
        },
        pos(number) {
            return {
                row: Math.floor(number / size.cols),
                col: number % size.cols
            };
        },
        number({row, col}) {
            return row * size.cols + col;
        },
        distance(p1, p2) {
            return this.number(p2) - this.number(p1);
        }
    };

    const fill = {
        canvas(color) {
            fillStyle(color);
            fillCanvas();
        },
        rect({row, col}, color) {
            fillStyle(color);
            fillRect(row, col);
        }
    };

    // Memory
    const mem = {
        memory: {},
        save({row, col}, char) {
            state.maxScroll = Math.max(state.maxScroll, row); // Track maxScroll
            this.memory[this._hash({row, col})] = char;
        },
        get({row, col}) {
            const h = this._hash({row, col});
            if (h in this.memory) return this.memory[h];
            return null;
        },
        restore({row, col}) {
            const char = this.get({row, col});
            if (char !== null) write.char(to.local({row, col}), char, color.font);
        },
        delete({row, col}) {
            delete this.memory[this._hash({row, col})];
        },
        _hash({row, col}) {
            return JSON.stringify({row, col});
        }
    };

    // Write
    const write = {
        prompt() {
            const prompt = `${state.path.join("")}$ `;
            writeTextAtCursor(prompt);
            moveCursor(vec.RIGHT, prompt.length);
            drawCursor();
        },
        char({row, col}, char, color) {
            fillStyle(color);
            mem.save(to.global({row, col}), char);
            fillText(row, col, char);
        }
    }

    function writeTextAtCursor(text) {
        let pos = {...state.cursorPos};
        for (let char of text) {
            if (char === "\n") {
                pos = movePos(pos, vec.DOWN);
                pos.col = 0;
            } else {
                write.char(to.local(pos), char, color.font);
                pos = movePos(pos, vec.RIGHT);
            }
        }
    }

    // Cursor
    function clearCursor() {
        fill.rect(to.local(state.cursorPos), color.background);
    }

    function drawCursor() {
        fill.rect(to.local(state.cursorPos), color.font);
    }

    function moveCursor(vec, times) {
        if (times === undefined) times = 1;
        clearCursor();
        mem.restore(state.cursorPos);
        for (let i = 0; i < times; i++) {
            state.cursorPos = movePos(state.cursorPos, vec);
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
        state.cursorPos = movePos(state.cursorPos, vec.DOWN);
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
        const cmdIndex = to.distance(to.local(state.cmdStartPos), cursorPos);
        const command = state.cmds[state.cmdIndex];
        let cpos = {...cursorPos};
        for (let i = cmdIndex; i < command.length; i++) {
            cpos = movePos(cpos, vec.RIGHT);
            fill.rect(cpos, color.background);
            write.char(cpos, command[i], color.font);
        }
        fill.rect(cursorPos, color.background);
        const cp = getCursorPosRelative();
        write.char(cp, char, color.font);
        state.cmds[state.cmdIndex].splice(cmdIndex, 0, char);
    }

    function cmdShiftDeleteChar(pos) {
        const cmdIndex = to.distance(to.local(state.cmdStartPos), pos);
        const command = state.cmds[state.cmdIndex];
        let cpos = {...pos};
        for (let i = cmdIndex; i < command.length - 1; i++) {
            fill.rect(cpos, color.background);
            write.char(cpos, command[i + 1], color.font);
            cpos = movePos(cpos, vec.RIGHT);
        }
        const cmdEnd = to.pos(to.number(to.local(state.cmdStartPos)) + command.length - 1);
        mem.delete(to.global(cmdEnd));
        fill.rect(cmdEnd, color.background);
        state.cmds[state.cmdIndex].splice(cmdIndex, 1);
    }

    function clearCmd() {
        clearCursor();
        let pos = state.cmdStartPos;
        for (let i = 0; i < state.cmds[state.cmdIndex].length; i++) {
            mem.delete(pos);
            fill.rect(to.local(pos), color.background);
            pos = movePos(pos, vec.RIGHT);
        }
    }

    function showCmd() {
        state.cursorPos = state.cmdStartPos;
        const cmd = state.cmds[state.cmdIndex];
        writeTextAtCursor(cmd);
        state.cursorPos = to.pos(charMagnitude(state.cursorPos) + cmd.length);
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
        
        const cmdOffset = to.distance(to.local(state.cmdStartPos), to.local(state.cursorPos));

        if (isPrintable(key)) {
            cmdShiftInsertChar(getCursorPosRelative(), key);
            moveCursor(vec.RIGHT);

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
                moveCursor(vec.LEFT);
            }

        } else if (key === "ArrowRight") {
            if (cmdOffset < state.cmds[state.cmdIndex].length) {
                moveCursor(vec.RIGHT);
            }

        } else if (key === "Backspace") {
            if (cmdOffset > 0) {
                moveCursor(vec.LEFT);
                cmdShiftDeleteChar(getCursorPosRelative());
                drawCursor();
            }
            
        } else if (key === "Enter") {
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
            write.prompt();
            state.cmdStartPos = {...state.cursorPos};

        } else {
            // console.log(key);

        }
    }

    function init() {
        fill.canvas(color.background);

        state.cursorPos = {row: 0, col: 0};
        state.cmdIndex = 0;
        state.cmds = [[]];
        state.path = ["/"];
        state.scroll = 0;
        state.maxScroll = 0;

        write.prompt();
        state.cmdStartPos = {...state.cursorPos};
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("wheel", handleMouseWheel);
    }

    return {
        init,
        onCommand: func => state.cmdFunction = func
    };
}