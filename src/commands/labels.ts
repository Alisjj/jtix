import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { jiraService, getErrorMessage } from "../services/jira.js";
import { isConfigured } from "../utils/config.js";

export function labelsCommand(program: Command): void {
  program
    .command("labels <issue>")
    .description("Manage labels on a Jira issue")
    .option("-a, --add <labels...>", "Add labels")
    .option("-r, --remove <labels...>", "Remove labels")
    .option("-l, --list", "List current labels")
    .action(async (issueKey: string, options) => {
      if (!isConfigured()) {
        console.log(
          chalk.red('Jira is not configured. Run "jtix config set" first.'),
        );
        return;
      }

      const key = issueKey.toUpperCase();

      try {
        if (options.list || (!options.add && !options.remove)) {
          const spinner = ora(`Fetching labels for ${key}...`).start();
          const issue = await jiraService.getIssue(key);
          spinner.stop();

          const labels = issue.fields.labels || [];
          console.log(chalk.bold(`\n  Labels for ${key}:\n`));
          if (labels.length === 0) {
            console.log(chalk.dim("    No labels"));
          } else {
            for (const label of labels) {
              console.log(`    ${chalk.cyan("•")} ${label}`);
            }
          }
          console.log();
          return;
        }

        if (options.add) {
          const spinner = ora(`Adding labels to ${key}...`).start();
          await jiraService.addLabels(key, options.add);
          spinner.succeed(
            chalk.green(
              `Added labels to ${chalk.bold(key)}: ${options.add.join(", ")}`,
            ),
          );
        }

        if (options.remove) {
          const spinner = ora(`Removing labels from ${key}...`).start();
          await jiraService.removeLabels(key, options.remove);
          spinner.succeed(
            chalk.green(
              `Removed labels from ${chalk.bold(key)}: ${options.remove.join(", ")}`,
            ),
          );
        }
      } catch (error: unknown) {
        console.error(chalk.red(`Error: ${getErrorMessage(error)}`));
      }
    });
}
