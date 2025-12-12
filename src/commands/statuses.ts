import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { jiraService, getErrorMessage } from "../services/jira.js";
import { isConfigured } from "../utils/config.js";

export function statusesCommand(program: Command): void {
  program
    .command("statuses")
    .alias("st")
    .description("List available Jira statuses")
    .option("-p, --project <key>", "Filter statuses by project")
    .action(async (options) => {
      if (!isConfigured()) {
        console.log(
          chalk.red('Jira is not configured. Run "jtix config set" first.'),
        );
        return;
      }

      const spinner = ora("Fetching statuses...").start();

      try {
        const statuses = await jiraService.getStatuses(options.project);

        spinner.stop();

        if (statuses.length === 0) {
          console.log(chalk.yellow("\nNo statuses found."));
          return;
        }

        // Group by category if available
        const grouped = new Map<string, typeof statuses>();
        for (const status of statuses) {
          const category = status.category || "Other";
          if (!grouped.has(category)) {
            grouped.set(category, []);
          }
          grouped.get(category)!.push(status);
        }

        console.log(chalk.bold("\n  Available Statuses:\n"));

        for (const [category, categoryStatuses] of grouped) {
          const categoryColor =
            category === "To Do"
              ? chalk.blue
              : category === "In Progress"
                ? chalk.yellow
                : category === "Done"
                  ? chalk.green
                  : chalk.dim;

          console.log(categoryColor(`  ${category}:`));
          for (const status of categoryStatuses) {
            console.log(`    ${chalk.cyan("•")} ${status.name}`);
          }
          console.log();
        }

        console.log(
          chalk.dim(`  Use with: jtix list -s "${statuses[0]?.name}"\n`),
        );
      } catch (error: unknown) {
        spinner.fail(chalk.red("Failed to fetch statuses"));
        console.error(chalk.red(`Error: ${getErrorMessage(error)}`));
      }
    });
}
