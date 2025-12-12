#!/usr/bin/env node

// Suppress experimental warnings
process.removeAllListeners("warning");

import { Command } from "commander";
import { configCommand } from "./commands/config.js";
import { listCommand } from "./commands/list.js";
import { viewCommand } from "./commands/view.js";
import { createCommand } from "./commands/create.js";
import { commentCommand } from "./commands/comment.js";
import { commentsCommand } from "./commands/comments.js";
import { transitionCommand } from "./commands/transition.js";
import { openCommand } from "./commands/open.js";
import { projectsCommand } from "./commands/projects.js";
import { statusesCommand } from "./commands/statuses.js";

const program = new Command();

program
  .name("jtix")
  .description("A CLI tool for managing Jira tickets")
  .version("1.0.0");

// Register commands
configCommand(program);
listCommand(program);
viewCommand(program);
createCommand(program);
commentCommand(program);
commentsCommand(program);
transitionCommand(program);
openCommand(program);
projectsCommand(program);
statusesCommand(program);

program.parse();
