import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { jiraService, getErrorMessage } from "../services/jira.js";
import { isConfigured } from "../utils/config.js";

export function assignCommand(program: Command): void {
  program
    .command("assign <issue>")
    .description("Assign or unassign a Jira issue")
    .option("-u, --user <query>", "Search for user by name or email")
    .option("-m, --me", "Assign to yourself")
    .option("-r, --remove", "Unassign the issue")
    .action(async (issueKey: string, options) => {
      if (!isConfigured()) {
        console.log(
          chalk.red('Jira is not configured. Run "jtix config set" first.'),
        );
        return;
      }

      const key = issueKey.toUpperCase();

      try {
        if (options.remove) {
          const spinner = ora(`Unassigning ${key}...`).start();
          await jiraService.assignIssue(key, null);
          spinner.succeed(chalk.green(`${chalk.bold(key)} unassigned`));
          return;
        }

        if (options.me) {
          const spinner = ora(`Assigning ${key} to yourself...`).start();
          const currentUser = await jiraService.getCurrentUser();
          await jiraService.assignIssue(key, currentUser.accountId);
          spinner.succeed(
            chalk.green(
              `${chalk.bold(key)} assigned to ${chalk.bold(currentUser.displayName)}`,
            ),
          );
          return;
        }

        const spinner = ora(`Fetching assignable users for ${key}...`).start();
        let users;

        if (options.user) {
          users = await jiraService.searchUsers(options.user);
        } else {
          users = await jiraService.getAssignableUsers(key);
        }

        spinner.stop();

        if (users.length === 0) {
          console.log(chalk.yellow("No assignable users found."));
          return;
        }

        const { selected } = await inquirer.prompt([
          {
            type: "list",
            name: "selected",
            message: `Select user to assign ${key}:`,
            choices: users.map((u) => ({
              name: `${u.displayName}${u.emailAddress ? ` (${u.emailAddress})` : ""}`,
              value: u,
            })),
          },
        ]);

        const assignSpinner = ora(
          `Assigning ${key} to ${selected.displayName}...`,
        ).start();
        await jiraService.assignIssue(key, selected.accountId);
        assignSpinner.succeed(
          chalk.green(
            `${chalk.bold(key)} assigned to ${chalk.bold(selected.displayName)}`,
          ),
        );
      } catch (error: unknown) {
        console.error(chalk.red(`Error: ${getErrorMessage(error)}`));
      }
    });
}
