# jtix

A powerful CLI tool for managing Jira tickets from your terminal.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green.svg)
![License](https://img.shields.io/badge/license-ISC-yellow.svg)

## Features

- List and filter Jira issues
- View detailed issue information with formatted descriptions
- Create, edit, and delete issues
- Add comments to issues
- View comment threads
- Transition issues between statuses with history tracking
- Assign/unassign issues
- Set story points/estimates
- Manage labels and priority
- Watch/unwatch issues
- Link issues together
- Log work time
- Manage attachments
- Search with JQL and saved queries
- View sprints and boards
- Open issues in browser
- List projects and statuses
- Beautiful terminal formatting with colors and Unicode

## Installation

### From Source

```bash
# Clone the repository
git clone https://github.com/alisjj/jtix.git
cd jtix

# Install dependencies
npm install

# Build the project
npm run build

# Link globally
npm link
```

### Requirements

- Node.js >= 18.0.0
- npm >= 8.0.0
- A Jira Cloud account with API access

## Quick Start

### 1. Configure your Jira credentials

```bash
jtix config set
```

You'll be prompted for:

- **Jira Base URL**: Your Jira instance URL (e.g., `https://yourcompany.atlassian.net`)
- **Email**: Your Jira account email
- **API Token**: Generate one at [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)

### 2. List your issues

```bash
jtix list
```

### 3. View an issue

```bash
jtix view PROJ-123
```

## Commands

### Configuration

#### `jtix config set`

Configure Jira credentials interactively.

```bash
jtix config set
```

#### `jtix config show`

Display current configuration (API token is masked).

```bash
jtix config show
```

#### `jtix config clear`

Remove all stored configuration.

```bash
jtix config clear
```

---

### Listing Issues

#### `jtix list` (alias: `ls`)

List Jira issues with various filters.

```bash
# List issues assigned to you (default)
jtix list

# List issues you reported
jtix list -r
jtix list --reporter

# List issues you're watching
jtix list -w
jtix list --watching

# Filter by project
jtix list -p PROJ
jtix list --project PROJ

# Filter by status
jtix list -s "In Progress"
jtix list --status "In Progress"

# Combine filters
jtix list -p PROJ -s "In Dev"

# List all issues in a project (not just yours)
jtix list --all -p PROJ

# Limit results
jtix list -n 10
jtix list --limit 100

# Custom JQL query
jtix list -q "project = PROJ AND priority = High"
jtix list --query "assignee = currentUser() AND status != Done"
```

**Options:**
| Option | Alias | Description |
|--------|-------|-------------|
| `--mine` | `-m` | Show issues assigned to you (default) |
| `--reporter` | `-r` | Show issues you reported |
| `--watching` | `-w` | Show issues you're watching |
| `--all` | `-a` | Show all issues (requires `-p`) |
| `--project <key>` | `-p` | Filter by project key |
| `--status <status>` | `-s` | Filter by status |
| `--query <jql>` | `-q` | Custom JQL query |
| `--limit <number>` | `-n` | Max results (default: 50) |

---

### Viewing Issues

#### `jtix view <issue>` (alias: `v`)

View detailed information about an issue.

```bash
# View issue details
jtix view PROJ-123
jtix v PROJ-123

# View issue with comments
jtix view PROJ-123 -c
jtix view PROJ-123 --comments
```

**Output includes:**

- Issue key and project
- Summary/title
- Type, status, priority
- Assignee and reporter
- Created and updated dates
- Labels
- Full description with formatting:
  - Code blocks with syntax highlighting
  - Headings
  - Lists (bulleted and numbered)
  - Links
  - Bold, italic, and inline code
  - Blockquotes
  - Tables
- Comments (with `-c` flag)
- Direct link to Jira

---

### Comments

#### `jtix comments <issue>` (alias: `cms`)

View comments on an issue.

```bash
# View comments
jtix comments PROJ-123
jtix cms PROJ-123

# Limit number of comments shown
jtix comments PROJ-123 -n 5
```

#### `jtix comment <issue>` (alias: `cm`)

Add a comment to an issue.

```bash
# Add comment with inline message
jtix comment PROJ-123 -m "This is my comment"
jtix cm PROJ-123 -m "Fixed in latest commit"

# Add comment interactively (opens editor)
jtix comment PROJ-123
```

---

### Creating Issues

#### `jtix create` (alias: `c`)

Create a new Jira issue.

```bash
# Interactive mode (prompts for all fields)
jtix create

# With options
jtix create -p PROJ -t Task -s "Issue summary"
jtix create --project PROJ --type Bug --summary "Bug title" --description "Details"
```

**Options:**
| Option | Alias | Description |
|--------|-------|-------------|
| `--project <key>` | `-p` | Project key |
| `--type <type>` | `-t` | Issue type (Task, Bug, Story, Epic) |
| `--summary <text>` | `-s` | Issue summary/title |
| `--description <text>` | `-d` | Issue description |

---

### Transitioning Issues

#### `jtix transition <issue>` (alias: `tr`)

Change the status of an issue.

```bash
# Auto-transition to next status
jtix tr PROJ-123

# List available transitions
jtix tr PROJ-123 -l
jtix tr PROJ-123 --list

# Pick from available transitions interactively
jtix tr PROJ-123 -p
jtix tr PROJ-123 --pick

# Transition to specific status
jtix tr PROJ-123 -s "In Progress"
jtix tr PROJ-123 --status "Done"
```

**Options:**
| Option | Alias | Description |
|--------|-------|-------------|
| `--list` | `-l` | List available transitions only |
| `--pick` | `-p` | Interactive picker |
| `--status <name>` | `-s` | Transition to specific status |

---

### Opening in Browser

#### `jtix open <issue>` (alias: `o`)

Open an issue in your default browser.

```bash
jtix open PROJ-123
jtix o PROJ-123
```

---

### Projects & Statuses

#### `jtix status <issue>` (alias: `s`)

Quickly check the status of an issue.

```bash
jtix status PROJ-123
jtix s PROJ-123
```

**Output:**

```
  PROJ-123 • Issue summary here

  Status:   In Progress
  Category: In Progress
```

Status colors:

- **Green** - Done/Closed/Resolved
- **Yellow** - In Progress/Dev/Review
- **Red** - Blocked/On Hold
- **Blue** - Other statuses

#### `jtix projects` (alias: `pr`)

List all available Jira projects.

```bash
jtix projects
jtix pr
```

#### `jtix statuses` (alias: `st`)

List available statuses.

```bash
# All statuses
jtix statuses

# Statuses for a specific project
jtix statuses -p PROJ
jtix statuses --project PROJ
```

---

## Command Reference

| Command              | Alias | Description                |
| -------------------- | ----- | -------------------------- |
| `config set`         |       | Configure Jira credentials |
| `config show`        |       | Show current configuration |
| `config clear`       |       | Clear configuration        |
| `list`               | `ls`  | List issues                |
| `view <issue>`       | `v`   | View issue details         |
| `status <issue>`     | `s`   | Quick status check         |
| `create`             | `c`   | Create new issue           |
| `edit <issue>`       |       | Edit issue summary/description |
| `delete <issue>`     | `rm`  | Delete an issue            |
| `comment <issue>`    | `cm`  | Add a comment              |
| `comments <issue>`   | `cms` | View comments              |
| `transition <issue>` | `tr`  | Change issue status        |
| `assign <issue>`     |       | Assign/unassign issue      |
| `estimate <issue>`   | `est` | Set story points           |
| `priority <issue>`   | `prio`| Change priority            |
| `labels <issue>`     |       | Add/remove labels          |
| `watch <issue>`      |       | Watch/unwatch issue        |
| `link <issue> <target>` |    | Link two issues            |
| `worklog <issue>`    | `log` | Log time on issue          |
| `attachments <issue>`| `attach` | Manage attachments      |
| `search [jql]`       | `jql` | Search with JQL            |
| `open <issue>`       | `o`   | Open in browser            |
| `projects`           | `pr`  | List projects              |
| `boards`             |       | List Jira boards           |
| `sprint`             |       | View sprints               |
| `statuses`           | `st`  | List statuses              |

---

## Examples

### Daily Workflow

```bash
# Start your day - see what's assigned to you
jtix list

# Quick status check on a ticket
jtix s TR-123

# Check a specific ticket in detail
jtix view TR-123

# Start working on it - move to "In Dev"
jtix tr TR-123 -s "In Dev"

# Add a comment about your progress
jtix cm TR-123 -m "Started implementation"

# When done, move to code review
jtix tr TR-123 -s "Code Review"
```

### Finding Issues

```bash
# All my open issues
jtix list -q "assignee = currentUser() AND status != Done"

# High priority bugs in my project
jtix list -p PROJ -q "priority = High AND type = Bug"

# Recently updated issues I'm watching
jtix list -w

# Issues I reported that are still open
jtix list -r -q "status != Done"
```

### Quick Actions

```bash
# Create a bug quickly
jtix create -p PROJ -t Bug -s "Button not working on mobile"

# Move issue to next stage
jtix tr PROJ-123

# Open in browser to see attachments
jtix o PROJ-123
```

---

## Configuration

Configuration is stored securely using the [conf](https://github.com/sindresorhus/conf) library.

**Location:**

- Linux: `~/.config/jtix-nodejs/config.json`
- macOS: `~/Library/Preferences/jtix-nodejs/config.json`
- Windows: `%APPDATA%\jtix-nodejs\config.json`

**Stored values:**

- `baseUrl`: Your Jira instance URL
- `email`: Your Jira account email
- `apiToken`: Your Jira API token

---

## API Token

To generate a Jira API token:

1. Go to [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click "Create API token"
3. Give it a name (e.g., "jtix CLI")
4. Copy the token and use it when running `jtix config set`

**Note:** API tokens are tied to your Atlassian account. Keep them secure and never commit them to version control.

---

## Troubleshooting

### "Jira is not configured"

Run `jtix config set` to configure your credentials.

### "Authentication failed"

- Verify your email is correct
- Generate a new API token and try again
- Ensure your Jira account has access to the projects

### "API endpoint deprecated"

Update jtix to the latest version. Atlassian occasionally updates their API.

### "Unbounded JQL queries not allowed"

When using `--all`, you must specify a project with `-p PROJECT`.

### Browser won't open

If `jtix open` doesn't work, copy the displayed URL manually. This can happen in:

- WSL without browser integration
- Remote SSH sessions
- Headless environments

---

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev -- list

# Build
npm run build

# Run built version
npm start -- list
```

### Project Structure

```
jtix/
├── src/
│   ├── commands/        # CLI commands
│   │   ├── config.ts
│   │   ├── list.ts
│   │   ├── view.ts
│   │   ├── create.ts
│   │   ├── comment.ts
│   │   ├── comments.ts
│   │   ├── transition.ts
│   │   ├── open.ts
│   │   ├── projects.ts
│   │   ├── statuses.ts
│   │   └── status.ts
│   ├── services/
│   │   └── jira.ts      # Jira API client
│   ├── utils/
│   │   └── config.ts    # Configuration management
│   └── index.ts         # CLI entry point
├── dist/                # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

---

## License

ISC

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## Acknowledgments

- Built with [Commander.js](https://github.com/tj/commander.js/)
- Colors by [Chalk](https://github.com/chalk/chalk)
- Prompts by [Inquirer.js](https://github.com/SBoudrias/Inquirer.js)
- Configuration by [conf](https://github.com/sindresorhus/conf)
- Spinners by [ora](https://github.com/sindresorhus/ora)
