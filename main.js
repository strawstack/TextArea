(async () => {

    function main() {

        const canvas = document.querySelector("canvas");
        const ctx = canvas.getContext("2d");
        
        let canvasWidth = null;
        let canvasHeight = null;

        const init = () => {
            canvasWidth = document.documentElement.clientWidth; // 1210;
            canvasHeight = document.documentElement.clientHeight; // 730;

            canvas.style.width = `${canvasWidth}px`;
            canvas.style.height = `${canvasHeight}px`;
    
            const scale = window.devicePixelRatio;
            canvas.width = Math.floor(canvasWidth * scale);
            canvas.height = Math.floor(canvasHeight * scale);
    
            ctx.scale(scale, scale);
        };

        init();

        const { init: initTextArea, fillDemo, clearCanvas } = textarea({ canvas, ctx, options: {} });

        initTextArea(canvasWidth, canvasHeight);
        fillDemo();

        window.addEventListener("resize", () => {
            init();
            initTextArea(canvasWidth, canvasHeight);
            clearCanvas();
            fillDemo();
        });
    }

    await document.fonts.ready;
    main();

})();