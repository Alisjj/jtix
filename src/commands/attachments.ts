import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { jiraService, getErrorMessage } from "../services/jira.js";
import { isConfigured } from "../utils/config.js";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function attachmentsCommand(program: Command): void {
  program
    .command("attachments <issue>")
    .alias("attach")
    .description("Manage attachments on a Jira issue")
    .option("-a, --add <file>", "Add an attachment")
    .option("-l, --list", "List attachments (default)")
    .action(async (issueKey: string, options) => {
      if (!isConfigured()) {
        console.log(
          chalk.red('Jira is not configured. Run "jtix config set" first.'),
        );
        return;
      }

      const key = issueKey.toUpperCase();

      try {
        if (options.add) {
          const spinner = ora(`Uploading attachment to ${key}...`).start();
          await jiraService.addAttachment(key, options.add);
          spinner.succeed(
            chalk.green(`Attachment added to ${chalk.bold(key)}`),
          );
          return;
        }

        // Default: list attachments
        const spinner = ora(`Fetching attachments for ${key}...`).start();
        const attachments = await jiraService.getAttachments(key);
        spinner.stop();

        if (attachments.length === 0) {
          console.log(chalk.yellow(`No attachments on ${key}.`));
          return;
        }

        console.log(
          chalk.bold(`\n  Attachments for ${key} (${attachments.length}):\n`),
        );
        for (const att of attachments) {
          const date = new Date(att.created).toLocaleDateString();
          console.log(`    ${chalk.cyan("•")} ${att.filename}`);
          console.log(
            chalk.dim(
              `        ${formatBytes(att.size)} | ${att.author.displayName} | ${date}`,
            ),
          );
          console.log(chalk.dim(`        ${att.content}`));
        }
        console.log();
      } catch (error: unknown) {
        console.error(chalk.red(`Error: ${getErrorMessage(error)}`));
      }
    });
}
