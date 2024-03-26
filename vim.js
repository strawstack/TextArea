function vim({ registerCmd, fillText, fillRect, fillCanvas, fillStyle, size }) {

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
        memory: [],
        line_count: [], // A row in memory may occupy several visual lines
        save({row, col}, char) {
            this._expandMaybe({row});
            view.max_offset = this._max_offset(); // Track maxScroll
            const overwrite = col < this.memory[row].length;
            this.memory[row].splice(col, overwrite, char);
        },
        get({row, col}) {
            if (row < this.memory.length && col < this.memory[row].length) {
                return this.memory[row][col];
            }
            return null;
        },
        restore({row, col}) {
            const memoryRow = this._memoryRow(row);
            const char = this.get({row: memoryRow, col});
            if (char !== null) write.char(to.local({row: memoryRow, col}), char, color.font);
        },
        delete({row, col}) {
            this.memory[row].splice(col, 1);
        },
        delete_from({row, col}) {
            const data = this.memory[row];
            this.memory[row].splice(col, data.length - col);
        },
        _hash({row, col}) {
            return JSON.stringify({row, col});
        },
        _calculateLineCount() {
            const second_last = this.memory.length - 2;
            this.line_count.push(
                this._max_offset() +
                Math.max( // Ensure a count of at least one for empty lines
                    1,
                    Math.ceil(this.memory[second_last].length / size.cols)
                )
            );
        },
        _max_offset() {
            const last = this.line_count.length - 1;
            return (this.line_count.length === 0) ? 0 : this.line_count[last];
        },
        _workingLineCount() {
            const last = this.memory.length - 1;
            return Math.max( // Ensure a count of at least one for empty lines
                1,
                Math.ceil(this.memory[last].length / size.cols)
            );
        },
        _memoryRow(row) {
            for (let i = 0; i < this.line_count.length; i++) {
                if (row + 1 <= this.line_count[i]) return i;
            }
            return this.line_count.length;
        },
        _expandMaybe({row}) {
            for (let i = this.memory.length; i <= row; i++) {
                this.memory.push([]);
                if (i > 0) this._calculateLineCount();
            }
        }
    };

    const write = {
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

    function isPrintable(key) {
        const number  = "0123456789";
        const lo_alph = "abcdefghijklmnopqrstuvwxyz";
        const hi_alph = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const symb    = `!@#$%^&*()-_=+[{]};:'",<.>/?~ `;
        return `${number}${lo_alph}${hi_alph}${symb}`.indexOf(key) !== -1; 
    }

    function handleKeyDown(e, api) {
        
        const { key } = e;

        if (isPrintable(key)) {
            
            if (key === "q") {
                api.exit();
            }

        } else if (key === "ArrowUp") {
            cursor.move(vec.UP);

        } else if (key === "ArrowDown") {
            cursor.move(vec.DOWN);

        } else if (key === "ArrowLeft") {
            cursor.move(vec.LEFT);

        } else if (key === "ArrowRight") {
            cursor.move(vec.RIGHT);

        } else if (key === "Backspace") {
            
        } else if (key === "Enter") {

        } else {
            console.log(key);

        }
    }

    function handleMouseWheel(e) {
        const { deltaY } = e;
        
    }

    function init() {
        const start = api => {
            console.log("vim launches.");
            fill.canvas(color.background);
            write.text("This is vim. Press 'q' to quit.");
            window.addEventListener("keydown", e => handleKeyDown(e, api));
            window.addEventListener("wheel", handleMouseWheel);
        };

        registerCmd({
            name: "vim",
            call: args => {
                return {
                    type: "launch",
                    data: api => {
                        start(api);
                    }
                };   
            },
            info: "Launch vim"
        });
    }

    return {
        init
    };
}