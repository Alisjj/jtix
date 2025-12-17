import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { jiraService, getErrorMessage } from "../services/jira.js";
import { isConfigured } from "../utils/config.js";

export function worklogCommand(program: Command): void {
  program
    .command("worklog <issue>")
    .alias("log")
    .description("Log time on a Jira issue")
    .option("-t, --time <time>", "Time spent (e.g., '2h', '30m', '1d')")
    .option("-c, --comment <comment>", "Work description")
    .option("-l, --list", "List work logs for the issue")
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
          const spinner = ora(`Fetching work logs for ${key}...`).start();
          const worklogs = await jiraService.getWorklogs(key);
          spinner.stop();

          if (worklogs.length === 0) {
            console.log(chalk.yellow(`No work logs for ${key}.`));
            return;
          }

          console.log(chalk.bold(`\n  Work Logs for ${key}:\n`));
          for (const log of worklogs) {
            const date = new Date(log.started).toLocaleDateString();
            const comment = log.comment?.content?.[0]?.content?.[0]?.text || "";
            console.log(
              `    ${chalk.cyan(log.timeSpent)} - ${log.author.displayName} (${chalk.dim(date)})`,
            );
            if (comment) {
              console.log(chalk.dim(`        ${comment}`));
            }
          }
          console.log();
          return;
        }

        if (!options.time) {
          console.log(
            chalk.yellow(
              "Please specify time with --time (e.g., --time 2h)",
            ),
          );
          console.log(chalk.dim("\nExamples:"));
          console.log(chalk.dim("  jtix worklog PROJ-123 --time 2h"));
          console.log(
            chalk.dim(
              '  jtix worklog PROJ-123 --time 30m --comment "Fixed bug"',
            ),
          );
          return;
        }

        const spinner = ora(`Logging ${options.time} on ${key}...`).start();
        await jiraService.addWorklog(key, options.time, options.comment);
        spinner.succeed(
          chalk.green(
            `Logged ${chalk.bold(options.time)} on ${chalk.bold(key)}`,
          ),
        );
      } catch (error: unknown) {
        console.error(chalk.red(`Error: ${getErrorMessage(error)}`));
      }
    });
}
