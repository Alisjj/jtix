import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";
import { jiraService, getErrorMessage } from "../services/jira.js";
import { isConfigured } from "../utils/config.js";

export function linkCommand(program: Command): void {
  program
    .command("link <issue> <target>")
    .description("Link two Jira issues together")
    .option("-t, --type <type>", "Link type (e.g., 'blocks', 'relates to')")
    .option("-l, --list-types", "List available link types")
    .action(async (issueKey: string, targetKey: string, options) => {
      if (!isConfigured()) {
        console.log(
          chalk.red('Jira is not configured. Run "jtix config set" first.'),
        );
        return;
      }

      const key = issueKey.toUpperCase();
      const target = targetKey.toUpperCase();

      try {
        const spinner = ora("Fetching link types...").start();
        const linkTypes = await jiraService.getIssueLinkTypes();
        spinner.stop();

        if (options.listTypes) {
          console.log(chalk.bold("\n  Available link types:\n"));
          for (const lt of linkTypes) {
            console.log(
              `    ${chalk.cyan("•")} ${chalk.bold(lt.name)}`,
            );
            console.log(
              chalk.dim(`        Outward: "${lt.outward}" / Inward: "${lt.inward}"`),
            );
          }
          console.log();
          return;
        }

        let selectedType: { name: string };

        if (options.type) {
          const found = linkTypes.find(
            (lt) =>
              lt.name.toLowerCase() === options.type.toLowerCase() ||
              lt.inward.toLowerCase() === options.type.toLowerCase() ||
              lt.outward.toLowerCase() === options.type.toLowerCase(),
          );
          if (!found) {
            console.log(chalk.red(`Link type "${options.type}" not found.`));
            console.log(
              chalk.dim(
                `Available: ${linkTypes.map((lt) => lt.name).join(", ")}`,
              ),
            );
            return;
          }
          selectedType = found;
        } else {
          const { selected } = await inquirer.prompt([
            {
              type: "list",
              name: "selected",
              message: "Select link type:",
              choices: linkTypes.map((lt) => ({
                name: `${lt.name} (${lt.outward} / ${lt.inward})`,
                value: lt,
              })),
            },
          ]);
          selectedType = selected;
        }

        const linkSpinner = ora(
          `Linking ${key} to ${target}...`,
        ).start();
        await jiraService.linkIssues(key, target, selectedType.name);
        linkSpinner.succeed(
          chalk.green(
            `${chalk.bold(key)} linked to ${chalk.bold(target)} (${selectedType.name})`,
          ),
        );
      } catch (error: unknown) {
        console.error(chalk.red(`Error: ${getErrorMessage(error)}`));
      }
    });
}
