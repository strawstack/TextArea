function bash({ onCommand }) {

    const commands = {
        help: {
            call: args => {
                return {
                    type: "text",
                    data: Array(10).fill(null).map(e => {
                        let row = Array(10).fill(null).map(e => {
                            const alph = "abcdef";
                            return alph[Math.floor(Math.random() * alph.length)];
                        }).join("");
                        return `${row}\n`;
                    }).join("")
                }
            },
            info: "List commands"
        }
    }

    function parseCmd(cmd) {
        return {
            name: cmd,
            args: []
        };
    }

    function init() {

        onCommand(cmd => {
            const { name, args } = parseCmd(cmd);
            if (name in commands) return commands[name].call(args);
            return {
                type: "text",
                data: "Command not found."
            };
        });

    }

    return {
        init,
        registerCmd: ({name, call, info}) => {
            commands[name] = {
                call,
                info
            };
        } 
    };
}