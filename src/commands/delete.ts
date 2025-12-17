import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { jiraService, getErrorMessage } from "../services/jira.js";
import { isConfigured } from "../utils/config.js";

export function deleteCommand(program: Command): void {
  program
    .command("delete <issue>")
    .alias("rm")
    .description("Delete a Jira issue")
    .option("-s, --subtasks", "Also delete subtasks")
    .option("-f, --force", "Skip confirmation prompt")
    .action(async (issueKey: string, options) => {
      if (!isConfigured()) {
        console.log(
          chalk.red('Jira is not configured. Run "jtix config set" first.'),
        );
        return;
      }

      const key = issueKey.toUpperCase();

      try {
        if (!options.force) {
          const { confirm } = await inquirer.prompt([
            {
              type: "confirm",
              name: "confirm",
              message: chalk.red(
                `Are you sure you want to delete ${chalk.bold(key)}? This cannot be undone.`,
              ),
              default: false,
            },
          ]);

          if (!confirm) {
            console.log(chalk.dim("Cancelled."));
            return;
          }
        }

        const spinner = ora(`Deleting ${key}...`).start();
        await jiraService.deleteIssue(key, options.subtasks || false);
        spinner.succeed(chalk.green(`${chalk.bold(key)} deleted successfully`));
      } catch (error: unknown) {
        console.error(chalk.red(`Error: ${getErrorMessage(error)}`));
      }
    });
}
