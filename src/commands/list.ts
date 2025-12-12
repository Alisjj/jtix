import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { jiraService, JiraIssue, getErrorMessage } from "../services/jira.js";
import { isConfigured } from "../utils/config.js";

function formatIssueRow(issue: JiraIssue): string {
  const status = issue.fields.status.name;
  const statusColor =
    status.toLowerCase().includes("done") ||
    status.toLowerCase().includes("closed")
      ? chalk.green
      : status.toLowerCase().includes("progress")
        ? chalk.yellow
        : chalk.blue;

  const priority = issue.fields.priority?.name || "None";
  const priorityColor =
    priority.toLowerCase() === "highest" || priority.toLowerCase() === "high"
      ? chalk.red
      : priority.toLowerCase() === "medium"
        ? chalk.yellow
        : chalk.dim;

  const assignee = issue.fields.assignee?.displayName || "Unassigned";
  const summary =
    issue.fields.summary.length > 50
      ? issue.fields.summary.substring(0, 47) + "..."
      : issue.fields.summary;

  return `  ${chalk.cyan(issue.key.padEnd(12))} ${statusColor(status.padEnd(15))} ${priorityColor(priority.padEnd(10))} ${chalk.dim(assignee.padEnd(20))} ${summary}`;
}

export function listCommand(program: Command): void {
  program
    .command("list")
    .alias("ls")
    .description("List Jira issues")
    .option("-m, --mine", "Show only issues assigned to me (default)")
    .option("-r, --reporter", "Show issues I reported")
    .option("-w, --watching", "Show issues I'm watching")
    .option("-a, --all", "Show all issues (requires -p project)")
    .option("-p, --project <key>", "Filter by project key")
    .option("-s, --status <status>", "Filter by status")
    .option("-q, --query <jql>", "Custom JQL query")
    .option("-n, --limit <number>", "Max results to show", "50")
    .action(async (options) => {
      if (!isConfigured()) {
        console.log(
          chalk.red('Jira is not configured. Run "jtix config set" first.'),
        );
        return;
      }

      const spinner = ora("Fetching issues...").start();

      try {
        let jql = "";

        if (options.query) {
          jql = options.query;
        } else {
          const conditions: string[] = [];

          // Determine the user filter
          if (options.reporter) {
            conditions.push("reporter = currentUser()");
          } else if (options.watching) {
            conditions.push("watcher = currentUser()");
          } else if (options.all) {
            if (!options.project) {
              spinner.stop();
              console.log(
                chalk.yellow(
                  "\nUsing --all requires a project filter (-p PROJECT_KEY).",
                ),
              );
              console.log(chalk.dim("Example: jtix list --all -p MYPROJECT"));
              return;
            }
          } else {
            // Default: assigned to me
            conditions.push("assignee = currentUser()");
          }

          if (options.project) {
            conditions.push(`project = "${options.project}"`);
          }

          if (options.status) {
            conditions.push(`status = "${options.status}"`);
          }

          jql = conditions.join(" AND ") + " ORDER BY updated DESC";
        }

        const result = await jiraService.searchIssues(
          jql,
          parseInt(options.limit),
        );

        spinner.stop();

        if (result.issues.length === 0) {
          console.log(chalk.yellow("\nNo issues found."));
          return;
        }

        console.log(
          chalk.bold(
            `\n  ${"KEY".padEnd(12)} ${"STATUS".padEnd(15)} ${"PRIORITY".padEnd(10)} ${"ASSIGNEE".padEnd(20)} SUMMARY\n`,
          ),
        );

        for (const issue of result.issues) {
          console.log(formatIssueRow(issue));
        }

        console.log(
          chalk.dim(
            `\n  Showing ${result.issues.length}${result.total ? ` of ${result.total}` : ""} issues\n`,
          ),
        );
      } catch (error: unknown) {
        spinner.fail(chalk.red("Failed to fetch issues"));
        console.error(chalk.red(`Error: ${getErrorMessage(error)}`));
      }
    });
}
