// Documentation: https://docs.anythingllm.com/agent/custom/introduction

/**
 * @typedef {Object} AnythingLLM
 * @property {{[key: string]: any}} runtimeArgs - Contains runtime arguments passed to the agent skill @link {https://docs.anythingllm.com/agent/custom/handler-js#available-runtime-properties-and-methods}
 * @property {('docker'|'desktop')} runtime - The runtime environment.
 * @property {import('./plugin.json')} config - your plugin's config
 * @property {function(string|Error): void} logger - Logging function
 * @property {function(string): void} introspect - Print a string to the UI while agent skill is running
 * @property {{getLinkContent: function(url): Promise<{success: boolean, content: string}>}} webScraper - Scrape a website easily to bypass user-agent restrictions.
 */

/** @type {AnythingLLM} */
module.exports.runtime = {
  /**
   * @param {import('./plugin.json')['entrypoint']['params']} args - Arguments passed to the agent skill - defined in plugin.json
   */
  handler: async function (args = {}) {
    const callerId = `${this.config.name}-v${this.config.version}`;
    this.introspect(`Calling ${callerId}...`);
    this.logger(`Calling ${callerId}...`);

    try {
      if (!this.runtimeArgs.homeAssistantUrl) throw new Error(`Missing required parameters: ${JSON.stringify(this.runtimeArgs)}`);

      const { domain, action, entity_id } = args;
      if (!domain || !action || !entity_id) throw new Error(`Missing required parameters: ${JSON.stringify(args)}`);
      const endpoint = new URL(`${this.runtimeArgs.homeAssistantUrl}/api/services/${domain}/${action}`);

      this.introspect(`Calling ${endpoint.toString()}...`);
      this.logger(`Calling ${endpoint.toString()}...`);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          ...(this.runtimeArgs.homeAssistantApiKey && { Authorization: `Bearer ${this.runtimeArgs.homeAssistantApiKey}` }),
        },
        body: JSON.stringify({ entity_id }),
      });

      return response.ok ? "Agent skill executed successfully." : `Failed to execute agent skill. Error ${response.statusText}`;
    } catch (e) {
      this.logger(e)
      this.introspect(
        `${callerId} failed to execute. Reason: ${e.message}`
      );
      return `Failed to execute agent skill. Error ${e.message}`;
    }
  }
};