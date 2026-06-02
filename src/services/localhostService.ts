import { LocalhostItem } from "../types/LocalhostItem";
import { findNodeProcesses, getProcessCommand, getWorkingDirectory } from "../utils/processUtils";
import { detectFramework, getProjectPath } from "../utils/projectUtils";

async function getProcessDetails(pid: string, cmdResult: string) {
  try {
    // Get project information
    const workingDir = await getWorkingDirectory(pid);
    const projectPath = workingDir || getProjectPath(cmdResult);
    const framework = detectFramework(cmdResult);

    return {
      workingDir,
      projectPath,
      framework,
    };
  } catch {
    return undefined;
  }
}

export async function getLocalhostItems(): Promise<LocalhostItem[]> {
  const output = await findNodeProcesses();
  const lines = output.split("\n").filter(Boolean);
  const items: LocalhostItem[] = [];

  for (const line of lines) {
    const [pid, port] = line.split(":");
    if (!pid || !port) continue;

    // Get the command for this process
    const cmdResult = await getProcessCommand(pid);

    // Skip non-Node.js processes
    if (!cmdResult.includes("node")) continue;

    const details = await getProcessDetails(pid, cmdResult);

    if (!details) continue;

    const { projectPath, framework } = details;
    const url = `http://localhost:${port}`;

    items.push({
      id: pid,
      projectPath,
      framework,
      port,
      pid,
      url,
    });
  }

  return filterWorkerPorts(items);
}

// Dev servers (Nuxt, Vite, Webpack, ...) spawn helper processes that listen on a
// random high port in the IANA ephemeral range. Those share the project directory
// with the real server but should not show up as a separate entry. When a project
// already has a "real" (non-ephemeral) port, drop its ephemeral ports so the actual
// dev URL (e.g. localhost:3000) is the one that gets picked up.
const EPHEMERAL_PORT_START = 49152;

function filterWorkerPorts(items: LocalhostItem[]): LocalhostItem[] {
  const hasRealPort = new Set<string>();
  for (const item of items) {
    if (item.projectPath && parseInt(item.port, 10) < EPHEMERAL_PORT_START) {
      hasRealPort.add(item.projectPath);
    }
  }

  return items.filter((item) => {
    const isEphemeral = parseInt(item.port, 10) >= EPHEMERAL_PORT_START;
    return !(isEphemeral && item.projectPath && hasRealPort.has(item.projectPath));
  });
}
