import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { jiraService } from "../services/jira.js";
import { isConfigured } from "../utils/config.js";

// ADF Node types
interface AdfTextNode {
  type: "text";
  text: string;
  marks?: Array<{ type: string; attrs?: Record<string, string> }>;
}

interface AdfNode {
  type: string;
  content?: AdfNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, string> }>;
  attrs?: Record<string, unknown>;
}

interface AdfDocument {
  type: "doc";
  content: AdfNode[];
}

function formatTextWithMarks(node: AdfTextNode): string {
  let text = node.text;
  if (!node.marks) return text;

  for (const mark of node.marks) {
    switch (mark.type) {
      case "strong":
        text = chalk.bold(text);
        break;
      case "em":
        text = chalk.italic(text);
        break;
      case "code":
        text = chalk.bgGray.black(` ${text} `);
        break;
      case "link":
        text = chalk.cyan.underline(text);
        break;
      case "strike":
        text = chalk.strikethrough(text);
        break;
      case "underline":
        text = chalk.underline(text);
        break;
      case "textColor":
        // Could parse color but just highlight for now
        text = chalk.magenta(text);
        break;
    }
  }
  return text;
}

function parseAdfNode(node: AdfNode, indent = 0): string {
  const prefix = "  ".repeat(indent);

  switch (node.type) {
    case "doc":
      return (node.content || [])
        .map((n) => parseAdfNode(n, indent))
        .join("\n");

    case "paragraph":
      const paraText = (node.content || [])
        .map((n) => parseAdfNode(n, 0))
        .join("");
      return paraText ? `${prefix}${paraText}` : "";

    case "text":
      return formatTextWithMarks(node as AdfTextNode);

    case "hardBreak":
      return "\n" + prefix;

    case "heading":
      const level = (node.attrs?.level as number) || 1;
      const headingText = (node.content || [])
        .map((n) => parseAdfNode(n, 0))
        .join("");
      const headingPrefix = chalk.bold.cyan(
        "═".repeat(Math.max(1, 4 - level)) + " ",
      );
      return `\n${prefix}${headingPrefix}${chalk.bold(headingText)}`;

    case "bulletList":
      return (node.content || [])
        .map((n) => parseAdfNode(n, indent))
        .join("\n");

    case "orderedList":
      return (node.content || [])
        .map((n, i) => {
          const itemText = parseAdfNode(n, indent);
          // Replace bullet with number
          return itemText.replace(/^(\s*)•/, `$1${i + 1}.`);
        })
        .join("\n");

    case "listItem":
      const itemContent = (node.content || [])
        .map((n) => parseAdfNode(n, 0))
        .join("\n");
      return `${prefix}${chalk.cyan("•")} ${itemContent.trim()}`;

    case "codeBlock":
      const lang = (node.attrs?.language as string) || "";
      const codeContent = (node.content || [])
        .map((n) => (n.type === "text" ? n.text : ""))
        .join("");
      const codeLines = codeContent.split("\n");
      const langLabel = lang ? chalk.dim(` ${lang} `) : "";
      const codeBorder = chalk.dim("─".repeat(40));

      return [
        `\n${prefix}${codeBorder}${langLabel}`,
        ...codeLines.map(
          (line) => `${prefix}${chalk.gray("│")} ${chalk.yellow(line)}`,
        ),
        `${prefix}${codeBorder}`,
      ].join("\n");

    case "blockquote":
      const quoteContent = (node.content || [])
        .map((n) => parseAdfNode(n, 0))
        .join("\n");
      return quoteContent
        .split("\n")
        .map((line) => `${prefix}${chalk.dim("│")} ${chalk.italic(line)}`)
        .join("\n");

    case "rule":
      return `\n${prefix}${chalk.dim("─".repeat(50))}\n`;

    case "mention":
      const mentionText = (node.attrs?.text as string) || "@user";
      return chalk.cyan(mentionText);

    case "emoji":
      const shortName = (node.attrs?.shortName as string) || "";
      return shortName;

    case "inlineCard":
    case "blockCard":
      const url = (node.attrs?.url as string) || "";
      return chalk.cyan.underline(url);

    case "table":
      // Simple table rendering
      const rows = (node.content || []).map((row) => {
        const cells = (row.content || []).map((cell) => {
          return (cell.content || [])
            .map((n) => parseAdfNode(n, 0))
            .join("")
            .trim();
        });
        return cells;
      });

      if (rows.length === 0) return "";

      // Calculate column widths
      const colWidths = rows[0].map((_, colIndex) =>
        Math.min(
          30,
          Math.max(...rows.map((row) => (row[colIndex] || "").length)),
        ),
      );

      return rows
        .map((row, rowIndex) => {
          const cells = row.map((cell, i) => cell.padEnd(colWidths[i] || 10));
          const line = `${prefix}│ ${cells.join(" │ ")} │`;
          if (rowIndex === 0) {
            const separator = `${prefix}├${"─".repeat(line.length - prefix.length - 2)}┤`;
            return chalk.bold(line) + "\n" + chalk.dim(separator);
          }
          return line;
        })
        .join("\n");

    case "panel":
      const panelType = (node.attrs?.panelType as string) || "info";
      const panelContent = (node.content || [])
        .map((n) => parseAdfNode(n, 0))
        .join("\n");

      const panelIcons: Record<string, string> = {
        info: chalk.blue("ℹ"),
        note: chalk.cyan("📝"),
        warning: chalk.yellow("⚠"),
        error: chalk.red("✖"),
        success: chalk.green("✔"),
      };

      const icon = panelIcons[panelType] || panelIcons.info;
      return `\n${prefix}${icon} ${panelContent}\n`;

    case "mediaSingle":
    case "media":
      return `${prefix}${chalk.dim("[media attachment]")}`;

    default:
      // Fallback: try to extract text from content
      if (node.content) {
        return (node.content || [])
          .map((n) => parseAdfNode(n, indent))
          .join("");
      }
      return "";
  }
}

