import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { jiraService, getErrorMessage } from "../services/jira.js";
import { isConfigured } from "../utils/config.js";

export function boardsCommand(program: Command): void {
  program
    .command("boards")
    .description("List Jira boards")
    .action(async () => {
      if (!isConfigured()) {
        console.log(
          chalk.red('Jira is not configured. Run "jtix config set" first.'),
        );
        return;
      }

      try {
        const spinner = ora("Fetching boards...").start();
        const boards = await jiraService.getBoards();
        spinner.stop();

        if (boards.length === 0) {
          console.log(chalk.yellow("No boards found."));
          return;
        }

        console.log(chalk.bold(`\n  Boards (${boards.length}):\n`));
        for (const board of boards) {
          const typeColor =
            board.type === "scrum" ? chalk.blue : chalk.green;
          console.log(
            `    ${chalk.cyan(board.id.toString().padStart(5))} ${board.name} ${typeColor(`[${board.type}]`)}`,
          );
        }
        console.log();
        console.log(
          chalk.dim("  Use 'jtix sprint --board <id>' to view sprints"),
        );
        console.log();
      } catch (error: unknown) {
        console.error(chalk.red(`Error: ${getErrorMessage(error)}`));
      }
    });
}
