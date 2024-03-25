function vim({ registerCmd, fillText, fillRect, fillCanvas, fillStyle, size }) {

    function init() {
        registerCmd({
            name: "vim",
            info: "Launch vim",
            call: args => {
                console.log("Launching vim...");
                return {
                    type: "text",
                    data: "Launching vim..."
                };   
            }
        });
    }

    return {
        init
    };
}