function textarea({ canvas, ctx, options }) {
    canvas.focus();

    const state = {};
    state.fontWidth = null;
    state.fontHeight = null;
    state.boxWidth = null;  // adds kerning
    state.boxHeight = null; // adds leading
    state.actualBoundingBoxAscent = null;
    state.actualBoundingBoxDescent = null;
    state.canvasCols = null;
    state.canvasRows = null;
    state.leftMargin = null;
    state.topMargin = null;

    const opts = {
        fontSize: 30,
        fontFamily: 'monospace',
        leading: 4,
        kerning: 4,
        minPadding: 4,
        ...options
    };

    function floor(value) {
        return Math.floor(value);
    }

    function fillRect(row, col) {
        ctx.fillRect(
            col * state.boxWidth + state.leftMargin,
            row * state.boxHeight + state.topMargin, 
            state.boxWidth, 
            state.boxHeight
        );
    }

    function strokeRect(row, col) {
        ctx.strokeRect(
            col * state.boxWidth + state.leftMargin,
            row * state.boxHeight + state.topMargin, 
            state.boxWidth, 
            state.boxHeight
        );
    }

    function clearRect(row, col) {
        ctx.clearRect(
            col * state.boxWidth + state.leftMargin,
            row * state.boxHeight + state.topMargin, 
            state.boxWidth,
            state.boxHeight
        );
    }

    function fillText(row, col, char) {
        ctx.fillText(
            char, 
            col * state.boxWidth + state.leftMargin, // width 
            row * state.boxHeight + state.actualBoundingBoxAscent + opts.leading + state.topMargin // height
        );
    }

    function clearCanvas() {
        ctx.clearRect(0, 0, opts.canvasWidth, opts.canvasHeight);
    }

    function init(canvasWidth, canvasHeight) {
        const { fontSize, fontFamily, leading, kerning, minPadding } = opts;
        ctx.font = `${fontSize}px ${fontFamily}`;
        
        // Measure and calculate width and height
        const { width: fontWidth } = ctx.measureText("m");
        const { actualBoundingBoxAscent } = ctx.measureText("i");
        const { actualBoundingBoxDescent } = ctx.measureText("g");
        const fontHeight = actualBoundingBoxAscent + actualBoundingBoxDescent;
        const boxWidth = fontWidth + kerning;
        const boxHeight = fontHeight + leading;

        // Assign values to state
        state.fontWidth = floor(fontWidth);
        state.fontHeight = floor(fontHeight);
        state.boxWidth = floor(boxWidth);
        state.boxHeight = floor(boxHeight);
        state.actualBoundingBoxAscent = floor(actualBoundingBoxAscent);
        state.actualBoundingBoxDescent = floor(actualBoundingBoxDescent);

        // Calculate left and top margin
        const maxCharsWidth = (canvasWidth - 2 * minPadding) / boxWidth;
        const extraWidth = canvasWidth - (maxCharsWidth * boxWidth);
        const maxCharsHeight = (canvasHeight - 2 * minPadding) / boxHeight;
        const extraHeight = canvasHeight - (maxCharsHeight * boxHeight);
        state.canvasCols = floor(maxCharsWidth);
        state.canvasRows = floor(maxCharsHeight);
        state.leftMargin = floor(extraWidth/2);
        state.topMargin = floor(extraHeight/2);

        return {
            size: {
                rows: state.canvasRows,
                cols: state.canvasCols
            }
        };
    }

    function fillDemo() {
        let chars = "abcdefghijklmnopqrstuvwxyz";
        for (let row = 0; row < state.canvasRows; row++) {
            for (let col = 0; col < state.canvasCols; col++) {
                let symb = chars[Math.floor(Math.random() * chars.length)];
                if (col === 0) symb = "^";
                if (col === state.canvasCols - 1) symb = "$";
                if (Math.random() < 0.5) fillRect(row, col);
                fillText(row, col, symb);
            }
        }
    }

    return {
        init,
        fillDemo,
        fillText,
        fillRect,
        strokeRect,
        clearRect,
        clearCanvas
    };
}