import { Command } from "commander";
import chalk from "chalk";
import { exec, execSync } from "child_process";
import { platform } from "os";
import { jiraService } from "../services/jira.js";
import { isConfigured } from "../utils/config.js";

function findLinuxBrowser(): string | null {
  const browsers = [
    "xdg-open",
    "sensible-browser",
    "x-www-browser",
    "gnome-open",
    "kde-open",
    "firefox",
    "google-chrome",
    "chromium",
    "chromium-browser",
  ];

  for (const browser of browsers) {
    try {
      execSync(`which ${browser}`, { stdio: "ignore" });
      return browser;
    } catch {
      // Browser not found, try next
    }
  }
  return null;
}

function openUrl(url: string, callback: (error: Error | null) => void): void {
  const os = platform();
  let command: string;

  switch (os) {
    case "darwin":
      command = `open "${url}"`;
      break;
    case "win32":
      command = `start "" "${url}"`;
      break;
    default: {
      // Linux and others - find available browser
      const browser = findLinuxBrowser();
      if (!browser) {
        callback(new Error("No browser found"));
        return;
      }
      command = `${browser} "${url}"`;
    }
  }

  exec(command, (error) => {
    callback(error);
  });
}

export function openCommand(program: Command): void {
  program
    .command("open <issue>")
    .alias("o")
    .description("Open a Jira issue in the browser")
    .action(async (issueKey: string) => {
      if (!isConfigured()) {
        console.log(
          chalk.red('Jira is not configured. Run "jtix config set" first.'),
        );
        return;
      }

      const key = issueKey.toUpperCase();
      const url = jiraService.getBrowseUrl(key);

      console.log(chalk.dim(`Opening ${url}...`));

      openUrl(url, (error) => {
        if (error) {
          console.log(chalk.yellow(`\nCould not open browser automatically.`));
          console.log(chalk.cyan(`\n  ${url}\n`));
          console.log(chalk.dim(`Copy the URL above to open in your browser.`));
        } else {
          console.log(chalk.green(`Opened in browser.`));
        }
      });
    });
}
