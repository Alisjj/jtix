import Conf from "conf";

export interface JiraConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
}

const config = new Conf<JiraConfig>({
  projectName: "jtix",
  schema: {
    baseUrl: {
      type: "string",
      default: "",
    },
    email: {
      type: "string",
      default: "",
    },
    apiToken: {
      type: "string",
      default: "",
    },
  },
});

export function getConfig(): JiraConfig {
  return {
    baseUrl: config.get("baseUrl").replace(/\/+$/, ""), // Remove trailing slashes
    email: config.get("email"),
    apiToken: config.get("apiToken"),
  };
}

export function setConfig(newConfig: Partial<JiraConfig>): void {
  if (newConfig.baseUrl) config.set("baseUrl", newConfig.baseUrl);
  if (newConfig.email) config.set("email", newConfig.email);
  if (newConfig.apiToken) config.set("apiToken", newConfig.apiToken);
}

export function isConfigured(): boolean {
  const cfg = getConfig();
  return !!(cfg.baseUrl && cfg.email && cfg.apiToken);
}

export function clearConfig(): void {
  config.clear();
}
