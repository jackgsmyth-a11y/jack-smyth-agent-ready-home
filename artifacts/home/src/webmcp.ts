// Served as an external script. Never emulate the native API or report a mock as
// browser support. Tool metadata and execution come from the actual MCP handlers.
export const webmcpScript = `
(async () => {
  const state = document.getElementById('webmcp-state');
  const api = document.modelContext || navigator.modelContext;
  document.documentElement.dataset.webmcp = api ? 'registering' : 'unavailable';
  if (!api || typeof api.registerTool !== 'function') {
    if (state) state.textContent = 'Native WebMCP unavailable in this browser. Remote MCP and HTTP work independently.';
    return;
  }
  try {
    const response = await fetch('/api/tools');
    if (!response.ok) throw new Error('Tool discovery failed');
    const { tools } = await response.json();
    for (const tool of tools) {
      await api.registerTool({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: { readOnlyHint: true, consequentialHint: false, untrustedContentHint: true },
        execute: async (args, signal) => {
          // Older trial browsers pass a ModelContextClient here; current API
          // passes AbortSignal. Never give fetch a non-AbortSignal object.
          const abortSignal = signal instanceof AbortSignal ? signal
            : signal && signal.signal instanceof AbortSignal ? signal.signal : undefined;
          const result = await fetch('/api/tools/call', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: tool.name, arguments: args || {} }),
            ...(abortSignal ? { signal: abortSignal } : {}),
          });
          const data = await result.json();
          return data;
        },
      });
    }
    document.documentElement.dataset.webmcp = 'ready';
    if (state) state.textContent = tools.length + ' native WebMCP tools registered. Calls use the same source-labelled handlers as remote MCP.';
  } catch {
    document.documentElement.dataset.webmcp = 'error';
    if (state) state.textContent = 'WebMCP registration was unavailable or denied here. Use remote MCP or HTTP.';
  }
})();
`;
