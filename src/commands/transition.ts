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
    .action(async (issueKey: string, options) => {
      if (!isConfigured()) {
        console.log(
          chalk.red('Jira is not configured. Run "jtix config set" first.'),
        );
        return;
      }

      const key = issueKey.toUpperCase();

      try {
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
          // Default: pick the first available transition (next stage)
          selectedTransition = transitions[0];
          console.log(
            chalk.dim(
              `Available: ${transitions.map((t) => t.name).join(", ")}`,
            ),
          );
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
