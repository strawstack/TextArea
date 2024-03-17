function textarea({ canvas, ctx, options }) {
    canvas.focus();

    const state = {};
    state.fontWidth = null;
    state.fontHeight = null;
    state.boxWidth = null;
    state.boxHeight = null;
    state.actualBoundingBoxAscent = null;
    state.actualBoundingBoxDescent = null;

    const opts = {
        canvasWidth: 1210,
        canvasHeight: 730,
        fontSize: 30,
        leading: 4,
        kerning: 4,
        ...options
    };

    function strokeRect(row, col) {
        ctx.strokeRect(
            col * state.boxWidth,
            row * state.boxHeight, 
            state.boxWidth, 
            state.boxHeight
        );
    }

    function fillText(row, col, char) {
        ctx.fillText(
            char, 
            col * state.boxWidth, // width 
            row * state.boxHeight + state.actualBoundingBoxAscent + opts.leading // height
        );
    }

    function start() {
        const { canvasWidth, canvasHeight, fontSize, leading, kerning } = opts;
        ctx.font = `${fontSize}px monospace`;
        
        const { width: fontWidth } = ctx.measureText("m");
        const { actualBoundingBoxAscent } = ctx.measureText("i");
        const { actualBoundingBoxDescent } = ctx.measureText("g");
        const fontHeight = actualBoundingBoxAscent + actualBoundingBoxDescent;
        const boxWidth = fontWidth + kerning;
        const boxHeight = fontHeight + leading;

        state.fontWidth = fontWidth;
        state.fontHeight = fontHeight;
        state.boxWidth = boxWidth;
        state.boxHeight = boxHeight;
        state.actualBoundingBoxAscent = actualBoundingBoxAscent;
        state.actualBoundingBoxDescent = actualBoundingBoxDescent;

        let chars = "abcdefghijklmnopqrstuvwxyz";
        for (let col = 0; col < chars.length; col++) {
            strokeRect(0, col);
            fillText(0, col, chars[col]);
        }

        chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        for (let col = 0; col < chars.length; col++) {
            strokeRect(1, col);
            fillText(1, col, chars[col]);
        }
    }


    return {
        start
    };

}