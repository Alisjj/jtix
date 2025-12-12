import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { jiraService, getErrorMessage } from "../services/jira.js";
import { isConfigured } from "../utils/config.js";

export function createCommand(program: Command): void {
  program
    .command("create")
    .alias("c")
    .description("Create a new Jira issue")
    .option("-p, --project <key>", "Project key")
    .option("-t, --type <type>", "Issue type (e.g., Task, Bug, Story)")
    .option("-s, --summary <summary>", "Issue summary/title")
    .option("-d, --description <description>", "Issue description")
    .action(async (options) => {
      if (!isConfigured()) {
        console.log(
          chalk.red('Jira is not configured. Run "jtix config set" first.'),
        );
        return;
      }

      try {
        let projectKey = options.project;
        let issueType = options.type;
        let summary = options.summary;
        let description = options.description;

        // If project not provided, fetch and prompt
        if (!projectKey) {
          const spinner = ora("Fetching projects...").start();
          const projects = await jiraService.getProjects();
          spinner.stop();

          const { selectedProject } = await inquirer.prompt([
            {
              type: "list",
              name: "selectedProject",
              message: "Select a project:",
              choices: projects.map((p) => ({
                name: `${p.key} - ${p.name}`,
                value: p.key,
              })),
            },
          ]);
          projectKey = selectedProject;
        }

        // If issue type not provided, prompt with common types
        if (!issueType) {
          const { selectedType } = await inquirer.prompt([
            {
              type: "list",
              name: "selectedType",
              message: "Select issue type:",
              choices: ["Task", "Bug", "Story", "Epic", "Sub-task"],
            },
          ]);
          issueType = selectedType;
        }

        // Prompt for summary if not provided
        if (!summary) {
          const { inputSummary } = await inquirer.prompt([
            {
              type: "input",
              name: "inputSummary",
              message: "Issue summary:",
              validate: (input: string) =>
                input.length > 0 || "Summary is required",
            },
          ]);
          summary = inputSummary;
        }

        // Prompt for description if not provided
        if (!description) {
          const { inputDescription } = await inquirer.prompt([
            {
              type: "editor",
              name: "inputDescription",
              message: "Issue description (optional, opens editor):",
            },
          ]);
          description = inputDescription?.trim() || undefined;
        }

        const spinner = ora("Creating issue...").start();

        const result = await jiraService.createIssue(
          projectKey,
          summary,
          issueType,
          description,
        );

        spinner.succeed(
          chalk.green(`Created issue: ${chalk.bold(result.key)}`),
        );
        console.log(
          chalk.dim(`  View: ${jiraService.getBrowseUrl(result.key)}`),
        );
      } catch (error: unknown) {
        console.error(chalk.red(`Error: ${getErrorMessage(error)}`));
      }
    });
}
