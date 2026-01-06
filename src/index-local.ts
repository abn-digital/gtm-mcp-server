#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { OAuth2Client } from "google-auth-library";
import { tools } from "./tools/index";
import { getPackageVersion } from "./utils/getPackageVersion";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
dotenv.config();

// Token storage path
const TOKEN_PATH = path.join(process.env.HOME || process.env.USERPROFILE || "", ".gtm-mcp-tokens.json");

interface TokenData {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

class LocalGoogleTagManagerMCPServer {
  private server: McpServer;
  private oauth2Client: OAuth2Client | null = null;

  constructor() {
    this.server = new McpServer({
      name: "google-tag-manager-mcp-server",
      version: getPackageVersion(),
    });

    this.setupErrorHandling();
  }

  private setupErrorHandling() {
    process.on("SIGINT", () => {
      process.exit(0);
    });
  }

  private async initializeOAuth() {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/oauth2callback";

    if (!clientId || !clientSecret) {
      throw new Error(
        "Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET environment variables. " +
        "Please set them in your .env file."
      );
    }

    this.oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

    // Try to load existing tokens
    if (fs.existsSync(TOKEN_PATH)) {
      const tokens: TokenData = JSON.parse(fs.readFileSync(TOKEN_PATH, "utf-8"));
      this.oauth2Client.setCredentials(tokens);

      // Check if token needs refresh
      if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
        console.error("Access token expired. Refreshing...");
        try {
          const { credentials } = await this.oauth2Client.refreshAccessToken();
          this.oauth2Client.setCredentials(credentials);
          fs.writeFileSync(TOKEN_PATH, JSON.stringify(credentials));
          console.error("Token refreshed successfully");
        } catch (error) {
          console.error("Failed to refresh token:", error);
          throw new Error("Please re-authenticate. Delete " + TOKEN_PATH + " and run the authentication flow again.");
        }
      }
    } else {
      throw new Error(
        "No authentication tokens found. Please run the authentication flow first.\n" +
        "Run: npm run auth"
      );
    }
  }

  private getAccessToken(): string {
    if (!this.oauth2Client?.credentials?.access_token) {
      throw new Error("No access token available");
    }
    return this.oauth2Client.credentials.access_token;
  }

  async init() {
    await this.initializeOAuth();

    // Create mock env and props for tools
    const mockEnv: any = {
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    };

    const mockProps = {
      userId: "local-user",
      name: "Local User",
      email: process.env.GOOGLE_USER_EMAIL || "user@example.com",
      accessToken: this.getAccessToken(),
      clientId: process.env.GOOGLE_CLIENT_ID || "",
    };

    // Register all tools
    tools.forEach((register) => {
      try {
        register(this.server, {
          props: mockProps,
          env: mockEnv,
        });
      } catch (error) {
        console.error("Error registering tool:", error);
      }
    });

    console.error("Google Tag Manager MCP Server initialized successfully");
    console.error("Available tools registered:", tools.length);
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Server running on stdio");
  }
}

// Main execution
async function main() {
  try {
    const server = new LocalGoogleTagManagerMCPServer();
    await server.init();
    await server.run();
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

main();
