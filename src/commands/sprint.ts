import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { jiraService, getErrorMessage } from "../services/jira.js";
import { isConfigured } from "../utils/config.js";

export function sprintCommand(program: Command): void {
  program
    .command("sprint")
    .description("View sprint information")
    .option("-b, --board <id>", "Board ID")
    .option("-l, --list", "List sprints for a board")
    .option("-i, --issues <sprintId>", "List issues in a sprint")
    .option("-a, --all", "Include closed sprints")
    .action(async (options) => {
      if (!isConfigured()) {
        console.log(
          chalk.red('Jira is not configured. Run "jtix config set" first.'),
        );
        return;
      }

      try {
        // If no board specified, list boards first
        let boardId = options.board;

        if (!boardId && !options.issues) {
          const spinner = ora("Fetching boards...").start();
          const boards = await jiraService.getBoards();
          spinner.stop();

          if (boards.length === 0) {
            console.log(chalk.yellow("No boards found."));
            return;
          }

          const { selected } = await inquirer.prompt([
            {
              type: "list",
              name: "selected",
              message: "Select a board:",
              choices: boards.map((b) => ({
                name: `${b.name} (${b.type})`,
                value: b.id,
              })),
            },
          ]);
          boardId = selected;
        }

        if (options.issues) {
          const spinner = ora("Fetching sprint issues...").start();
          const issues = await jiraService.getSprintIssues(
            parseInt(options.issues, 10),
          );
          spinner.stop();

          if (issues.length === 0) {
            console.log(chalk.yellow("No issues in this sprint."));
            return;
          }

          console.log(chalk.bold(`\n  Sprint Issues (${issues.length}):\n`));
          for (const issue of issues) {
            const status = issue.fields.status.name;
            const statusColor =
              status === "Done"
                ? chalk.green
                : status === "In Progress"
                  ? chalk.blue
                  : chalk.dim;
            console.log(
              `    ${chalk.cyan(issue.key)} ${issue.fields.summary}`,
            );
            console.log(
              chalk.dim(
                `        ${statusColor(status)} | ${issue.fields.assignee?.displayName || "Unassigned"}`,
              ),
            );
          }
          console.log();
          return;
        }

        // List sprints for the board
        const state = options.all ? "active,future,closed" : "active,future";
        const spinner = ora("Fetching sprints...").start();
        const sprints = await jiraService.getSprints(boardId, state);
        spinner.stop();

        if (sprints.length === 0) {
          console.log(chalk.yellow("No sprints found."));
          return;
        }

        console.log(chalk.bold(`\n  Sprints:\n`));
        for (const sprint of sprints) {
          const stateColor =
            sprint.state === "active"
              ? chalk.green
              : sprint.state === "future"
                ? chalk.blue
                : chalk.dim;
          console.log(
            `    ${chalk.cyan(sprint.id.toString())} ${sprint.name} ${stateColor(`[${sprint.state}]`)}`,
          );
          if (sprint.startDate || sprint.endDate) {
            console.log(
              chalk.dim(
                `        ${sprint.startDate ? `Start: ${new Date(sprint.startDate).toLocaleDateString()}` : ""} ${sprint.endDate ? `End: ${new Date(sprint.endDate).toLocaleDateString()}` : ""}`,
              ),
            );
          }
        }
        console.log();
        console.log(
          chalk.dim("  Use --issues <sprintId> to view issues in a sprint"),
        );
        console.log();
      } catch (error: unknown) {
        console.error(chalk.red(`Error: ${getErrorMessage(error)}`));
      }
    });
}
