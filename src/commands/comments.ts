import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { jiraService, getErrorMessage } from "../services/jira.js";
import { isConfigured } from "../utils/config.js";

// ADF Node types for parsing comment bodies
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

    case "mention":
      const mentionText = (node.attrs?.text as string) || "@user";
      return chalk.cyan.bold(mentionText);

    case "emoji":
      const shortName = (node.attrs?.shortName as string) || "";
      return shortName;

    case "inlineCard":
    case "blockCard":
      const url = (node.attrs?.url as string) || "";
      return chalk.cyan.underline(url);

    case "codeBlock":
      const lang = (node.attrs?.language as string) || "";
      const codeContent = (node.content || [])
        .map((n) => (n.type === "text" ? n.text : ""))
        .join("");
      const codeLines = codeContent.split("\n");
      const langLabel = lang ? chalk.black.bgYellow(` ${lang} `) : "";

      return [
        `\n${prefix}${chalk.dim("┌──")}${langLabel}${chalk.dim("─".repeat(Math.max(0, 35 - lang.length)))}`,
        ...codeLines.map(
          (line) => `${prefix}${chalk.dim("│")} ${chalk.yellow(line)}`,
        ),
        `${prefix}${chalk.dim("└" + "─".repeat(38))}`,
      ].join("\n");

    case "bulletList":
      return (node.content || [])
        .map((n) => parseAdfNode(n, indent))
        .join("\n");

    case "listItem":
      const itemContent = (node.content || [])
        .map((n) => parseAdfNode(n, 0))
        .join("\n");
      return `${prefix}${chalk.cyan("•")} ${itemContent.trim()}`;

    case "mediaSingle":
    case "media":
      return `${prefix}${chalk.dim("📎 [attachment]")}`;

    default:
      if (node.content) {
        return (node.content || [])
          .map((n) => parseAdfNode(n, indent))
          .join("");
      }
      return "";
  }
}

function parseBody(body: unknown): string {
  if (!body) return chalk.dim("(empty)");

  if (typeof body === "string") return body;

  if (typeof body === "object" && body !== null) {
    const doc = body as { type?: string; content?: AdfNode[] };
    if (doc.type === "doc" && doc.content) {
      return parseAdfNode(doc as AdfNode);
    }
  }

  return chalk.dim("(empty)");
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return chalk.green("just now");
  } else if (diffMins < 60) {
    return chalk.green(`${diffMins}m ago`);
  } else if (diffHours < 24) {
    return chalk.yellow(`${diffHours}h ago`);
  } else if (diffDays === 1) {
    return "yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export function commentsCommand(program: Command): void {
  program
    .command("comments <issue>")
    .alias("cms")
    .description("View comments on a Jira issue")
    .option("-n, --limit <number>", "Number of comments to show", "10")
    .action(async (issueKey: string, options) => {
      if (!isConfigured()) {
        console.log(
          chalk.red('Jira is not configured. Run "jtix config set" first.'),
        );
        return;
      }

      const key = issueKey.toUpperCase();
      const spinner = ora(`Fetching comments for ${key}...`).start();

      try {
        const issue = await jiraService.getIssue(key);

        spinner.stop();

        const comments = issue.fields.comment?.comments || [];

        console.log();
        console.log(
          chalk.bold(`  ${chalk.cyan(key)} `) +
            chalk.dim("│ ") +
            chalk.bold(
              `${comments.length} comment${comments.length !== 1 ? "s" : ""}`,
            ),
        );
        console.log(chalk.dim("  " + "─".repeat(50)));

        if (comments.length === 0) {
          console.log(chalk.dim("\n  No comments yet.\n"));
          console.log(
            chalk.dim(`  Add one: jtix comment ${key} -m "Your comment"\n`),
          );
          return;
        }

        // Show latest comments (limited)
        const limit = parseInt(options.limit);
        const displayComments = comments.slice(-limit);

        if (comments.length > limit) {
          console.log(
            chalk.dim(
              `\n  ... ${comments.length - limit} earlier comments hidden\n`,
            ),
          );
        }

        for (const comment of displayComments) {
          console.log();

          // Author and time
          console.log(
            `  ${chalk.cyan.bold(comment.author.displayName)} ` +
              chalk.dim("• ") +
              chalk.dim(formatDate(comment.created)),
          );

          // Comment body
          const body = parseBody(comment.body);
          const lines = body.split("\n");
          for (const line of lines) {
            console.log(`  ${line}`);
          }
        }

        console.log();
        console.log(chalk.dim("  " + "─".repeat(50)));
        console.log(
          chalk.dim(`  Add comment: jtix comment ${key} -m "message"`),
        );
        console.log();
      } catch (error: unknown) {
        spinner.fail(chalk.red(`Failed to fetch comments for ${key}`));
        console.error(chalk.red(`Error: ${getErrorMessage(error)}`));
      }
    });
}
