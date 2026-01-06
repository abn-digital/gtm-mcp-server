#!/usr/bin/env node

import { OAuth2Client } from "google-auth-library";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKEN_PATH = path.join(process.env.HOME || process.env.USERPROFILE || "", ".gtm-mcp-tokens.json");
const PORT = 3000;

// Google Tag Manager OAuth scopes
const SCOPES = [
  "https://www.googleapis.com/auth/tagmanager.edit.containers",
  "https://www.googleapis.com/auth/tagmanager.readonly",
  "https://www.googleapis.com/auth/tagmanager.edit.containerversions"
];

async function authenticate() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `http://localhost:${PORT}/oauth2callback`;

  if (!clientId || !clientSecret) {
    console.error("Error: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
    console.error("Please create a .env file with these variables.");
    console.error("\nTo get these credentials:");
    console.error("1. Go to https://console.cloud.google.com/");
    console.error("2. Create or select a project");
    console.error("3. Enable Google Tag Manager API");
    console.error("4. Create OAuth 2.0 credentials (Desktop app or Web application)");
    console.error("5. Add http://localhost:3000/oauth2callback as an authorized redirect URI");
    process.exit(1);
  }

  const oauth2Client = new OAuth2Client(clientId, clientSecret, redirectUri);

  // Generate auth URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent", // Force consent to get refresh token
  });

  console.log("\n=== Google Tag Manager MCP Server Authentication ===\n");
  console.log("Opening browser for authentication...");
  console.log("\nIf the browser doesn't open automatically, visit this URL:");
  console.log("\n" + authUrl + "\n");

  // Try to open browser
  const { default: open } = await import("open");
  try {
    await open(authUrl);
  } catch (error) {
    console.error("Could not open browser automatically. Please open the URL manually.");
  }

  // Create HTTP server to receive the OAuth callback
  return new Promise<void>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      if (!req.url?.startsWith("/oauth2callback")) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const url = new URL(req.url, `http://localhost:${PORT}`);
      const code = url.searchParams.get("code");

      if (!code) {
        res.writeHead(400);
        res.end("Missing authorization code");
        server.close();
        reject(new Error("Missing authorization code"));
        return;
      }

      try {
        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);

        if (!tokens.refresh_token) {
          throw new Error("No refresh token received. Please revoke access and try again.");
        }

        // Save tokens
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Authentication Successful</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  margin: 0;
                  background: #f0f0f0;
                }
                .container {
                  background: white;
                  padding: 40px;
                  border-radius: 8px;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                  text-align: center;
                }
                h1 { color: #4CAF50; }
                p { color: #666; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>✓ Authentication Successful!</h1>
                <p>You can close this window and return to the terminal.</p>
                <p>Tokens saved to: ${TOKEN_PATH}</p>
              </div>
            </body>
          </html>
        `);

        console.log("\n✓ Authentication successful!");
        console.log("Tokens saved to:", TOKEN_PATH);
        console.log("\nYou can now start the MCP server with: npm run local");

        server.close();
        resolve();
      } catch (error) {
        console.error("\n✗ Authentication failed:", error);
        res.writeHead(500);
        res.end("Authentication failed");
        server.close();
        reject(error);
      }
    });

    server.listen(PORT, () => {
      console.log(`Waiting for authentication callback on http://localhost:${PORT}...`);
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error("Authentication timeout"));
    }, 5 * 60 * 1000);
  });
}

// Run authentication
authenticate().catch((error) => {
  console.error("Authentication error:", error);
  process.exit(1);
});
