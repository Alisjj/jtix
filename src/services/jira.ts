import axios, { AxiosInstance, AxiosError } from "axios";
import { getConfig, isConfigured } from "../utils/config.js";

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description: string | null;
    status: {
      name: string;
      statusCategory?: {
        name: string;
      };
    };
    priority: {
      name: string;
    } | null;
    assignee: {
      displayName: string;
      emailAddress: string;
    } | null;
    reporter: {
      displayName: string;
      emailAddress: string;
    };
    created: string;
    updated: string;
    issuetype: {
      name: string;
    };
    project: {
      key: string;
      name: string;
    };
    labels: string[];
    comment?: {
      comments: JiraComment[];
    };
  };
}

export interface JiraComment {
  id: string;
  author: {
    displayName: string;
  };
  body: string;
  created: string;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export interface SearchResult {
  issues: JiraIssue[];
  total: number;
  maxResults: number;
  startAt: number;
}

// Helper to extract meaningful error message
export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const status = error.response?.status;
    const data = error.response?.data;

    if (status === 401) {
      return "Authentication failed. Check your email and API token.";
    }
    if (status === 403) {
      return "Access denied. Your API token may not have sufficient permissions.";
    }
    if (status === 404) {
      return "Resource not found. Check your Jira URL and issue key.";
    }
    if (status === 410) {
      return "API endpoint deprecated. Please update jtix.";
    }

    if (data?.errorMessages?.length > 0) {
      return data.errorMessages.join(", ");
    }
    if (data?.message) {
      return data.message;
    }

