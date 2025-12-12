import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { jiraService, getErrorMessage } from "../services/jira.js";
import { isConfigured } from "../utils/config.js";

export function projectsCommand(program: Command): void {
  program
    .command("projects")
    .alias("pr")
    .description("List available Jira projects")
    .action(async () => {
      if (!isConfigured()) {
        console.log(
          chalk.red('Jira is not configured. Run "jtix config set" first.'),
        );
        return;
      }

      const spinner = ora("Fetching projects...").start();

      try {
        const projects = await jiraService.getProjects();

        spinner.stop();

        if (projects.length === 0) {
          console.log(chalk.yellow("\nNo projects found."));
          return;
        }

        console.log(chalk.bold(`\n  ${"KEY".padEnd(12)} NAME\n`));

        for (const project of projects) {
          console.log(
            `  ${chalk.cyan(project.key.padEnd(12))} ${project.name}`,
          );
        }

        console.log(chalk.dim(`\n  ${projects.length} projects\n`));
      } catch (error: unknown) {
        spinner.fail(chalk.red("Failed to fetch projects"));
        console.error(chalk.red(`Error: ${getErrorMessage(error)}`));
      }
    });
}
