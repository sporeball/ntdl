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

const commands = {
  // add task
  "a": () => {
    busy = true;

    output("a ");

    term.inputField({ style: term.green }, function(error, input) {
      tasks.push([input, false]);
      config.set("tasks", tasks);
      writeList();
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
      config.set("tasks", tasks);
      term.eraseArea(1, 2, term.width, term.height - 3);
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
  "X": async () => {
    let i = 0;
    let removed = 0;

    while (i < tasks.length) {
      term.moveTo(2, i + 2);
      if (tasks[i][1] == true) {
        term.eraseLine();
        removed++;
      }
      await sleep(10);
      i++;
    }
    tasks = tasks.filter(task => task[1] !== true);
    completed -= removed;
    config.set("tasks", tasks);
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

var tasks = config.get("tasks") || [];

var completed = 0;

var busy = false; // are we in the middle of a command?

// write current tasks to the terminal
writeList = async () => {
  if (tasks.length == 0) {
    term.moveTo(2, 2);
    term.gray("no tasks yet...");
    return;
  }
  let i = 0;
  while (i < tasks.length) {
    term.moveTo(2, i + 2);
    term.eraseLine();
    if (tasks[i][1] == true) {
      term(chalk.gray(`- ${tasks[i][0]} `) + symbols.success);
    } else {
      term("- %s ", tasks[i][0]);
    }
    await sleep(10);
    i++;
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
