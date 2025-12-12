import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { jiraService, getErrorMessage } from "../services/jira.js";
import { isConfigured } from "../utils/config.js";

export function commentCommand(program: Command): void {
  program
    .command("comment <issue>")
    .alias("cm")
    .description("Add a comment to a Jira issue")
    .option("-m, --message <message>", "Comment message")
    .action(async (issueKey: string, options) => {
      if (!isConfigured()) {
        console.log(
          chalk.red('Jira is not configured. Run "jtix config set" first.'),
        );
        return;
      }

      const key = issueKey.toUpperCase();

      try {
        let comment = options.message;

        // If comment not provided, prompt with editor
        if (!comment) {
          const { inputComment } = await inquirer.prompt([
            {
              type: "editor",
              name: "inputComment",
              message: `Enter comment for ${key} (opens editor):`,
            },
          ]);
          comment = inputComment?.trim();
        }

        if (!comment) {
          console.log(chalk.yellow("No comment provided. Cancelled."));
          return;
        }

        const spinner = ora(`Adding comment to ${key}...`).start();

        await jiraService.addComment(key, comment);

        spinner.succeed(chalk.green(`Comment added to ${chalk.bold(key)}`));
      } catch (error: unknown) {
        console.error(chalk.red(`Error: ${getErrorMessage(error)}`));
      }
    });
}
