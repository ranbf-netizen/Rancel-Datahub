/**
 * Run this ONCE to generate GMAIL_REFRESH_TOKEN for your .env.
 *
 * Usage:
 *   node scripts/get-gmail-token.mjs
 *
 * Requires GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REDIRECT_URI to
 * already be set in your .env (see .env.example). It will print a Google
 * login URL - open it, log in with the Gmail account you want the site
 * reading from, approve access, then paste the "code" from the redirected
 * URL back into the terminal when prompted.
 */
import "dotenv/config";
import { google } from "googleapis";
import readline from "node:readline";

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/gmail.readonly"],
});

console.log("\n1. Open this URL and approve access with the Gmail account you want read from:\n");
console.log(authUrl);
console.log('\n2. You\'ll be redirected to a URL containing "?code=..." (the page itself won\'t load - that\'s fine).');
console.log("   Copy that code value.\n");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question("Paste the code here: ", async (code) => {
  rl.close();
  try {
    const { tokens } = await oauth2Client.getToken(code.trim());
    console.log("\nAdd this line to your .env:\n");
    console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}\n`);
  } catch (err) {
    console.error("Error getting token:", err.message);
  }
});
