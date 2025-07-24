// src/pages/api/docker/[...path].ts - Next.js API route to proxy Docker API calls
import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import http from "http";

const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Docker socket path (adjust based on your setup)
const DOCKER_SOCKET = process.env.DOCKER_SOCKET || "/var/run/docker.sock";
const STACKS_DIR = process.env.DOCKGE_STACKS_DIR || "/opt/stacks";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { path: apiPath } = req.query;

    if (!Array.isArray(apiPath)) {
        return res.status(400).json({ error: "Invalid path" });
    }

    const endpoint = apiPath.join("/");

    try {
        // Handle different API endpoints
        switch (endpoint) {
            case "containers/json":
                return await handleContainers(req, res);
            case "images/json":
                return await handleImages(req, res);
            case "volumes":
                return await handleVolumes(req, res);
            case "networks":
                return await handleNetworks(req, res);
            case "stacks":
                return await handleStacks(req, res);
            case "info":
                return await handleSystemInfo(req, res);
            default:
                // Handle dynamic routes like containers/:id/start
                return await handleDynamicRoutes(req, res, endpoint);
        }
    } catch (error: unknown) {
        console.error("Docker API error:", error);
        const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({
            error: "Internal server error",
            message: errorMessage,
        });
    }
}

async function makeDockerRequest(
    path: string,
    method: string = "GET",
    body?: string
): Promise<any> {
    return new Promise((resolve, reject) => {
        const options = {
            socketPath: DOCKER_SOCKET,
            path: `/v1.43${path}`, // Docker API version
            method,
            headers: {
                "Content-Type": "application/json",
            },
        };

        const req = http.request(options, (res) => {
            let data = "";

            res.on("data", (chunk) => {
                data += chunk;
            });

            res.on("end", () => {
                try {
                    const result = data ? JSON.parse(data) : null;
                    if (res.statusCode && res.statusCode >= 400) {
                        reject(
                            new Error(
                                `Docker API error: ${res.statusCode} ${
                                    result?.message || data
                                }`
                            )
                        );
                    } else {
                        resolve(result);
                    }
                } catch (parseError: unknown) {
                    const errorMsg =
                        parseError instanceof Error
                            ? parseError.message
                            : "Parse error";
                    reject(
                        new Error(
                            `Failed to parse Docker API response: ${errorMsg}`
                        )
                    );
                }
            });
        });

        req.on("error", (error: Error) => {
            reject(new Error(`Docker socket error: ${error.message}`));
        });

        if (body) {
            req.write(body);
        }

        req.end();
    });
}

async function handleContainers(req: NextApiRequest, res: NextApiResponse) {
    const { all } = req.query;
    const allParam = all === "true" ? "?all=true" : "";

    const containers = await makeDockerRequest(`/containers/json${allParam}`);
    res.json(containers);
}

async function handleImages(req: NextApiRequest, res: NextApiResponse) {
    const images = await makeDockerRequest("/images/json");
    res.json(images);
}

async function handleVolumes(req: NextApiRequest, res: NextApiResponse) {
    const volumes = await makeDockerRequest("/volumes");
    res.json(volumes.Volumes || []);
}

async function handleNetworks(req: NextApiRequest, res: NextApiResponse) {
    const networks = await makeDockerRequest("/networks");
    res.json(networks);
}

async function handleSystemInfo(req: NextApiRequest, res: NextApiResponse) {
    const info = await makeDockerRequest("/info");
    res.json(info);
}

async function handleStacks(req: NextApiRequest, res: NextApiResponse) {
    try {
        // Check if stacks directory exists
        if (!fs.existsSync(STACKS_DIR)) {
            return res.json([]);
        }

        const stackDirs = await readdir(STACKS_DIR);
        const stacks = [];

        for (const stackName of stackDirs) {
            const stackPath = path.join(STACKS_DIR, stackName);
            const stackStat = await stat(stackPath);

            if (stackStat.isDirectory()) {
                const composePath = path.join(stackPath, "compose.yaml");
                const composeAltPath = path.join(
                    stackPath,
                    "docker-compose.yml"
                );

                let composeFile = null;

                // Try to read compose file
                try {
                    if (fs.existsSync(composePath)) {
                        composeFile = await readFile(composePath, "utf8");
                    } else if (fs.existsSync(composeAltPath)) {
                        composeFile = await readFile(composeAltPath, "utf8");
                    }
                } catch (error: unknown) {
                    const errorMsg =
                        error instanceof Error
                            ? error.message
                            : "Unknown error";
                    console.warn(
                        `Could not read compose file for stack ${stackName}:`,
                        errorMsg
                    );
                }

                stacks.push({
                    name: stackName,
                    path: stackPath,
                    composeFile,
                    lastUpdated: stackStat.mtime.toISOString(),
                });
            }
        }

        res.json(stacks);
    } catch (error: unknown) {
        const errorMsg =
            error instanceof Error ? error.message : "Unknown error";
        console.error("Error reading stacks directory:", errorMsg);
        res.json([]);
    }
}

