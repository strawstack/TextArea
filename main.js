(async () => {

    function main() {

        const canvas = document.querySelector("canvas");
        const ctx = canvas.getContext("2d");
        
        let canvasWidth = null;
        let canvasHeight = null;

        const initCanvas = () => {
            canvasWidth = document.documentElement.clientWidth; // 1210;
            canvasHeight = document.documentElement.clientHeight; // 730;

            canvas.style.width = `${canvasWidth}px`;
            canvas.style.height = `${canvasHeight}px`;
    
            const scale = window.devicePixelRatio;
            canvas.width = Math.floor(canvasWidth * scale);
            canvas.height = Math.floor(canvasHeight * scale);
    
            ctx.scale(scale, scale);
        };

        initCanvas();

        // TextArea
        const ta = textarea({ canvas, ctx, options: {} });
        const { init: initTextArea } = ta;
        const { size } = initTextArea(canvasWidth, canvasHeight);
        
        // Terminal
        const ter = terminal({...ta, size});

        const { init: initTerminal } = ter;
        initTerminal();

        // Bash
        const { init: initBash, registerCmd } = bash(ter);
        initBash();

        // Vim
        const { init: initVim } = vim({ registerCmd, ...ta, size });
        initVim();
        
    }

    await document.fonts.ready;
    main();

})();