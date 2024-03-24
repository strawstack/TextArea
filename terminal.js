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
        LEFT: {row: 0, col: -1},
        add(v1, v2) {
            return {
                row: v1.row + v2.row,
                col: v1.col + v2.col
            };
        }
    };

    function isPrintable(key) {
        const number  = "0123456789";
        const lo_alph = "abcdefghijklmnopqrstuvwxyz";
        const hi_alph = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const symb    = `!@#$%^&*()-_=+[{]};:'",<.>/?~ `;
        return `${number}${lo_alph}${hi_alph}${symb}`.indexOf(key) !== -1; 
    }

    const view = {
        scroll(n) {
            state.scroll += n;
            if (state.scroll < 0) state.scroll = 0;
            this._render();
        },
        scrollMaybe({row}) {
            const viewTopLine = state.scroll; 
            const viewBotLine = state.scroll + size.rows - 1; 
            if (row < viewTopLine) {
                this.scroll(row - viewTopLine);
                
            } else if (row > viewBotLine) {
                this.scroll(viewTopLine - row);
    
            }
        },
        _render() {
            fill.canvas(color.background);
            for (let row = state.scroll; row < state.scroll + size.rows; row++) {
                for (let col = 0; col < size.cols; col++) {
                    const char = mem.get({row, col});
                    if (char !== null) write.char(to.local({row, col}), char, color.font);
                }
            }
        }
    };

    const move = {
        pos({row, col}, vector) {
            let {row: nrow, col: ncol} = vec.add({row, col}, vector);

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
    
            view.scrollMaybe({row: nrow});
            
            return {row: nrow, col: ncol};
        },
        cursor() {

        }
    };

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
        },
        delta(text) {
            const rows = text.split("\n");
            return {
                row: rows.length - 1, 
                col: rows[rows.length - 1].length
            };
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
            this.text(prompt);
            cursor.move(vec.RIGHT, prompt.length);
            cursor.draw();
        },
        char({row, col}, char, color) {
            fillStyle(color);
            mem.save(to.global({row, col}), char);
            fillText(row, col, char);
        },
        text(text) {
            let pos = {...state.cursorPos};
            for (let char of text) {
                if (char === "\n") {
                    pos = move.pos(pos, vec.DOWN);
                    pos.col = 0;
                } else {
                    write.char(to.local(pos), char, color.font);
                    pos = move.pos(pos, vec.RIGHT);
                }
            }
        }
    };

    const cursor = {
        clear() {
            fill.rect(to.local(state.cursorPos), color.background);
        },
        draw() {
            fill.rect(to.local(state.cursorPos), color.font);
        },
        move(vector, n) {
            if (n === undefined) n = 1;
            this.clear();
            mem.restore(state.cursorPos);
            for (let i = 0; i < n; i++) {
                state.cursorPos = move.pos(state.cursorPos, vector);
            }
            this.draw();
        },
        newline() {
            state.cursorPos = move.pos(state.cursorPos, vec.DOWN);
            state.cursorPos.col = 0;
        }
    };

    // Cmd
    const cmd = {
        clear() {
            cursor.clear();
            let pos = state.cmdStartPos;
            for (let i = 0; i < state.cmds[state.cmdIndex].length; i++) {
                mem.delete(pos);
                fill.rect(to.local(pos), color.background);
                pos = move.pos(pos, vec.RIGHT);
            }
        },
        show() {
            state.cursorPos = state.cmdStartPos;
            const cmd = state.cmds[state.cmdIndex];
            write.text(cmd);
            state.cursorPos = to.pos(charMagnitude(state.cursorPos) + cmd.length);
            cursor.draw();
        },
        run(command) {
            return state.cmdFunction(command);
        },
        insert(pos, char) {
            const cmdIndex = to.distance(to.local(state.cmdStartPos), pos);
            const command = state.cmds[state.cmdIndex];
            let cpos = {...pos};
            for (let i = cmdIndex; i < command.length; i++) {
                cpos = move.pos(cpos, vec.RIGHT);
                fill.rect(cpos, color.background);
                write.char(cpos, command[i], color.font);
            }
            fill.rect(to.local(state.cursorPos), color.background);
            write.char(to.local(state.cursorPos), char, color.font);
            state.cmds[state.cmdIndex].splice(cmdIndex, 0, char);
        },
        delete(pos) {
            const cmdIndex = to.distance(to.local(state.cmdStartPos), pos);
            const command = state.cmds[state.cmdIndex];
            let cpos = {...pos};
            for (let i = cmdIndex; i < command.length - 1; i++) {
                fill.rect(cpos, color.background);
                write.char(cpos, command[i + 1], color.font);
                cpos = move.pos(cpos, vec.RIGHT);
            }
            const cmdEnd = to.pos(to.number(to.local(state.cmdStartPos)) + command.length - 1);
            mem.delete(to.global(cmdEnd));
            fill.rect(cmdEnd, color.background);
            state.cmds[state.cmdIndex].splice(cmdIndex, 1);
        }
    };

    // Event handlers
    function handleMouseWheel(e) {
        const { deltaY } = e;
        if (deltaY < 0) {
            view.scroll(-1);
            cursor.draw();
        } else {
            if (state.scroll < state.maxScroll) {
                view.scroll(1);
                cursor.draw();
            }
        }
    }

    function handleKeyDown(e) {
        
        const { key } = e;
        
        const cmdOffset = to.distance(to.local(state.cmdStartPos), to.local(state.cursorPos));

        if (isPrintable(key)) {
            cmd.insert(to.local(state.cursorPos), key);
            cursor.move(vec.RIGHT);

        } else if (key === "ArrowUp") {
            cmd.clear();
            state.cmdIndex += 1;
            state.cmdIndex = Math.min(state.cmdIndex, state.cmds.length - 1);
            cmd.show(state.cmdIndex);

        } else if (key === "ArrowDown") {
            cmd.clear();
            state.cmdIndex -= 1;
            state.cmdIndex = Math.max(state.cmdIndex, 0);
            cmd.show(state.cmdIndex);

        } else if (key === "ArrowLeft") {
            if (cmdOffset > 0) {
                cursor.move(vec.LEFT);
            }

        } else if (key === "ArrowRight") {
            if (cmdOffset < state.cmds[state.cmdIndex].length) {
                cursor.move(vec.RIGHT);
            }

        } else if (key === "Backspace") {
            if (cmdOffset > 0) {
                cursor.move(vec.LEFT);
                cmd.delete(to.local(state.cursorPos));
                cursor.draw();
            }
            
        } else if (key === "Enter") {
            const command = state.cmds[state.cmdIndex];

            if (state.cmdIndex !== 0) state.cmds[0] = command;

            cursor.clear();
            cursor.newline();

            state.cmds.unshift([]);
            state.cmdIndex = 0;

            const { type, data } = cmd.run(command.join(""));

            if (type === "text") {
                write.text(data);
                state.cursorPos = vec.add(state.cursorPos, to.delta(data));
            }

            cursor.newline();
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