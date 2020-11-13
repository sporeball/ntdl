// dependencies
var term = require("terminal-kit").terminal;
const chalk = require("chalk");

const Conf = require("conf");
const config = new Conf();

const commands = {
  // add task
  "a": () => {
    busy = true;

    output("a ");

    term.inputField({ style: term.green }, function(error, input) {
      output("added task '" + chalk.green(input) + "'");
      tasks.push(input);
      config.set("tasks", tasks);
      writeList();
      statusline();
      busy = false;
    });
  },
  // delete all tasks
  "X": async () => {
    let i = 0;
    while (i < tasks.length) {
      term.moveTo(2, i + 2);
      term.eraseLine();
      await sleep(10);
      i++;
    }
    output(`deleted ${tasks.length} task${tasks.length != 1 ? "s" : ""}`);
    tasks = [];
    statusline();
    config.delete("tasks");
  },
  // terminate
  "CTRL_C": () => {
    term.fullscreen(false);
  	term.grabInput(false);
  	setTimeout(function() {
      process.exit()
    }, 100);
  }
};

var tasks = config.get("tasks") || [];

var busy = false; // are we in the middle of a command?

// write current tasks to the terminal
writeList = async () => {
  let i = 0;
  while (i < tasks.length) {
    term.moveTo(2, i + 2);
    term.eraseLine();
    term("- %s", tasks[i]);
    await sleep(10);
    i++;
  }
}

// update statusline (colored line)
statusline = () => {
  term.moveTo(1, term.height - 1);
  term.bgWhite.black(`${tasks.length} task${tasks.length != 1 ? "s" : ""}`.padEnd(term.width, " "));
}

// write output (last line)
output = str => {
  term.moveTo(1, term.height);
  term.eraseLine();
  term(str);
}

sleep = ms => {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

init = () => {
  term.fullscreen(true);

  term.bold.cyan("ntdl\n");
  writeList();
  statusline();
  term.moveTo(1, term.height);
  term.grabInput({ mouse: "button" });

  term.on("key", function(name, matches, data) {
    if (!busy && name in commands) {
      commands[name]();
    }
  });
}

init();
