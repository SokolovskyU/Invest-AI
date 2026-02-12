import "dotenv/config";
import { buildAuthMetadata, createUsersClient } from "./grpc";

const token = process.env.TINVEST_TOKEN;
if (!token) {
  console.error("Missing TINVEST_TOKEN env var.");
  process.exit(1);
}

const endpoint =
  process.env.TINVEST_ENDPOINT?.trim() || "invest-public-api.tbank.ru:443";
const appName = process.env.TINVEST_APP_NAME?.trim();

const client = createUsersClient(endpoint);
const metadata = buildAuthMetadata(token, appName);

client.GetAccounts({}, metadata, (err, response) => {
  if (err) {
    console.error("GetAccounts error:", err.message);
    if (err.details) {
      console.error("Details:", err.details);
    }
    process.exit(1);
  }

  console.log(JSON.stringify(response, null, 2));
});
