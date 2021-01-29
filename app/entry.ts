import * as Sentry from "@sentry/electron";

console.log("Initializing Sentry");
// Initialize sentry
Sentry.init({
  dsn:
    "https://8819124a931949c285f21102befaf7c3@o513342.ingest.sentry.io/5615032",
});

console.log("Starting rift-explorer");
// Start rift-explorer
import "./main";
