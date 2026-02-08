import { writeFileSync } from "fs";
import { join } from "path";

/**
 * Write the active port to a file that can be read by other apps
 */
export function writePortInfo(port: number): void {
  const portInfo = {
    port,
    url: `http://localhost:${port}`,
    timestamp: new Date().toISOString(),
  };

  const portFilePath = join(process.cwd(), "../../.api-port.json");

  try {
    writeFileSync(portFilePath, JSON.stringify(portInfo, null, 2));
    console.log(`📝 Port info written to ${portFilePath}`);
  } catch (error) {
    console.error("Failed to write port info:", error);
  }
}
