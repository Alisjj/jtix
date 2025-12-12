import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import {
  setConfig,
  getConfig,
  clearConfig,
  isConfigured,
} from "../utils/config.js";
import { jiraService } from "../services/jira.js";

export function configCommand(program: Command): void {
  const config = program
    .command("config")
    .description("Configure Jira credentials");

  config
    .command("set")
    .description("Set up Jira configuration")
    .action(async () => {
      const currentConfig = getConfig();

      const answers = await inquirer.prompt([
        {
          type: "input",
          name: "baseUrl",
          message: "Jira base URL (e.g., https://yourcompany.atlassian.net):",
          default: currentConfig.baseUrl || undefined,
          validate: (input: string) => {
            if (!input) return "Base URL is required";
            if (!input.startsWith("http"))
              return "URL must start with http:// or https://";
            return true;
          },
        },
        {
          type: "input",
          name: "email",
          message: "Your Jira email:",
          default: currentConfig.email || undefined,
          validate: (input: string) => {
            if (!input) return "Email is required";
            if (!input.includes("@")) return "Please enter a valid email";
            return true;
          },
        },
        {
          type: "password",
          name: "apiToken",
          message:
            "API Token (from https://id.atlassian.com/manage-profile/security/api-tokens):",
          validate: (input: string) => {
            if (!input) return "API Token is required";
            return true;
          },
        },
      ]);

      setConfig(answers);

      const spinner = ora("Verifying credentials...").start();

      try {
        await jiraService.getProjects();
        spinner.succeed(chalk.green("Configuration saved and verified!"));
        console.log(
          chalk.dim("\nYou can now use jtix to manage your Jira tickets."),
        );
        console.log(chalk.dim("Try: jtix list"));
      } catch (error: unknown) {
        spinner.fail(chalk.red("Failed to verify credentials"));
        if (error instanceof Error) {
          console.error(chalk.red(`Error: ${error.message}`));
        }
        console.log(
          chalk.yellow("\nCredentials saved but could not be verified."),
        );
        console.log(
          chalk.yellow("Please check your URL, email, and API token."),
        );
      }
    });

  config
    .command("show")
    .description("Show current configuration")
    .action(() => {
      if (!isConfigured()) {
        console.log(
          chalk.yellow(
            'Jira is not configured. Run "jtix config set" to set up.',
          ),
        );
        return;
      }

      const cfg = getConfig();
      console.log(chalk.bold("\nCurrent Configuration:\n"));
      console.log(`  ${chalk.dim("Base URL:")}  ${cfg.baseUrl}`);
      console.log(`  ${chalk.dim("Email:")}     ${cfg.email}`);
      console.log(`  ${chalk.dim("API Token:")} ${"*".repeat(20)}`);
    });

  config
    .command("clear")
    .description("Clear all configuration")
    .action(async () => {
      const { confirm } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirm",
          message: "Are you sure you want to clear all configuration?",
          default: false,
        },
      ]);

      if (confirm) {
        clearConfig();
        console.log(chalk.green("Configuration cleared."));
      } else {
        console.log(chalk.dim("Cancelled."));
      }
    });
}
