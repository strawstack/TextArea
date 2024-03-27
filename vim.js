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
        document: [],
        line_count: [], // A row in memory may occupy several visual lines
        save({row, col}, char) {
            
        },
        get({row, col}) {
            
        },
        restore({row, col}) {

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

    function handleKeyDown(e) {
        
        const { key } = e;

        if (isPrintable(key)) {
            
            if (key === "q") {
                removeEventListeners();
                api.exit();

            } else {
                write.text(key);
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