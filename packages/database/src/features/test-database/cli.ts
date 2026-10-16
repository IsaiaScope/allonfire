// The commands the e2e preset and CI run (Playwright starts web servers
// before global setup, so the API's start command makes its database):
//   test-database template                 builds or finds the template, prints its URL
//   test-database create <label> <stamp>   drops the label's earlier runs, prints the clone's URL
//   test-database drop <label> <stamp>
// DATABASE_URL names the server (the Local `allonfire` database, or CI's);
// a clone is a sibling database on it.
import { env } from "../../environment/environment";
import { databaseUrl } from "./names";
import { ensureTemplate } from "./template";
import {
  createTestDatabase,
  dropTestDatabase,
  dropTestDatabasesOf,
} from "./test-database";

const USAGE = "Usage: test-database template | <create|drop> <label> <stamp>";
const [command, label, stamp] = process.argv.slice(2);

if (command === "template") {
  process.stdout.write(
    databaseUrl(env.DATABASE_URL, await ensureTemplate(env.DATABASE_URL))
  );
} else if (!(label && stamp)) {
  throw new Error(USAGE);
} else if (command === "create") {
  await dropTestDatabasesOf(env.DATABASE_URL, label);
  process.stdout.write(
    await createTestDatabase(env.DATABASE_URL, label, stamp)
  );
} else if (command === "drop") {
  await dropTestDatabase(env.DATABASE_URL, label, stamp);
} else {
  throw new Error(USAGE);
}