    return `Request failed with status ${status}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error occurred";
}

class JiraService {
  private client: AxiosInstance | null = null;
  private apiVersion: "2" | "3" = "3"; // Use v3 for Jira Cloud

  private getClient(): AxiosInstance {
    if (!isConfigured()) {
      throw new Error('Jira is not configured. Run "jtix config" first.');
    }

    if (!this.client) {
      const config = getConfig();
      const auth = Buffer.from(`${config.email}:${config.apiToken}`).toString(
        "base64",
      );

      this.client = axios.create({
        baseURL: `${config.baseUrl}/rest/api/${this.apiVersion}`,
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
    }

    return this.client;
  }

  // Reset client (useful when switching API versions)
  resetClient(): void {
    this.client = null;
  }

  setApiVersion(version: "2" | "3"): void {
    this.apiVersion = version;
    this.resetClient();
  }

  async getIssue(issueKey: string): Promise<JiraIssue> {
    const client = this.getClient();
    const response = await client.get<JiraIssue>(`/issue/${issueKey}`, {
      params: {
        fields:
          "summary,description,status,priority,assignee,reporter,created,updated,issuetype,project,labels,comment",
      },
    });
    return response.data;
  }

  async searchIssues(
    jql: string,
    maxResults = 20,
    startAt = 0,
  ): Promise<SearchResult> {
    const client = this.getClient();
    const response = await client.get<SearchResult>("/search/jql", {
      params: {
        jql,
        maxResults,
        startAt,
        fields:
          "summary,status,priority,assignee,issuetype,project,created,updated",
      },
    });
    return response.data;
  }

  async getMyIssues(maxResults = 20): Promise<SearchResult> {
    return this.searchIssues(
      "assignee = currentUser() ORDER BY updated DESC",
      maxResults,
    );
  }

  async getProjects(): Promise<JiraProject[]> {
    const client = this.getClient();
    const response = await client.get<JiraProject[]>("/project");
    return response.data;
  }

  async createIssue(
    projectKey: string,
    summary: string,
    issueType: string,
    description?: string,
  ): Promise<{ key: string }> {
    const client = this.getClient();
    const response = await client.post("/issue", {
      fields: {
        project: { key: projectKey },
        summary,
        issuetype: { name: issueType },
        ...(description && {
          description: {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: description }],
              },
            ],
          },
        }),
      },
    });
    return response.data;
  }

  async addComment(issueKey: string, comment: string): Promise<void> {
    const client = this.getClient();
    await client.post(`/issue/${issueKey}/comment`, {
      body: {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: comment }],
          },
        ],
      },
    });
  }

  async transitionIssue(issueKey: string, transitionId: string): Promise<void> {
    const client = this.getClient();
    await client.post(`/issue/${issueKey}/transitions`, {
      transition: { id: transitionId },
    });
  }

  async getTransitions(
    issueKey: string,
  ): Promise<{ id: string; name: string }[]> {
    const client = this.getClient();
    const response = await client.get(`/issue/${issueKey}/transitions`);
    return response.data.transitions;
  }

  async getIssueChangelog(
    issueKey: string,
  ): Promise<{ id: string; author: { displayName: string }; created: string; items: { field: string; fromString: string | null; toString: string | null }[] }[]> {
    const client = this.getClient();
    const response = await client.get(`/issue/${issueKey}/changelog`);
    return response.data.values || [];
  }

  async getIssueTypes(
    projectKey: string,
  ): Promise<{ id: string; name: string; subtask: boolean }[]> {
    const client = this.getClient();
    const response = await client.get(`/project/${projectKey}`);
    return response.data.issueTypes || [];
  }

  async getCreateMeta(
    projectKey: string,
  ): Promise<{ id: string; name: string }[]> {
    const client = this.getClient();
    const response = await client.get("/issue/createmeta", {
      params: {
        projectKeys: projectKey,
        expand: "projects.issuetypes",
      },
    });
    const project = response.data.projects?.[0];
    return project?.issuetypes || [];
  }

  getBaseUrl(): string {
    const config = getConfig();
    return config.baseUrl;
  }

  getBrowseUrl(issueKey: string): string {
    return `${this.getBaseUrl()}/browse/${issueKey}`;
  }

  async assignIssue(issueKey: string, accountId: string | null): Promise<void> {
    const client = this.getClient();
    await client.put(`/issue/${issueKey}/assignee`, {
      accountId,
    });
  }

  async searchUsers(query: string): Promise<{ accountId: string; displayName: string; emailAddress?: string }[]> {
    const client = this.getClient();
    const response = await client.get("/user/search", {
      params: { query, maxResults: 20 },
    });
    return response.data;
  }

  async getAssignableUsers(issueKey: string): Promise<{ accountId: string; displayName: string; emailAddress?: string }[]> {
    const client = this.getClient();
    const response = await client.get("/user/assignable/search", {
      params: { issueKey, maxResults: 50 },
    });
    return response.data;
  }

  async updateIssue(issueKey: string, fields: Record<string, unknown>): Promise<void> {
    const client = this.getClient();
    await client.put(`/issue/${issueKey}`, { fields });
  }

  async getFields(): Promise<{ id: string; name: string; custom: boolean }[]> {
    const client = this.getClient();
    const response = await client.get("/field");
    return response.data;
  }

  async getStoryPointsFieldId(): Promise<string | null> {
    const fields = await this.getFields();
    const storyPointsField = fields.find(
      (f) =>
        f.name.toLowerCase().includes("story point") ||
        f.name.toLowerCase() === "story points" ||
        f.name.toLowerCase() === "story point estimate"
    );
    return storyPointsField?.id || null;
  }

  async setStoryPoints(issueKey: string, points: number): Promise<void> {
    const fieldId = await this.getStoryPointsFieldId();
    if (!fieldId) {
      throw new Error("Story points field not found in this Jira instance");
    }
    await this.updateIssue(issueKey, { [fieldId]: points });
  }

  async getIssueStoryPoints(issueKey: string): Promise<{ fieldId: string; value: number | null } | null> {
    const fieldId = await this.getStoryPointsFieldId();
    if (!fieldId) {
      return null;
    }
    const client = this.getClient();
    const response = await client.get(`/issue/${issueKey}`, {
      params: { fields: fieldId },
    });
    return {
      fieldId,
      value: response.data.fields[fieldId] ?? null,
    };
  }

  async deleteIssue(issueKey: string, deleteSubtasks = false): Promise<void> {
    const client = this.getClient();
    await client.delete(`/issue/${issueKey}`, {
      params: { deleteSubtasks },
    });
  }

  async watchIssue(issueKey: string): Promise<void> {
    const client = this.getClient();
    const config = getConfig();
    await client.post(`/issue/${issueKey}/watchers`, JSON.stringify(config.email));
  }

  async unwatchIssue(issueKey: string): Promise<void> {
    const client = this.getClient();
    // First get current user's account ID
    const currentUser = await this.getCurrentUser();
    await client.delete(`/issue/${issueKey}/watchers`, {
      params: { accountId: currentUser.accountId },
    });
  }

  async getWatchers(issueKey: string): Promise<{ watchCount: number; watchers: { displayName: string }[] }> {
    const client = this.getClient();
    const response = await client.get(`/issue/${issueKey}/watchers`);
    return response.data;
  }

  async getCurrentUser(): Promise<{ accountId: string; displayName: string; emailAddress: string }> {
    const client = this.getClient();
    const response = await client.get("/myself");
    return response.data;
  }

  async linkIssues(inwardIssue: string, outwardIssue: string, linkType: string): Promise<void> {
    const client = this.getClient();
    await client.post("/issueLink", {
      type: { name: linkType },
      inwardIssue: { key: inwardIssue },
      outwardIssue: { key: outwardIssue },
    });
  }

  async getIssueLinkTypes(): Promise<{ id: string; name: string; inward: string; outward: string }[]> {
    const client = this.getClient();
    const response = await client.get("/issueLinkType");
    return response.data.issueLinkTypes;
  }

  async getBoards(): Promise<{ id: number; name: string; type: string }[]> {
    const client = this.getClient();
    const config = getConfig();
    const agileClient = axios.create({
      baseURL: `${config.baseUrl}/rest/agile/1.0`,
      headers: client.defaults.headers as Record<string, string>,
    });
    const response = await agileClient.get("/board", {
      params: { maxResults: 50 },
    });
    return response.data.values;
  }

  async getSprints(boardId: number, state?: string): Promise<{ id: number; name: string; state: string; startDate?: string; endDate?: string }[]> {
    const client = this.getClient();
    const config = getConfig();
    const agileClient = axios.create({
      baseURL: `${config.baseUrl}/rest/agile/1.0`,
      headers: client.defaults.headers as Record<string, string>,
    });
    const response = await agileClient.get(`/board/${boardId}/sprint`, {
      params: { state: state || "active,future", maxResults: 50 },
    });
    return response.data.values;
  }

  async getSprintIssues(sprintId: number): Promise<JiraIssue[]> {
    const client = this.getClient();
    const config = getConfig();
    const agileClient = axios.create({
      baseURL: `${config.baseUrl}/rest/agile/1.0`,
      headers: client.defaults.headers as Record<string, string>,
    });
    const response = await agileClient.get(`/sprint/${sprintId}/issue`, {
      params: {
        maxResults: 100,
        fields: "summary,status,priority,assignee,issuetype,project,created,updated",
      },
    });
    return response.data.issues;
  }

  async addWorklog(issueKey: string, timeSpent: string, comment?: string, started?: string): Promise<void> {
    const client = this.getClient();
    // Jira expects format: "2023-12-17T10:00:00.000+0000"
    const now = new Date();
    const formattedDate = started || now.toISOString().replace('Z', '+0000');
    
    const payload: Record<string, unknown> = {
      timeSpent,
      started: formattedDate,
    };
    
    if (comment) {
      payload.comment = {
        type: "doc",
        version: 1,
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: comment }],
          },
        ],
      };
    }
    
    await client.post(`/issue/${issueKey}/worklog`, payload);
  }

  async getWorklogs(issueKey: string): Promise<{ id: string; author: { displayName: string }; timeSpent: string; started: string; comment?: { content?: Array<{ content?: Array<{ text?: string }> }> } }[]> {
    const client = this.getClient();
    const response = await client.get(`/issue/${issueKey}/worklog`);
    return response.data.worklogs;
  }

  async getPriorities(): Promise<{ id: string; name: string }[]> {
    const client = this.getClient();
    const response = await client.get("/priority");
    return response.data;
  }

  async addLabels(issueKey: string, labels: string[]): Promise<void> {
    const client = this.getClient();
    await client.put(`/issue/${issueKey}`, {
      update: {
        labels: labels.map((label) => ({ add: label })),
      },
    });
  }

  async removeLabels(issueKey: string, labels: string[]): Promise<void> {
    const client = this.getClient();
    await client.put(`/issue/${issueKey}`, {
      update: {
        labels: labels.map((label) => ({ remove: label })),
      },
    });
  }

  async getAttachments(issueKey: string): Promise<{ id: string; filename: string; size: number; created: string; author: { displayName: string }; content: string }[]> {
    const client = this.getClient();
    const response = await client.get<JiraIssue>(`/issue/${issueKey}`, {
      params: { fields: "attachment" },
    });
    return (response.data.fields as unknown as { attachment: { id: string; filename: string; size: number; created: string; author: { displayName: string }; content: string }[] }).attachment || [];
  }

  async addAttachment(issueKey: string, filePath: string): Promise<void> {
    const client = this.getClient();
    const fs = await import("fs");
    const path = await import("path");
    const FormData = (await import("form-data")).default;

    const form = new FormData();
    form.append("file", fs.createReadStream(filePath), path.basename(filePath));

    await client.post(`/issue/${issueKey}/attachments`, form, {
      headers: {
        ...form.getHeaders(),
        "X-Atlassian-Token": "no-check",
      },
    });
  }

  async getStatuses(
    projectKey?: string,
  ): Promise<{ id: string; name: string; category: string }[]> {
    const client = this.getClient();

    if (projectKey) {
      // Get statuses for a specific project
      const response = await client.get(`/project/${projectKey}/statuses`);
      const statuses: { id: string; name: string; category: string }[] = [];
      const seen = new Set<string>();

      for (const issueType of response.data) {
        for (const status of issueType.statuses || []) {
          if (!seen.has(status.id)) {
            seen.add(status.id);
            statuses.push({
              id: status.id,
              name: status.name,
              category: status.statusCategory?.name || "Other",
            });
          }
        }
      }
      return statuses;
    } else {
      // Get all statuses
      const response = await client.get("/status");
      return response.data.map(
        (s: {
          id: string;
          name: string;
          statusCategory?: { name: string };
        }) => ({
          id: s.id,
          name: s.name,
          category: s.statusCategory?.name || "Other",
        }),
      );
    }
  }
}

export const jiraService = new JiraService();
