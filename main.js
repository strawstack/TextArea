(async () => {

    function main() {
        
        const canvasWidth = 1210;
        const canvasHeight = 1210;

        const canvas = document.querySelector("canvas");
        const ctx = canvas.getContext("2d");

        canvas.style.width = `${canvasWidth}px`;
        canvas.style.height = `${canvasHeight}px`;

        const scale = window.devicePixelRatio;
        canvas.width = Math.floor(canvasWidth * scale);
        canvas.height = Math.floor(canvasHeight * scale);

        ctx.scale(scale, scale);

        const { start } = textarea({ canvas, ctx, options: {
            canvasWidth,
            canvasHeight
        } });
        start();
    }

    await document.fonts.ready;
    main();

})();