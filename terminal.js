function terminal({ fillText, fillRect, fillCanvas, fillStyle, size }) {

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

    const view = {
        offset: 0,
        max_offset: 0,
        scroll(n) {
            this.offset += n;
            if (this.offset < 0) this.offset = 0;
            this._render();
        },
        scrollMaybe({row}) {
            const viewTopLine = this.offset; 
            const viewBotLine = this.offset + size.rows - 1; 
            if (row < viewTopLine) {
                this.scroll(row - viewTopLine);
                
            } else if (row > viewBotLine) {
                this.scroll(viewTopLine - row);
    
            }
        },
        _render() {
            fill.canvas(color.background);
            for (let row = this.offset; row < this.offset + size.rows; row++) {
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
                row: row + view.offset,
                col
            };
        },
        local({row, col}) {
            return {
                row: row - view.offset,
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

    const mem = {
        memory: {},
        save({row, col}, char) {
            view.max_offset = Math.max(view.max_offset, row); // Track maxScroll
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

    const write = {
        path: ['/'],
        prompt() {
            const prompt = `${this.path.join("")}$ `;
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
            let pos = {...cursor.pos};
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
        pos: {row: 0, col: 0},
        clear() {
            fill.rect(to.local(this.pos), color.background);
        },
        draw() {
            fill.rect(to.local(this.pos), color.font);
        },
        move(vector, n) {
            if (n === undefined) n = 1;
            this.clear();
            mem.restore(this.pos);
            for (let i = 0; i < n; i++) {
                this.pos = move.pos(this.pos, vector);
            }
            this.draw();
        },
        newline() {
            this.pos = move.pos(this.pos, vec.DOWN);
            this.pos.col = 0;
        }
    };

    const cmd = {
        index: 0,
        lst: [[]],
        pos: {row: 0, col: 0}, // Start Position (global space)
        func: () => {}, // Assigned by bash via 'onCommand' export
        run(command) {
            return this.func(command);
        },
        clear() {
            cursor.clear();
            let pos = this.pos;
            for (let i = 0; i < this.lst[this.index].length; i++) {
                mem.delete(pos);
                fill.rect(to.local(pos), color.background);
                pos = move.pos(pos, vec.RIGHT);
            }
        },
        show() {
            cursor.pos = this.pos;
            const cmd = this.lst[this.index];
            write.text(cmd);
            cursor.pos = to.pos(to.number(cursor.pos) + cmd.length);
            cursor.draw();
        },
        insert(pos, char) {
            const cmdIndex = to.distance(to.local(this.pos), pos);
            const command = this.lst[this.index];
            let cpos = {...pos};
            for (let i = cmdIndex; i < command.length; i++) {
                cpos = move.pos(cpos, vec.RIGHT);
                fill.rect(cpos, color.background);
                write.char(cpos, command[i], color.font);
            }
            fill.rect(to.local(cursor.pos), color.background);
            write.char(to.local(cursor.pos), char, color.font);
            this.lst[this.index].splice(cmdIndex, 0, char);
        },
        delete(pos) {
            const cmdIndex = to.distance(to.local(this.pos), pos);
            const command = this.lst[this.index];
            let cpos = {...pos};
            for (let i = cmdIndex; i < command.length - 1; i++) {
                fill.rect(cpos, color.background);
                write.char(cpos, command[i + 1], color.font);
                cpos = move.pos(cpos, vec.RIGHT);
            }
            const cmdEnd = to.pos(to.number(to.local(this.pos)) + command.length - 1);
            mem.delete(to.global(cmdEnd));
            fill.rect(cmdEnd, color.background);
            this.lst[this.index].splice(cmdIndex, 1);
        }
    };

    function isPrintable(key) {
        const number  = "0123456789";
        const lo_alph = "abcdefghijklmnopqrstuvwxyz";
        const hi_alph = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const symb    = `!@#$%^&*()-_=+[{]};:'",<.>/?~ `;
        return `${number}${lo_alph}${hi_alph}${symb}`.indexOf(key) !== -1; 
    }

    function handleKeyDown(e) {
        
        const { key } = e;
        const cmd_offset = to.distance(to.local(cmd.pos), to.local(cursor.pos));

        if (isPrintable(key)) {
            cmd.insert(to.local(cursor.pos), key);
            cursor.move(vec.RIGHT);

        } else if (key === "ArrowUp") {
            cmd.clear();
            cmd.index += 1;
            cmd.index = Math.min(cmd.index, cmd.lst.length - 1);
            cmd.show(cmd.index);

        } else if (key === "ArrowDown") {
            cmd.clear();
            cmd.index -= 1;
            cmd.index = Math.max(cmd.index, 0);
            cmd.show(cmd.index);

        } else if (key === "ArrowLeft") {
            if (cmd_offset > 0) {
                cursor.move(vec.LEFT);
            }

        } else if (key === "ArrowRight") {
            if (cmd_offset < cmd.lst[cmd.index].length) {
                cursor.move(vec.RIGHT);
            }

        } else if (key === "Backspace") {
            if (cmd_offset > 0) {
                cursor.move(vec.LEFT);
                cmd.delete(to.local(cursor.pos));
                cursor.draw();
            }
            
        } else if (key === "Enter") {
            const command = cmd.lst[cmd.index];

            if (cmd.index !== 0) cmd.lst[0] = command;

            cursor.clear();
            cursor.newline();

            cmd.lst.unshift([]);
            cmd.index = 0;

            const { type, data } = cmd.run(command.join(""));

            if (type === "text") {
                write.text(data);
                cursor.pos = vec.add(cursor.pos, to.delta(data));
            }

            cursor.newline();
            write.prompt();
            cmd.pos = {...cursor.pos};

        } else {
            // console.log(key);

        }
    }

    function handleMouseWheel(e) {
        const { deltaY } = e;
        if (deltaY < 0) {
            view.scroll(-1);
            cursor.draw();
        } else {
            if (view.offset < view.max_offset) {
                view.scroll(1);
                cursor.draw();
            }
        }
    }

    function init() {
        fill.canvas(color.background);
        write.prompt();
        cmd.pos = {...cursor.pos};
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("wheel", handleMouseWheel);
    }

    return {
        init,
        onCommand: func => cmd.func = func
    };
}