function parseDescription(description: unknown): string {
  if (!description) return chalk.dim("No description");

  if (typeof description === "string") return description;

  // Handle Atlassian Document Format (ADF)
  if (typeof description === "object" && description !== null) {
    const doc = description as AdfDocument;
    if (doc.type === "doc" && doc.content) {
      return parseAdfNode(doc);
    }
  }

  return chalk.dim("No description");
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return chalk.green("Today") + chalk.dim(` at ${date.toLocaleTimeString()}`);
  } else if (diffDays === 1) {
    return (
      chalk.yellow("Yesterday") + chalk.dim(` at ${date.toLocaleTimeString()}`)
    );
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export function viewCommand(program: Command): void {
  program
    .command("view <issue>")
    .alias("v")
    .description("View details of a Jira issue")
    .option("-c, --comments", "Show comments", false)
    .action(async (issueKey: string, options) => {
      if (!isConfigured()) {
        console.log(
          chalk.red('Jira is not configured. Run "jtix config set" first.'),
        );
        return;
      }

      const spinner = ora(`Fetching ${issueKey}...`).start();

      try {
        const issue = await jiraService.getIssue(issueKey.toUpperCase());

        spinner.stop();

        const status = issue.fields.status.name;
        const statusColor =
          status.toLowerCase().includes("done") ||
          status.toLowerCase().includes("closed")
            ? chalk.green
            : status.toLowerCase().includes("progress") ||
                status.toLowerCase().includes("dev") ||
                status.toLowerCase().includes("review")
              ? chalk.yellow
              : chalk.blue;

        const priority = issue.fields.priority?.name || "None";
        const priorityColor =
          priority.toLowerCase().includes("high") ||
          priority.toLowerCase().includes("urgent")
            ? chalk.red
            : priority.toLowerCase().includes("medium")
              ? chalk.yellow
              : chalk.dim;

        // Header
        console.log();
        console.log(chalk.dim("  ┌" + "─".repeat(60) + "┐"));
        console.log(
          `  ${chalk.bold.cyan(issue.key)} ${chalk.dim("│")} ${issue.fields.project.name}`,
        );
        console.log(chalk.dim("  ├" + "─".repeat(60) + "┤"));
        console.log(`  ${chalk.bold(issue.fields.summary)}`);
        console.log(chalk.dim("  └" + "─".repeat(60) + "┘"));

        // Metadata in a nice grid
        console.log();
        console.log(
          `  ${chalk.dim("Type")}       ${issue.fields.issuetype.name.padEnd(20)} ${chalk.dim("Status")}    ${statusColor(status)}`,
        );
        console.log(
          `  ${chalk.dim("Priority")}   ${priorityColor(priority.padEnd(20))} ${chalk.dim("Assignee")}  ${issue.fields.assignee?.displayName || chalk.dim("Unassigned")}`,
        );
        console.log(
          `  ${chalk.dim("Reporter")}   ${issue.fields.reporter.displayName.padEnd(20)} ${chalk.dim("Created")}   ${formatDate(issue.fields.created)}`,
        );
        console.log(
          `  ${chalk.dim("Updated")}    ${formatDate(issue.fields.updated)}`,
        );

        if (issue.fields.labels.length > 0) {
          const labels = issue.fields.labels
            .map((l) => chalk.bgBlue.white(` ${l} `))
            .join(" ");
          console.log(`  ${chalk.dim("Labels")}     ${labels}`);
        }

        // Description
        console.log();
        console.log(chalk.bold.underline("  Description"));
        console.log();
        const description = parseDescription(issue.fields.description);
        const descLines = description.split("\n");
        for (const line of descLines) {
          console.log(`  ${line}`);
        }

        // Comments
        if (options.comments && issue.fields.comment?.comments) {
          console.log();
          console.log(
            chalk.bold.underline(
              `  Comments (${issue.fields.comment.comments.length})`,
            ),
          );

          if (issue.fields.comment.comments.length === 0) {
            console.log(chalk.dim("\n  No comments"));
          } else {
            for (const comment of issue.fields.comment.comments) {
              console.log();
              console.log(
                `  ${chalk.cyan.bold(comment.author.displayName)} ${chalk.dim("•")} ${chalk.dim(formatDate(comment.created))}`,
              );
              console.log(chalk.dim("  " + "─".repeat(40)));
              const commentText = parseDescription(comment.body);
              for (const line of commentText.split("\n")) {
                console.log(`    ${line}`);
              }
            }
          }
        }

        // Footer with link
        console.log();
        console.log(chalk.dim(`  🔗 ${jiraService.getBrowseUrl(issue.key)}`));
        console.log();
      } catch (error: unknown) {
        spinner.fail(chalk.red(`Failed to fetch ${issueKey}`));
        if (error instanceof Error) {
          console.error(chalk.red(`Error: ${error.message}`));
        }
      }
    });
}
