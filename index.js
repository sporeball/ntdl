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

var tasks = config.get(`${DEV ? "devT" : "t"}asks`) || [];
var completed = tasks.filter(i => i[1]).length;

var cy; // cursor y-position

var busy = false; // are we in the middle of a command?

const commands = {
  // add task
  "a": async () => {
    busy = true;

    output("");

    if (cy) {
      term.moveTo(2, cy);
      tasks[cy - 2][1] ? term.gray("-") : term("-");
    }

    term.moveTo(2, tasks.length + 2);
    term("> ");
    term.eraseLineAfter();

    term.inputField({
      style: term.green,
      cancelable: true
    }, function(error, input) {
      if (input === undefined) {
        term.eraseLine();
        if (tasks.length == 0) {
          term.moveTo(2, 2);
          term.gray("no tasks yet...");
        }
        cursor();
        term.moveTo(term.width, term.height);
        busy = false;
        return;
      }
      if (input == "") {
        term.eraseLine();
        cursor();
        err("task name cannot be empty");
        return;
      }
      for (i in tasks) {
        if (tasks[i][0] == input) {
          term.eraseLine();
          cursor();
          err("task already exists with this name");
          return;
        }
      }
      tasks.push([input, false]);
      setTasks();
      cy = tasks.length + 1;
      term.moveTo(4, cy);
      term(input);
      output(`added task '${chalk.green(input)}'`);
      term.moveTo(term.width, term.height);
      busy = false;
    });
  },
  // edit task
  "e": async () => {
    if (!cy) return;
    if (tasks[cy - 2][1]) return;
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
        term(tasks[cy - 2][0]);
        term.moveTo(term.width, term.height);
        busy = false;
        return;
      }
      if (input == "") {
        term(tasks[cy - 2][0]);
        err("task name cannot be empty");
        return;
      }
      for (i in tasks) {
        if (tasks[i][0] == input) {
          term.eraseLine();
          cursor();
          term(tasks[cy - 2][0]);
          err("task already exists with this name");
          return;
        }
      }
      tasks[cy - 2][0] = input;
      setTasks();
      term.moveTo(4, cy);
      term(input);
      output(`renamed '${chalk.green(tasks[cy - 2][0])}'`);
      term.moveTo(term.width, term.height);
      busy = false;
    });
  },
  // complete task
  "x": async () => {
    if (!cy) return;
    if (tasks[cy - 2][1]) return;
    tasks[cy - 2][1] = true;
    setTasks();
    term.moveTo(4, cy);
    term(chalk.gray(`${tasks[cy - 2][0]} `) + symbols.success);
    if (completed == tasks.length) {
      output(chalk.green("all tasks completed!"));
    } else {
      output(`completed '${chalk.green(tasks[cy - 2][0])}'`);
    }
  },
  // clear completed tasks
  "X": async () => {
    let c = tasks.filter(task => task[1] == false);
    let removed = tasks.length - c.length;
    if (removed == 0) return;

    tasks = c;
    setTasks();
    term.eraseArea(1, 2, term.width, term.height - 3);
    writeList();
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

// utils
cursor = () => {
  if (cy) {
    term.moveTo(2, cy);
    term("> ");
  }
}

moveCursor = dir => {
  cy += dir;
  term.moveTo(2, cy - dir);
  tasks[cy - 2 - dir][1] ? term.gray("-") : term("-");
  cursor();
}

writeList = () => {
  term.moveTo(2, 2);
  if (tasks.length == 0) {
    term.gray("no tasks yet...");
    return;
  }
  for (let i = 0; i < tasks.length; i++) {
    if (tasks[i][1]) {
      term(chalk.gray(`- ${tasks[i][0]} ${symbols.success}\n `));
    } else {
      term(`- ${tasks[i][0]}\n `);
    }
  }
}

statusline = () => {
  term.moveTo(1, term.height - 1);
  term.bgWhite.black(`${tasks.length} task${tasks.length != 1 ? "s" : ""} (${completed} completed)`.padEnd(term.width, " "));
}

output = str => {
  term.moveTo(1, term.height);
  term.eraseLine();
  term(str);
  term.moveTo(term.width, term.height);
}

err = str => {
  output(chalk.red(str));
  if (busy) busy = false;
}

setTasks = () => {
  config.set(`${DEV ? "devT" : "t"}asks`, tasks);
  completed = tasks.filter(i => i[1]).length;
  statusline();
}

init = () => {
  console.log("\u001B[?1049h")
  term.moveTo(1, 1);
  term.bold.cyan("ntdl\n");

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
