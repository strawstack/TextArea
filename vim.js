function vim({ registerCmd, fillText, fillRect, fillCanvas, fillStyle, size }) {

    // Set by 'start' inside 'init' below
    let api = {};

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
        }, 
        eq(v1, v2) {
            return v1.row === v2.row && v1.col === v2.col;
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
        grid({row, col}, vector) {
            return vec.add({row, col}, vector);
        },
        pos({row, col}, vector) {
            if (vec.eq(vector, vec.UP)) {
                const memRow = mem.getMemoryRow(row);
                const newMemRow = Math.max(0, memRow - 1);
                return { row: newMemRow, col: 0 };
                
            } else if (vec.eq(vector, vec.RIGHT)) {
                const memRowLength = mem.document[row].length;
                let nrow = row;
                let ncol = col + 1;
                if (ncol > memRowLength) ncol = memRowLength;
                if (ncol >= size.cols) {
                    nrow += 1;
                    ncol = 0;
                }
                return {row: nrow, col: ncol};

            } else if (vec.eq(vector, vec.DOWN)) {

            } else if (vec.eq(vector, vec.LEFT)) {
                const origMemRow = mem.getMemoryRow(row);
                let nrow = row - 1;
                const newMemRow = mem.getMemoryRow(Math.max(0 , nrow));
                
                let ncol = col - 1;
                if (ncol >= 0) return {row, col: ncol};

                if (origMemRow !== newMemRow || row === 0) return {row, col: 0};

                ncol = size.cols - 1;
                
                return {row: nrow, col: ncol};
            }
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
        document: [],
        line_count: [], // A row in memory may occupy several visual lines
        save({row, col}, char) {
            this.expandMemoryMaybe(row);
            this.document[row].splice(col, 1, char);
            mem.calculateLineCount();
        },
        get({row, col}) {
            if (row >= this.document.length) return null;
            if (col >= this.document[row].length) return null;
            return this.document[row][col];
        },
        restore({row, col}) {
            const char = this.get({row, col});
            if (char !== null) {
                write.char({row, col}, char, color.font);
            }
        },
        expandMemoryMaybe(row) {
            const count = (row + 1) - this.document.length;
            if (count > 0) {
                Array(count).fill(null).forEach(e => {
                    this.document.push([]);
                    this.line_count.push(0);
                });
            }
        },
        calculateLineCount() {
            let previous = 0;
            for (let i = 0; i < this.document.length; i++) {
                this.line_count[i] = previous + Math.ceil(this.document[i].length / size.cols);
                previous = this.line_count[i];
            }
        },
        getMemoryRow(visualRow) {
            for (let i = 0; i < this.line_count.length; i++) {
                if (this.line_count[i] > visualRow) {
                    return i;
                }
            }
        },
        getVisualLineLength(visualRow) {
            /* TODO: function not tested
            const memoryRow = this.getMemoryRow(visualRow);
            const visualRowsBefore = (memoryRow === 0) ? 0 : this.line_count[memoryRow - 1];
            const memoryVisualLineLength = Math.ceil(this.document[memoryRow].length / size.cols);
            const visualOffset = visualRow - visualRowsBefore;
            if (visualOffset === memoryVisualLineLength) {
                return this.document[memoryRow].length % size.cols;
            } else {
                return size.cols - 1;
            } */
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
        },
        document(data) {
            let pos = {row: 0, col: 0};
            for (let i = 0; i < data.length; i++) {
                const char = data[i];
                if (char === "\n") {
                    pos.row += 1;
                    pos.col = 0;

                } else {
                    this.char(pos, char, color.font);
                    pos.col += 1;
                    if (pos.col >= size.cols) {
                        pos.row += 1;
                        pos.col = 0;
                    }
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
            this.clear();
            this.pos = move.grid(this.pos, vec.DOWN);
            this.pos.col = 0;
            this.draw();
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

        if (isPrintable(key)) {
            
            if (key === "q") {
                removeEventListeners();
                api.exit();

            } else {
                write.char(cursor.pos, key, color.font);
                cursor.move(vec.RIGHT);
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
            cursor.newline();

        } else if (key === "`") {
            console.log(mem.document);

        } else {
            console.log(key);

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
        const start = _api => {
            api = _api;
            fill.canvas(color.background);
            write.document(`This is line one.\nLine two.\nAnd this is line three.`); // TODO: Remove in production
            cursor.draw();
            addEventListeners();
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

    function addEventListeners() {
        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("wheel", handleMouseWheel);
    }

    function removeEventListeners() {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("wheel", handleMouseWheel);
    }

    return {
        init
    };
}