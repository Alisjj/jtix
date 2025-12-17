import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { jiraService, getErrorMessage } from "../services/jira.js";
import { isConfigured } from "../utils/config.js";

export function editCommand(program: Command): void {
  program
    .command("edit <issue>")
    .description("Edit a Jira issue")
    .option("-s, --summary <summary>", "New summary")
    .option("-d, --description <description>", "New description")
    .option("-i, --interactive", "Edit interactively")
    .action(async (issueKey: string, options) => {
      if (!isConfigured()) {
        console.log(
          chalk.red('Jira is not configured. Run "jtix config set" first.'),
        );
        return;
      }

      const key = issueKey.toUpperCase();

      try {
        const fields: Record<string, unknown> = {};

        if (options.interactive) {
          const spinner = ora(`Fetching ${key}...`).start();
          const issue = await jiraService.getIssue(key);
          spinner.stop();

          const currentSummary = issue.fields.summary;
          const currentDescription =
            typeof issue.fields.description === "string"
              ? issue.fields.description
              : "";

          const answers = await inquirer.prompt([
            {
              type: "input",
              name: "summary",
              message: "Summary:",
              default: currentSummary,
            },
            {
              type: "editor",
              name: "description",
              message: "Description:",
              default: currentDescription,
            },
          ]);

          if (answers.summary !== currentSummary) {
            fields.summary = answers.summary;
          }
          if (answers.description !== currentDescription) {
            fields.description = {
              type: "doc",
              version: 1,
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: answers.description }],
                },
              ],
            };
          }
        } else {
          if (options.summary) {
            fields.summary = options.summary;
          }
          if (options.description) {
            fields.description = {
              type: "doc",
              version: 1,
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: options.description }],
                },
              ],
            };
          }
        }

        if (Object.keys(fields).length === 0) {
          console.log(
            chalk.yellow(
              "No changes specified. Use --summary, --description, or --interactive.",
            ),
          );
          return;
        }

        const spinner = ora(`Updating ${key}...`).start();
        await jiraService.updateIssue(key, fields);
        spinner.succeed(chalk.green(`${chalk.bold(key)} updated successfully`));
      } catch (error: unknown) {
        console.error(chalk.red(`Error: ${getErrorMessage(error)}`));
      }
    });
}
