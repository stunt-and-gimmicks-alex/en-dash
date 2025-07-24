// src/config/index.ts - Client-side configuration
interface AppConfig {
    dockgeUrl: string;
    isDevelopment: boolean;
    isProduction: boolean;
}

const getConfig = (): AppConfig => {
    // Check if we're in the browser
    const isBrowser = typeof window !== "undefined";

    // Get the base URL for Dockge
    let dockgeUrl = "http://localhost:5001"; // Default

    if (isBrowser) {
        // Try different methods to get the URL
        const hostname = window.location.hostname;
        const protocol = window.location.protocol;

        // Method 1: Check for manually set window variable (for custom setups)
        if ((window as any).DOCKGE_URL) {
            dockgeUrl = (window as any).DOCKGE_URL;
        }
        // Method 2: Auto-detect based on current hostname
        else if (hostname !== "localhost" && hostname !== "127.0.0.1") {
            dockgeUrl = `${protocol}//${hostname}:5001`;
        }
        // Method 3: Check if we're on a known port (like Vite dev server)
        else if (
            window.location.port === "5173" ||
            window.location.port === "3000"
        ) {
            dockgeUrl = "http://localhost:5001";
        }
    }

    return {
        dockgeUrl,
        isDevelopment: !isBrowser || window.location.hostname === "localhost",
        isProduction: isBrowser && window.location.hostname !== "localhost",
    };
};

export const config = getConfig();

// Console log for debugging
if (typeof window !== "undefined") {
    console.log("Dockge Configuration:", {
        url: config.dockgeUrl,
        hostname: window.location.hostname,
        port: window.location.port,
        isDev: config.isDevelopment,
    });
}
