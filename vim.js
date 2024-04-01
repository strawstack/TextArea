function vim({ registerCmd, fillText, fillRect, fillCanvas, fillStyle, size }) {

    // Set by 'start' inside 'init' below
    let api = {};

    const color = {
        font: 'white',
        cursor: 'rgba(255, 255, 255, 0.5)',
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
                const memRow = to.memory({row, col}).row;
                const newMemRow = Math.max(0, memRow - 1);
                return { 
                    row: newMemRow, 
                    col: Math.min(col, mem.document[newMemRow].length) 
                };
                
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
                const memRow = to.memory({row, col}).row;
                const lastLine = mem.line_count[mem.line_count.length - 1];
                if (row + 1 === lastLine) {
                    return { row, col: mem.document[mem.document.length - 1].length % size.cols };
                } else {
                    const newMemRow = memRow + 1;
                    return { row: newMemRow, col: Math.min(col, mem.document[newMemRow].length) };
                }
                
            } else if (vec.eq(vector, vec.LEFT)) {                
                let ncol = col - 1;
                if (ncol >= 0) return {row, col: ncol};

                const nrow = row - 1;
                const origMemRow = to.memory({row, col}).row;
                const newMemRow = to.memory({ row: nrow, col }).row;
                if (origMemRow !== newMemRow || row === 0) return {row, col: 0};

                return {row: nrow, col: size.cols - 1};
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
        },
        memory({row, col}) {
            for (let i = 0; i < mem.line_count.length; i++) {
                if (mem.line_count[i] > row) {
                    return {
                        row: i,
                        col: ((row - mem.rowsBefore(i)) * size.cols) + col
                    };
                }
            }
        },
        visual({row, col}) {
            let vrow = null;
            if (row === 0) {
                vrow = row + Math.floor(col / size.cols);
            } else {
                vrow = mem.line_count[row - 1] + Math.floor(col / size.cols);
            }
            return {
                row: vrow,
                col: col % size.cols
            };
        },
    };

    const fill = {
        canvas(color) {
            fillStyle(color);
            fillCanvas();
        },
        rect({row, col}, color) {
            fillStyle(color);
            fillRect(row, col);
        },
        below({row, col}, color) {
            const mpos = to.memory({row, col});
            const rowsBefore = mem.rowsBefore(mpos.row);
            const rowOffset = Math.floor(mpos.col / size.cols) + 1;
            const start = rowsBefore + rowOffset;
            const end = mem.line_count[mem.line_count.length - 1]; 
            for (let i = start; i < end; i++) {
                this.row(i, color);
            }
        },
        row(row, color) {
            for (let i = 0; i < size.cols; i++) {
                this.rect({ 
                    row, col: i
                }, color);
            }
        },
        right({row, col}, color) {
            const line = mem.getVisualLine({row, col});
            let count = line.length - col;
            let pos = {row, col};
            while (count > 0) {
                fill.rect(pos, color);
                pos = move.pos(pos, vec.RIGHT);
                count -= 1;
            }
        }
    };

    const mem = {
        document: [],
        line_count: [], // A row in memory may occupy several visual lines
        save({row, col}, char) {
            this.expandMemoryMaybe(row);
            this.document[row].splice(col, 1, char);
            this.calculateLineCount();
        },
        get({row, col}) {
            if (row >= this.document.length) return null;
            if (col >= this.document[row].length) return null;
            return this.document[row][col];
        },
        range({row, col}) {
            if (row >= this.document.length) return null;
            return this.document[row].slice(col);
        },
        remove({row, col}) {
            this.document[row].splice(col, 1);
            this.calculateLineCount();
        },
        restore({row, col}) {
            const char = this.get({row, col});
            if (char !== null) {
                write.char({row, col}, char, color.font);
            }
        },
        split({row, col}) { // split line at memory position
            const line = this.document[row];
            const left = line.slice(0, col);
            const right = line.slice(col);
            this.document[row] = left;
            this.document.splice(row + 1, 0, right);
            this.calculateLineCount();
        },
        shiftRight({row, col}) {
            if (col < this.document[row].length) {
                this.document[row].splice(col, 0, this.document[row][col]);
                this.calculateLineCount();
            }
        },
        mergeWithAbove(row) {
            const top = mem.document[row - 1];
            const bot = mem.document[row];
            mem.document.splice(row - 1, 2, [...top, ...bot]);
            mem.calculateLineCount();
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
                const current = Math.ceil(this.document[i].length / size.cols);
                this.line_count[i] = previous + Math.max(1, current);
                previous = this.line_count[i];
            }
        },
        documentFrom({row, col}) {
            const data = [];
            data.push(this.document[row].slice(col));
            
            let crow = row + 1;
            while (crow < this.document.length) {
                data.push(this.document[crow]);
                crow += 1;
            }

            return data.map(line => line.join("")).join("\n");
        },
        getVisualLine({row, col}) {
            const mpos = to.memory({row, col});
            const documentRow = this.document[mpos.row];
            const colOffset = Math.floor(mpos.col / size.cols) * size.cols;
            return documentRow.slice(colOffset, colOffset + size.cols);
        },
        rowsBefore(row) {
            return (row === 0) ? 0 : mem.line_count[row - 1];
        }
    };

    const write = {
        char({row, col}, char, color) {
            fillStyle(color);
            mem.save(to.global({row, col}), char);
            fillText(row, col, char);
        },
        text({row, col}, text) {
            let pos = {row, col};
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
        clearRange({row, col}, length) {
            // Clear to end of line
            let pos = {row, col};
            let count = length;
            while (count > 0) {
                fill.rect(pos, color.background);
                pos = move.pos(pos, vec.RIGHT);
                count -= 1;
            }
        },
        shiftRight({row, col}) {
            mem.shiftRight({row, col});
            const range = mem.range({row, col});
            write.clearRange({row, col}, range.length);
            this.text({row, col}, range);
        },
        shiftLeft({row, col}) {
            const posBefore = move.pos({row, col}, vec.LEFT); 
            mem.remove(posBefore);
            const range = mem.range(posBefore);
            write.clearRange(posBefore, range.length + 1);
            this.text(posBefore, range);
        },
        document(data, {row, col}) {
            let pos = {row, col};
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
            fill.rect(to.local(this.pos), color.cursor);
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
        },
        isFirstColumnNewLine() {
            const {row: mrow, col: mcol} = to.memory(this.pos);
            return mcol === 0 && mrow > 0;
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
                write.shiftRight(cursor.pos, vec.RIGHT);
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
            if (cursor.isFirstColumnNewLine()) {
                const mpos = to.memory(cursor.pos);
                
                // Cursor to end of previous line
                cursor.clear();
                mem.restore(cursor.pos);
                cursor.pos.row -= 1;
                cursor.pos.col = mem.getVisualLine(cursor.pos).length - 1;
                
                // Merge memory lines
                mem.mergeWithAbove(mpos.row);

                // Advance cursor one forward
                cursor.move(vec.RIGHT);

                fill.row(cursor.pos, color.background);
                fill.below(cursor.pos, color.background);

                write.document(
                    mem.documentFrom(cursor.pos),
                    cursor.pos
                );

            } else {
                write.shiftLeft(cursor.pos);
                cursor.move(vec.LEFT);
            }

            // If on the first col of a memory row
            // Merge this memory row with the previous

        } else if (key === "Enter") {
            
            // Clear remainder of line
            fill.right(cursor.pos, color.background);
            
            // Clear every line below
            fill.below(cursor.pos, color.background);
            
            // Update memory 'split' at cursor (meaning insert cursor and remainer as new line)
            mem.split(
                to.memory(cursor.pos)
            );
            
            cursor.newline();
            cursor.clear();

            // Write memory as document starting at cursor
            write.document(
                mem.documentFrom(cursor.pos),
                cursor.pos
            );

            cursor.draw();
            
        } else if (key === "`") {
            // console.log(mem.document);
            console.log(mem.document.map(line => line.join("")).join("\n"));

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
            write.document(`This is line one.\nLine two.\nAnd this is line three.`, {row: 0, col: 0});
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