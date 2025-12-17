import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { jiraService, getErrorMessage } from "../services/jira.js";
import { isConfigured } from "../utils/config.js";

export function priorityCommand(program: Command): void {
  program
    .command("priority <issue>")
    .alias("prio")
    .description("Change the priority of a Jira issue")
    .option("-s, --set <priority>", "Set priority by name")
    .option("-l, --list", "List available priorities")
    .action(async (issueKey: string, options) => {
      if (!isConfigured()) {
        console.log(
          chalk.red('Jira is not configured. Run "jtix config set" first.'),
        );
        return;
      }

      const key = issueKey.toUpperCase();

      try {
        const spinner = ora("Fetching priorities...").start();
        const priorities = await jiraService.getPriorities();
        spinner.stop();

        if (options.list) {
          console.log(chalk.bold("\n  Available Priorities:\n"));
          for (const p of priorities) {
            console.log(`    ${chalk.cyan("•")} ${p.name}`);
          }
          console.log();
          return;
        }

        let selectedPriority: { id: string; name: string };

        if (options.set) {
          const found = priorities.find(
            (p) => p.name.toLowerCase() === options.set.toLowerCase(),
          );
          if (!found) {
            console.log(chalk.red(`Priority "${options.set}" not found.`));
            console.log(
              chalk.dim(
                `Available: ${priorities.map((p) => p.name).join(", ")}`,
              ),
            );
            return;
          }
          selectedPriority = found;
        } else {
          // Get current priority
          const issueSpinner = ora(`Fetching ${key}...`).start();
          const issue = await jiraService.getIssue(key);
          issueSpinner.stop();

          const currentPriority = issue.fields.priority?.name || "None";
          console.log(chalk.dim(`\n  Current priority: ${currentPriority}\n`));

          const { selected } = await inquirer.prompt([
            {
              type: "list",
              name: "selected",
              message: `Select new priority for ${key}:`,
              choices: priorities.map((p) => ({
                name: p.name,
                value: p,
              })),
            },
          ]);
          selectedPriority = selected;
        }

        const updateSpinner = ora(
          `Setting priority of ${key} to ${selectedPriority.name}...`,
        ).start();
        await jiraService.updateIssue(key, {
          priority: { id: selectedPriority.id },
        });
        updateSpinner.succeed(
          chalk.green(
            `${chalk.bold(key)} priority set to ${chalk.bold(selectedPriority.name)}`,
          ),
        );
      } catch (error: unknown) {
        console.error(chalk.red(`Error: ${getErrorMessage(error)}`));
      }
    });
}
