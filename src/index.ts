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
import { statusCommand } from "./commands/status.js";
import { assignCommand } from "./commands/assign.js";
import { editCommand } from "./commands/edit.js";
import { deleteCommand } from "./commands/delete.js";
import { watchCommand } from "./commands/watch.js";
import { linkCommand } from "./commands/link.js";
import { sprintCommand } from "./commands/sprint.js";
import { searchCommand } from "./commands/search.js";
import { worklogCommand } from "./commands/worklog.js";
import { labelsCommand } from "./commands/labels.js";
import { priorityCommand } from "./commands/priority.js";
import { attachmentsCommand } from "./commands/attachments.js";
import { boardsCommand } from "./commands/boards.js";
import { estimateCommand } from "./commands/estimate.js";

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
statusCommand(program);
assignCommand(program);
editCommand(program);
deleteCommand(program);
watchCommand(program);
linkCommand(program);
sprintCommand(program);
searchCommand(program);
worklogCommand(program);
labelsCommand(program);
priorityCommand(program);
attachmentsCommand(program);
boardsCommand(program);
estimateCommand(program);

program.parse();
