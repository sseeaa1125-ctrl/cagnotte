import { OAuth2Client } from "google-auth-library";
import dotenv from "dotenv";

dotenv.config();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

const client = new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);

async function main() {
  try {
    const { tokens } = await client.getToken({
      code: "invalid_code_just_to_see_the_error",
      redirect_uri: "postmessage",
    });
    console.log("Success:", tokens);
  } catch (err) {
    console.error("Error from Google:", err.message);
  }
}

main();
