import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { jiraService, getErrorMessage } from "../services/jira.js";
import { isConfigured, getConfig, setConfig } from "../utils/config.js";

export function searchCommand(program: Command): void {
  program
    .command("search [jql]")
    .alias("jql")
    .description("Search issues with JQL")
    .option("-n, --max <number>", "Maximum results", "20")
    .option("-s, --save <name>", "Save this query with a name")
    .option("-r, --run <name>", "Run a saved query")
    .option("-l, --list-saved", "List saved queries")
    .option("-d, --delete <name>", "Delete a saved query")
    .action(async (jql: string | undefined, options) => {
      if (!isConfigured()) {
        console.log(
          chalk.red('Jira is not configured. Run "jtix config set" first.'),
        );
        return;
      }

      try {
        const config = getConfig();
        const savedQueries = config.savedQueries || {};

        // List saved queries
        if (options.listSaved) {
          const queryNames = Object.keys(savedQueries);
          if (queryNames.length === 0) {
            console.log(chalk.yellow("No saved queries."));
            return;
          }
          console.log(chalk.bold("\n  Saved Queries:\n"));
          for (const name of queryNames) {
            console.log(`    ${chalk.cyan(name)}`);
            console.log(chalk.dim(`        ${savedQueries[name]}`));
          }
          console.log();
          return;
        }

        // Delete a saved query
        if (options.delete) {
          if (!savedQueries[options.delete]) {
            console.log(chalk.red(`Query "${options.delete}" not found.`));
            return;
          }
          delete savedQueries[options.delete];
          setConfig({ ...config, savedQueries });
          console.log(chalk.green(`Query "${options.delete}" deleted.`));
          return;
        }

        // Run a saved query
        let queryToRun = jql;
        if (options.run) {
          if (!savedQueries[options.run]) {
            console.log(chalk.red(`Query "${options.run}" not found.`));
            console.log(
              chalk.dim(
                `Available: ${Object.keys(savedQueries).join(", ") || "none"}`,
              ),
            );
            return;
          }
          queryToRun = savedQueries[options.run];
        }

        if (!queryToRun) {
          console.log(
            chalk.yellow(
              "Please provide a JQL query or use --run <name> to run a saved query.",
            ),
          );
          console.log(chalk.dim("\nExamples:"));
          console.log(
            chalk.dim('  jtix search "project = PROJ AND status = Open"'),
          );
          console.log(chalk.dim('  jtix search --run my-query"'));
          return;
        }

        // Save the query if requested
        if (options.save && jql) {
          savedQueries[options.save] = jql;
          setConfig({ ...config, savedQueries });
          console.log(chalk.green(`Query saved as "${options.save}"`));
        }

        const spinner = ora("Searching...").start();
        const maxResults = parseInt(options.max, 10);
        const result = await jiraService.searchIssues(queryToRun, maxResults);
        spinner.stop();

        if (result.issues.length === 0) {
          console.log(chalk.yellow("No issues found."));
          return;
        }

        console.log(
          chalk.bold(
            `\n  Found ${result.total} issue${result.total !== 1 ? "s" : ""} (showing ${result.issues.length}):\n`,
          ),
        );

        for (const issue of result.issues) {
          const status = issue.fields.status.name;
          const statusColor =
            status === "Done"
              ? chalk.green
              : status === "In Progress"
                ? chalk.blue
                : chalk.dim;

          console.log(
            `    ${chalk.cyan(issue.key)} ${issue.fields.summary.substring(0, 60)}${issue.fields.summary.length > 60 ? "..." : ""}`,
          );
          console.log(
            chalk.dim(
              `        ${statusColor(status)} | ${issue.fields.issuetype.name} | ${issue.fields.assignee?.displayName || "Unassigned"}`,
            ),
          );
        }
        console.log();
      } catch (error: unknown) {
        console.error(chalk.red(`Error: ${getErrorMessage(error)}`));
      }
    });
}
