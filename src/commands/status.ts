import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { jiraService } from "../services/jira.js";
import { isConfigured } from "../utils/config.js";

function getStatusColor(status: string): typeof chalk {
  const lower = status.toLowerCase();
  if (
    lower.includes("done") ||
    lower.includes("closed") ||
    lower.includes("resolved")
  ) {
    return chalk.green;
  }
  if (
    lower.includes("progress") ||
    lower.includes("dev") ||
    lower.includes("review")
  ) {
    return chalk.yellow;
  }
  if (lower.includes("blocked") || lower.includes("hold")) {
    return chalk.red;
  }
  return chalk.blue;
}

export function statusCommand(program: Command): void {
  program
    .command("status <issue>")
    .alias("s")
    .description("View the status of a Jira issue")
    .action(async (issueKey: string) => {
      if (!isConfigured()) {
        console.log(
          chalk.red('Jira is not configured. Run "jtix config set" first.'),
        );
        return;
      }

      const spinner = ora(`Checking ${issueKey}...`).start();

      try {
        const issue = await jiraService.getIssue(issueKey.toUpperCase());
        spinner.stop();

        const status = issue.fields.status.name;
        const statusColor = getStatusColor(status);
        const category = issue.fields.status.statusCategory?.name || "";

        console.log();
        console.log(
          `  ${chalk.bold.cyan(issue.key)} ${chalk.dim("•")} ${issue.fields.summary}`,
        );
        console.log();
        console.log(`  ${chalk.dim("Status:")}   ${statusColor.bold(status)}`);
        if (category) {
          console.log(`  ${chalk.dim("Category:")} ${chalk.dim(category)}`);
        }
        console.log();
      } catch (error: unknown) {
        spinner.fail(chalk.red(`Failed to fetch ${issueKey}`));
        if (error instanceof Error) {
          console.error(chalk.red(`Error: ${error.message}`));
        }
      }
    });
}
