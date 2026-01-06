# MCP Server for Google Tag Manager (Local)

Local MCP server for Google Tag Manager API. Runs directly on your machine using stdio transport.

## Quick Start

### 1. Clone and Install

```bash
git clone abn-digital/gtm-mcp-server.git
cd gtm-mcp-server
npm install -omit=optional
```

> Ignore any errors about optional Cloudflare dependencies - they're not needed for local execution.

### 2. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Enable **Google Tag Manager API**
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Choose "Desktop app" or "Web application"
6. Add redirect URI: `http://localhost:3000/oauth2callback`
7. Save the Client ID and Client Secret

### 3. Authenticate

```bash
npm run auth
```

This opens your browser for OAuth login. Complete it to save tokens.

### 4. Configure Claude Code

**Windows:** Edit `%USERPROFILE%\.claude.json`

**macOS/Linux:** Edit `~/.claude.json`

Add this configuration:

**Windows:**
```json
{
  "mcpServers": {
    "gtm": {
      "command": "npx",
      "args": [
        "ts-node",
        "--project",
        "C:\\path\\to\\your\\gtm-mcp-server\\tsconfig.local.json",
        "C:\\path\\to\\your\\gtm-mcp-server\\src\\index-local.ts"
      ],
      "env": {
        "NODE_OPTIONS": "--no-warnings",
        "GOOGLE_CLIENT_ID": "your-client-id.apps.googleusercontent.com",
        "GOOGLE_CLIENT_SECRET": "your-client-secret",
        "GOOGLE_REDIRECT_URI": "http://localhost:3000/oauth2callback"
      }
    }
  }
}
```

**macOS/Linux:**
```json
{
  "mcpServers": {
    "gtm": {
      "command": "npx",
      "args": [
        "ts-node",
        "--project",
        "/path/to/your/gtm-mcp-server/tsconfig.local.json",
        "/path/to/your/gtm-mcp-server/src/index-local.ts"
      ],
      "env": {
        "NODE_OPTIONS": "--no-warnings",
        "GOOGLE_CLIENT_ID": "your-client-id.apps.googleusercontent.com",
        "GOOGLE_CLIENT_SECRET": "your-client-secret",
        "GOOGLE_REDIRECT_URI": "http://localhost:3000/oauth2callback"
      }
    }
  }
}
```

**⚠️ Important:**
- Replace **both paths** with your actual repository location
- Replace the OAuth credentials with your own from step 2
- Example paths:
  - Windows: `C:\\Users\\joaqu\\Desktop\\Code\\gtm-mcp-server\\`
  - macOS/Linux: `/Users/joaqu/Desktop/Code/gtm-mcp-server/`

### 5. Restart Claude Desktop

The GTM tools should now be available!

## Testing

Run the server manually to test:

```bash
npm run local
```

## Troubleshooting

**Re-authenticate:** Delete `~/.gtm-mcp-tokens.json` and run `npm run auth`

**ARM64/Apple Silicon:** This fork is optimized for ARM64 - no special configuration needed.

**Errors on install:** Optional Cloudflare dependencies may fail - this is expected and safe to ignore.

**Environment variables:** You can use the `env` section in Claude Desktop config instead of `.env` file for easier credential management.