async function handleDynamicRoutes(
    req: NextApiRequest,
    res: NextApiResponse,
    endpoint: string
) {
    const parts = endpoint.split("/");

    // Handle container operations: containers/:id/start, containers/:id/stop, etc.
    if (parts[0] === "containers" && parts.length === 3) {
        const [, containerId, action] = parts;

        switch (action) {
            case "start":
                await makeDockerRequest(
                    `/containers/${containerId}/start`,
                    "POST"
                );
                res.json({
                    success: true,
                    message: `Container ${containerId} started`,
                });
                break;
            case "stop":
                await makeDockerRequest(
                    `/containers/${containerId}/stop`,
                    "POST"
                );
                res.json({
                    success: true,
                    message: `Container ${containerId} stopped`,
                });
                break;
            case "restart":
                await makeDockerRequest(
                    `/containers/${containerId}/restart`,
                    "POST"
                );
                res.json({
                    success: true,
                    message: `Container ${containerId} restarted`,
                });
                break;
            default:
                res.status(404).json({ error: "Action not found" });
        }
        return;
    }

    // Handle stack operations: stacks/:name/start, stacks/:name/stop, etc.
    if (parts[0] === "stacks" && parts.length === 3) {
        const [, stackName, action] = parts;

        switch (action) {
            case "start":
                await executeComposeCommand(stackName, "up -d");
                res.json({
                    success: true,
                    message: `Stack ${stackName} started`,
                });
                break;
            case "stop":
                await executeComposeCommand(stackName, "down");
                res.json({
                    success: true,
                    message: `Stack ${stackName} stopped`,
                });
                break;
            case "restart":
                await executeComposeCommand(stackName, "restart");
                res.json({
                    success: true,
                    message: `Stack ${stackName} restarted`,
                });
                break;
            case "pull":
                await executeComposeCommand(stackName, "pull");
                res.json({
                    success: true,
                    message: `Stack ${stackName} images pulled`,
                });
                break;
            default:
                res.status(404).json({ error: "Action not found" });
        }
        return;
    }

    res.status(404).json({ error: "Endpoint not found" });
}

async function executeComposeCommand(
    stackName: string,
    command: string
): Promise<void> {
    const { exec } = require("child_process");
    const { promisify } = require("util");
    const execAsync = promisify(exec);

    const stackPath = path.join(STACKS_DIR, stackName);

    // Check if stack directory exists
    if (!fs.existsSync(stackPath)) {
        throw new Error(`Stack ${stackName} not found`);
    }

    // Find compose file
    const composePath = path.join(stackPath, "compose.yaml");
    const composeAltPath = path.join(stackPath, "docker-compose.yml");

    let composeFile = "compose.yaml";
    if (fs.existsSync(composeAltPath) && !fs.existsSync(composePath)) {
        composeFile = "docker-compose.yml";
    }

    const fullCommand = `cd "${stackPath}" && docker compose -f ${composeFile} ${command}`;

    try {
        const { stdout, stderr } = await execAsync(fullCommand);
        if (stderr && !stderr.includes("WARN")) {
            console.warn(`Compose command warning for ${stackName}:`, stderr);
        }
        console.log(`Compose command output for ${stackName}:`, stdout);
    } catch (error: unknown) {
        const errorMsg =
            error instanceof Error ? error.message : "Unknown error";
        console.error(`Compose command failed for ${stackName}:`, errorMsg);
        throw new Error(
            `Failed to execute docker compose ${command}: ${errorMsg}`
        );
    }
}

// Export configuration for Next.js
export const config = {
    api: {
        bodyParser: {
            sizeLimit: "1mb",
        },
        responseLimit: false,
    },
};
