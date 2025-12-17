import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { jiraService, getErrorMessage } from "../services/jira.js";
import { isConfigured } from "../utils/config.js";

export function estimateCommand(program: Command): void {
  program
    .command("estimate <issue>")
    .alias("est")
    .description("Set or view story points for a Jira issue")
    .option("-s, --set <points>", "Set story points")
    .action(async (issueKey: string, options) => {
      if (!isConfigured()) {
        console.log(
          chalk.red('Jira is not configured. Run "jtix config set" first.'),
        );
        return;
      }

      const key = issueKey.toUpperCase();

      try {
        // Get current story points
        const spinner = ora(`Fetching story points for ${key}...`).start();
        const storyPoints = await jiraService.getIssueStoryPoints(key);
        spinner.stop();

        if (!storyPoints) {
          console.log(
            chalk.yellow(
              "Story points field not found in this Jira instance.",
            ),
          );
          return;
        }

        const currentPoints = storyPoints.value;
        console.log(
          chalk.dim(
            `\n  Current story points: ${currentPoints !== null ? currentPoints : "Not set"}`,
          ),
        );

        let newPoints: number;

        if (options.set) {
          newPoints = parseFloat(options.set);
          if (isNaN(newPoints)) {
            console.log(chalk.red("Invalid story points value."));
            return;
          }
        } else {
          const { points } = await inquirer.prompt([
            {
              type: "input",
              name: "points",
              message: `Enter story points for ${key}:`,
              default: currentPoints?.toString() || "",
              validate: (input) => {
                const num = parseFloat(input);
                if (isNaN(num) || num < 0) {
                  return "Please enter a valid positive number";
                }
                return true;
              },
            },
          ]);
          newPoints = parseFloat(points);
        }

        const updateSpinner = ora(
          `Setting story points for ${key} to ${newPoints}...`,
        ).start();
        await jiraService.setStoryPoints(key, newPoints);
        updateSpinner.succeed(
          chalk.green(
            `${chalk.bold(key)} story points set to ${chalk.bold(newPoints.toString())}`,
          ),
        );
      } catch (error: unknown) {
        console.error(chalk.red(`Error: ${getErrorMessage(error)}`));
      }
    });
}
