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

    use arrow keys to move

    commands
      a     add task
      e     edit task
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
  "a": async () => {
    busy = true;

    if (cy) {
      term.moveTo(2, cy);
      (tasks[cy - 2][1] == true) ? term.gray("-") : term("-");
    }

    output("> ");
    term.moveTo(3, term.height);

    term.inputField({
      style: term.green,
      cancelable: true
    }, function(error, input) {
      if (input === undefined) {
        output("");
        if (cy) cursor();
        term.moveTo(term.width, term.height);
        busy = false;
        return;
      }
      if (input == "") {
        output(chalk.red("task name cannot be empty"));
        busy = false;
        return;
      }
      for (i in tasks) {
        if (tasks[i][0] == input) {
          output(chalk.red("task already exists with this name"));
          busy = false;
          return;
        }
      }
      term.moveTo(2, tasks.length + 2);
      if (tasks.length == 0) term.eraseLine();
      cy = tasks.length + 2;
      cursor();
      term(" %s ", input);
      tasks.push([input, false]);
      setTasks();
      statusline();
      output("added task '" + chalk.green(input) + "'");
      if (tasks.length == 1) cy = 2;
      cursor();
      term.moveTo(term.width, term.height);
      busy = false;
    });
  },
  // rename task
  "e": async () => {
    if (!cy) return;
    if (tasks[cy - 2][1] == true) return;
    busy = true;

    output("");

    term.moveTo(4, cy);
    term.inputField({
      style: term.green,
      default: tasks[cy - 2][0],
      cancelable: true
    }, function(error, input) {
      if (input === undefined) {
        term.eraseLine();
        cursor();
        term.moveTo(4, cy);
        term(tasks[cy - 2][0]);
        term.moveTo(term.width, term.height);
        busy = false;
        return;
      }
      if (input == "") {
        term(tasks[cy - 2][0])
        output(chalk.red("task name cannot be empty"));
        busy = false;
        return;
      }
      term.moveTo(4, cy);
      term(input);
      output(`renamed '${chalk.green(tasks[cy - 2][0])}'`);
      tasks[cy - 2][0] = input;
      setTasks();
      term.moveTo(term.width, term.height);
      busy = false;
    });
  },
  // complete task
  "x": async () => {
    if (!cy) return;
    if (tasks[cy - 2][1] == true) return;
    tasks[cy - 2][1] = true;
    completed++;
    setTasks();
    term.moveTo(3, cy);
    term(chalk.gray(` ${tasks[cy - 2][0]} `) + symbols.success);
    statusline();
    if (completed == tasks.length) {
      output(chalk.green("all tasks completed!"));
    } else {
      output("completed '" + chalk.green(tasks[cy - 2][0]) + "'");
    }
  },
  // remove completed tasks
  "X": async () => {
    let c = tasks.filter(task => task[1] == false);
    let removed = tasks.length - c.length;
    if (removed == 0) return;

    tasks = c;
    completed = 0;
    setTasks();
    term.eraseArea(1, 2, term.width, term.height);
    writeList();
    statusline();
    output(`removed ${removed} task${removed != 1 ? "s" : ""}`);
    if (tasks.length != 0) {
      cy = 2;
      cursor();
    } else {
      cy = undefined;
    }
  },
  "DOWN": async () => {
    if (cy && cy != tasks.length + 1) moveCursor(1);
  },
  "UP": async () => {
    if (cy && cy != 2) moveCursor(-1);
  },
  // terminate
  "CTRL_C": () => {
    console.log("\u001B[?1049l");
  	term.grabInput(false);
  	setTimeout(function() {
      process.exit()
    }, 100);
  }
};

var tasks = (DEV) ? config.get("devTasks") || [] : config.get("tasks") || [];

var completed = 0;

var cy; // cursor y-position

var busy = false; // are we in the middle of a command?

moveCursor = dir => {
  cy += dir;
  term.moveTo(2, cy - dir);
  (tasks[cy - 2 - dir][1] == true) ? term.gray("-") : term("-");
  cursor();
}

cursor = () => {
  term.moveTo(2, cy);
  term(">");
}

// write full list of tasks
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
  term.moveTo(term.width, term.height);
}

setTasks = () => {
  (DEV) ? config.set("devTasks", tasks) : config.set("tasks", tasks);
}

init = () => {
  console.log("\u001B[?1049h")
  term.moveTo(1, 1);
  term.bold.cyan("ntdl\n");

  completed = tasks.filter(i => i[1] == true).length;
  if (completed == tasks.length && completed != 0) {
    output(chalk.green("all tasks completed!"));
  }
  writeList();
  statusline();

  if (tasks.length != 0) {
    cy = 2;
    cursor();
  }

  if (notifier.update) {
    term.moveTo(term.width - `ntdl v${notifier.update.latest} available!`.length, 1);
    term(chalk.cyan("ntdl ") + chalk.green(`v${notifier.update.latest}`) + chalk.cyan(" available!"));
    term.moveTo(term.width - 23, 2);
    term.gray("press any key to remove");
  }

  term.moveTo(term.width, term.height);
  term.grabInput();

  term.on("key", async (name, matches, data) => {
    if (notifier.update) {
      term.eraseArea(term.width - 23, 1, 23, 2);
      term.moveTo(1, 1);
      term.bold.cyan("ntdl\n");
      term.moveTo(term.width, term.height);
      notifier.update = undefined;
      config.set("interval", 86400000);
    }
    if (!busy && name in commands) {
      await commands[name]();
      (name != "a") ? term.moveTo(term.width, term.height) : {};
    }
  });
}

init();
