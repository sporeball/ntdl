var term = require("terminal-kit").terminal;

term.fullscreen(true);

term.bold.cyan("ntdl\n");
term.moveTo(1, term.height - 1);
term.bgWhite.black("0 tasks".padEnd(term.width, " "));
term.moveTo(1, term.height);

term.grabInput({ mouse: "button" });

const commands = {
  "a": () => {
    term.moveTo(1, term.height);
    term.eraseLine();
    term("a ");

    term.inputField({ style: term.green }, function(error, input) {
      term.moveTo(1, term.height);
      term("added task '").green(input)("'");
    });
  }
};

term.on("key", function(name, matches, data) {
	if (name == "CTRL_C") { terminate(); }
  if (name in commands) {
    commands[name]();
  }
});

terminate = () => {
  term.fullscreen(false);
	term.grabInput(false);
	setTimeout(function() {
    process.exit()
  }, 100);
}
