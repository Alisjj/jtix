import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { jiraService, getErrorMessage } from "../services/jira.js";
import { isConfigured } from "../utils/config.js";

export function watchCommand(program: Command): void {
  program
    .command("watch <issue>")
    .description("Watch or unwatch a Jira issue")
    .option("-r, --remove", "Stop watching the issue")
    .option("-l, --list", "List current watchers")
    .action(async (issueKey: string, options) => {
      if (!isConfigured()) {
        console.log(
          chalk.red('Jira is not configured. Run "jtix config set" first.'),
        );
        return;
      }

      const key = issueKey.toUpperCase();

      try {
        if (options.list) {
          const spinner = ora(`Fetching watchers for ${key}...`).start();
          const watchData = await jiraService.getWatchers(key);
          spinner.stop();

          console.log(
            chalk.bold(`\n  Watchers for ${key} (${watchData.watchCount}):\n`),
          );
          if (watchData.watchers.length === 0) {
            console.log(chalk.dim("    No watchers"));
          } else {
            for (const watcher of watchData.watchers) {
              console.log(`    ${chalk.cyan("•")} ${watcher.displayName}`);
            }
          }
          console.log();
          return;
        }

        if (options.remove) {
          const spinner = ora(`Removing watch from ${key}...`).start();
          await jiraService.unwatchIssue(key);
          spinner.succeed(
            chalk.green(`Stopped watching ${chalk.bold(key)}`),
          );
        } else {
          const spinner = ora(`Adding watch to ${key}...`).start();
          await jiraService.watchIssue(key);
          spinner.succeed(chalk.green(`Now watching ${chalk.bold(key)}`));
        }
      } catch (error: unknown) {
        console.error(chalk.red(`Error: ${getErrorMessage(error)}`));
      }
    });
}
