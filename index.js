var term = require("terminal-kit").terminal;

term.fullscreen(true);

term.bold.cyan("Type anything on the keyboard...\n");
term.green("Hit CTRL-C to quit.\n\n");

term.grabInput({ mouse: "button" });

term.on("key", function(name, matches, data) {
  console.log("'key' event:", name);
	if (name == "CTRL_C") { terminate(); }
});

terminate = () => {
  term.fullscreen(false);
	term.grabInput(false);
	setTimeout(function() {
    process.exit()
  }, 100);
}
