import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { jiraService, getErrorMessage } from "../services/jira.js";
import { isConfigured } from "../utils/config.js";

export function transitionCommand(program: Command): void {
  program
    .command("transition <issue>")
    .alias("tr")
    .description("Change the status of a Jira issue (default: next status)")
    .option("-s, --status <status>", "Target status name")
    .option("-p, --pick", "Pick from available transitions")
    .option("-l, --list", "List available transitions without changing")
    .option("-h, --history", "Show transition history")
    .action(async (issueKey: string, options) => {
      if (!isConfigured()) {
        console.log(
          chalk.red('Jira is not configured. Run "jtix config set" first.'),
        );
        return;
      }

      const key = issueKey.toUpperCase();

      try {
        // Show transition history
        if (options.history) {
          const spinner = ora(`Fetching transition history for ${key}...`).start();
          const changelog = await jiraService.getIssueChangelog(key);
          spinner.stop();

          // Filter for status changes only
          const statusChanges = changelog
            .filter((entry) => entry.items.some((item) => item.field === "status"))
            .map((entry) => ({
              date: entry.created,
              author: entry.author.displayName,
              change: entry.items.find((item) => item.field === "status"),
            }));

          if (statusChanges.length === 0) {
            console.log(chalk.yellow(`No transition history for ${key}.`));
            return;
          }

          console.log(chalk.bold(`\n  Transition History for ${key}:\n`));
          for (const change of statusChanges) {
            const date = new Date(change.date).toLocaleString();
            const from = change.change?.fromString || "None";
            const to = change.change?.toString || "Unknown";
            console.log(
              `    ${chalk.dim(date)} - ${chalk.cyan(change.author)}`,
            );
            console.log(
              `        ${chalk.red(from)} ${chalk.dim("→")} ${chalk.green(to)}`,
            );
          }
          console.log();
          return;
        }

        const spinner = ora(
          `Fetching available transitions for ${key}...`,
        ).start();

        const transitions = await jiraService.getTransitions(key);

        spinner.stop();

        if (transitions.length === 0) {
          console.log(chalk.yellow(`No transitions available for ${key}.`));
          return;
        }

        // Just list transitions and exit
        if (options.list) {
          console.log(chalk.bold(`\n  Available transitions for ${key}:\n`));
          for (const t of transitions) {
            console.log(`    ${chalk.cyan("•")} ${t.name}`);
          }
          console.log();
          return;
        }

        let selectedTransition: { id: string; name: string };

        if (options.status) {
          // Find transition by name (case-insensitive)
          const found = transitions.find(
            (t) => t.name.toLowerCase() === options.status.toLowerCase(),
          );
          if (!found) {
            console.log(chalk.red(`Status "${options.status}" not available.`));
            console.log(
              chalk.dim(
                `Available: ${transitions.map((t) => t.name).join(", ")}`,
              ),
            );
            return;
          }
          selectedTransition = found;
        } else if (options.pick) {
          // Prompt user to select
          const { selected } = await inquirer.prompt([
            {
              type: "list",
              name: "selected",
              message: `Select new status for ${key}:`,
              choices: transitions.map((t) => ({
                name: t.name,
                value: t,
              })),
            },
          ]);
          selectedTransition = selected;
        } else {
          // Show available transitions before prompting
          console.log(chalk.bold(`\n  Available transitions for ${key}:\n`));
          for (const t of transitions) {
            console.log(`    ${chalk.cyan("•")} ${t.name}`);
          }
          console.log();

          // Prompt user to select
          const { selected } = await inquirer.prompt([
            {
              type: "list",
              name: "selected",
              message: `Select new status for ${key}:`,
              choices: transitions.map((t) => ({
                name: t.name,
                value: t,
              })),
            },
          ]);
          selectedTransition = selected;
        }

        const transitionSpinner = ora(
          `Transitioning ${key} to "${selectedTransition.name}"...`,
        ).start();

        await jiraService.transitionIssue(key, selectedTransition.id);

        transitionSpinner.succeed(
          chalk.green(
            `${chalk.bold(key)} transitioned to ${chalk.bold(selectedTransition.name)}`,
          ),
        );
      } catch (error: unknown) {
        console.error(chalk.red(`Error: ${getErrorMessage(error)}`));
      }
    });
}
