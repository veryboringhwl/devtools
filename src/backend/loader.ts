let cachedScript: string | null = null;

export async function getBackendScript(): Promise<string> {
  if (cachedScript) return cachedScript;
  const url = chrome.runtime.getURL("build/backend.js");
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load backend script: ${response.status}`);
  }
  cachedScript = await response.text();
  return cachedScript;
}
