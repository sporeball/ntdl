#!/usr/bin/env node

/*
  index.js
  ntdl core
  copyright (c) 2020 sporeball
  MIT license
*/

// dependencies
var term = require("terminal-kit").terminal;
const chalk = require("chalk");
const symbols = require("log-symbols");

const Conf = require("conf");
const config = new Conf();

const updateNotifier = require("update-notifier");
const pkg = require("./package.json");
const notifier = updateNotifier({
  pkg,
  updateCheckInterval: config.get("interval") || 0
});

// arguments
var args = process.argv.slice(2);
if (args.includes("--help")) {
  console.log(`
    usage
      $ ntdl

    commands
      a     add task
      x     complete task
      X     clear completed tasks

    flags
     -d     dev mode
    --help  show this screen`);
  process.exit(0);
}
const DEV = args.includes("-d");

const commands = {
  // add task
  "a": () => {
    busy = true;

    output("a ");

    term.inputField({ style: term.green }, function(error, input) {
      for (i in tasks) {
        if (tasks[i][0] == input) {
          output(chalk.red("task already exists with this name"));
          busy = false;
          return;
        }
      }
      term.moveTo(2, tasks.length + 2);
      if (tasks.length == 0) term.eraseLine();
      term("- %s ", input);
      tasks.push([input, false]);
      setTasks();
      statusline();
      output("added task '" + chalk.green(input) + "'");
      busy = false;
    });
  },
  // complete task
  "x": () => {
    let t = [];
    for (i in tasks) {
      if (tasks[i][1] == false) {
        t.push(tasks[i][0]);
      }
    }
    if (t.length == 0) return;

    busy = true;

    output("x");

    term.eraseArea(1, 2, term.width, term.height - 3);

    term.singleColumnMenu(t, {
      y: 2,
      style: term.gray,
      selectedStyle: term,
      submittedStyle: term,
      leftPadding: " - ",
      selectedLeftPadding: " > "
    }, function(error, response) {
      for (j in tasks) {
        if (tasks[j][0] == response.selectedText) {
          tasks[j][1] = true;
          break;
        }
      }
      completed++;
      setTasks();
      writeList();
      statusline();
      if (completed == tasks.length) {
        output(chalk.green("all tasks completed!"));
      } else {
        output("completed '" + chalk.green(response.selectedText) + "'");
      }
      busy = false;
    });
  },
  // remove completed tasks
  "X": () => {
    let c = tasks.filter(task => task[1] !== true);
    let removed = tasks.length - c.length;

    tasks = c;
    completed = 0;
    setTasks();
    term.eraseArea(1, 2, term.width, term.height);
    writeList();
    statusline();
    output(`removed ${removed} task${removed != 1 ? "s" : ""}`);
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

var tasks = (DEV) ? config.get("devTasks") || [] : config.get("tasks") || [];

var completed = 0;

var busy = false; // are we in the middle of a command?

// write current tasks to the terminal
writeList = () => {
  if (tasks.length == 0) {
    term.moveTo(2, 2);
    term.gray("no tasks yet...");
    return;
  }
  for (let i = 0; i < tasks.length; i++) {
    term.moveTo(2, i + 2);
    if (tasks[i][1] == true) {
      term(chalk.gray(`- ${tasks[i][0]} `) + symbols.success);
    } else {
      term("- %s ", tasks[i][0]);
    }
  }
}

// update statusline (colored line)
statusline = () => {
  term.moveTo(1, term.height - 1);
  term.bgWhite.black(`${tasks.length} task${tasks.length != 1 ? "s" : ""} (${completed} completed)`.padEnd(term.width, " "));
}

// write output (last line)
output = str => {
  term.moveTo(1, term.height);
  term.eraseLine();
  term(str);
}

setTasks = () => {
  (DEV) ? config.set("devTasks", tasks) : config.set("tasks", tasks);
}

sleep = ms => {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

init = () => {
  term.fullscreen(true);
  term.bold.cyan("ntdl\n");

  completed = tasks.filter(i => i[1] == true).length;
  if (completed == tasks.length && completed != 0) {
    output(chalk.green("all tasks completed!"));
  }
  writeList();
  statusline();

  if (notifier.update) {
    term.moveTo(term.width - `ntdl v${notifier.update.latest} available!`.length, 1);
    term(chalk.cyan("ntdl ") + chalk.green(`v${notifier.update.latest}`) + chalk.cyan(" available!"));
    term.moveTo(term.width - 23, 2);
    term.gray("press any key to remove");
  }

  term.moveTo(1, term.height);
  term.grabInput({ mouse: "button" });

  term.on("key", function(name, matches, data) {
    if (notifier.update) {
      term.eraseArea(term.width - 23, 1, 23, 2);
      term.moveTo(1, 1);
      term.bold.cyan("ntdl\n");
      term.moveTo(1, term.height);
      notifier.update = undefined;
      config.set("interval", 86400000);
    }
    if (!busy && name in commands) {
      commands[name]();
    }
  });
}

init();
