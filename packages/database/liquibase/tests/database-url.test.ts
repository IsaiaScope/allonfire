// @module-tag unit
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const SCRIPT = resolve(import.meta.dirname, "../database-url.sh");
const TRAILING_NEWLINE = /\n$/;

function call(fn: string, url: string) {
  return spawnSync("bash", ["-c", `source "${SCRIPT}"; ${fn} "$1"`, fn, url], {
    encoding: "utf8",
  });
}

function run(fn: string, url: string): string {
  return execFileSync(
    "bash",
    ["-c", `source "${SCRIPT}"; ${fn} "$1"`, fn, url],
    { encoding: "utf8" }
  ).replace(TRAILING_NEWLINE, "");
}

describe("jdbc_url", () => {
  it("keeps host, port and database, and leaves the credentials out", () => {
    expect(
      run(
        "jdbc_url",
        "postgresql://allonfire:allonfire@localhost:5432/allonfire"
      )
    ).toBe("jdbc:postgresql://localhost:5432/allonfire");
  });

  it("accepts the postgres scheme and a host without a port", () => {
    expect(
      run("jdbc_url", "postgres://app:secret@dokploy-postgres/allonfire")
    ).toBe("jdbc:postgresql://dokploy-postgres/allonfire");
  });

  it("drops Prisma's schema parameter and keeps the others", () => {
    expect(
      run(
        "jdbc_url",
        "postgresql://app:secret@db:5432/allonfire?schema=public&sslmode=require"
      )
    ).toBe("jdbc:postgresql://db:5432/allonfire?sslmode=require");
  });

  it("drops every Prisma connector parameter", () => {
    expect(
      run(
        "jdbc_url",
        "postgresql://app:secret@db/allonfire?connection_limit=5&pool_timeout=10&socket_timeout=5&pgbouncer=true&statement_cache_size=0&sslidentity=id.p12&sslaccept=strict&sslmode=require"
      )
    ).toBe("jdbc:postgresql://db/allonfire?sslmode=require");
  });

  it("drops the query string when schema was its only parameter", () => {
    expect(
      run("jdbc_url", "postgresql://app:secret@db:5432/allonfire?schema=public")
    ).toBe("jdbc:postgresql://db:5432/allonfire");
  });

  it("fails on a URL it cannot parse without echoing it", () => {
    const result = call("jdbc_url", "mysql://app:hunter2@db/allonfire");
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).not.toContain("hunter2");
  });
});

describe("url_user", () => {
  it("prints the user", () => {
    expect(run("url_user", "postgresql://app:secret@db:5432/allonfire")).toBe(
      "app"
    );
  });

  it("percent-decodes the user", () => {
    expect(
      run("url_user", "postgresql://app%2Bci:secret@db:5432/allonfire")
    ).toBe("app+ci");
  });
});

describe("url_password", () => {
  it("percent-decodes the password", () => {
    expect(
      run("url_password", "postgresql://app:p%40ss%2Fw0rd%25@db:5432/allonfire")
    ).toBe("p@ss/w0rd%");
  });

  it("keeps a literal backslash as it is", () => {
    expect(
      run("url_password", String.raw`postgresql://app:a\nb@db:5432/allonfire`)
    ).toBe(String.raw`a\nb`);
  });

  it("prints nothing when the URL has no password", () => {
    expect(run("url_password", "postgresql://app@db:5432/allonfire")).toBe("");
  });

  it("fails on a URL it cannot parse without echoing it", () => {
    const result = call("url_password", "mysql://app:hunter2@db/allonfire");
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).not.toContain("hunter2");
  });
});

describe("libpq_url", () => {
  it("keeps the user and drops the password", () => {
    expect(run("libpq_url", "postgresql://app:secret@db:5432/allonfire")).toBe(
      "postgresql://app@db:5432/allonfire"
    );
  });

  it("keeps the user percent-encoded for libpq to decode", () => {
    expect(
      run("libpq_url", "postgres://app%2Bci:secret@db/allonfire?schema=public")
    ).toBe("postgresql://app%2Bci@db/allonfire");
  });

  it("drops sslpassword, which would put a secret on pg_dump's command line", () => {
    expect(
      run(
        "libpq_url",
        "postgresql://app:secret@db/allonfire?sslidentity=id.p12&sslpassword=hunter2&sslmode=require"
      )
    ).toBe("postgresql://app@db/allonfire?sslmode=require");
  });

  it("drops the connector parameters pg_dump would reject", () => {
    expect(
      run(
        "libpq_url",
        "postgresql://app:secret@db/allonfire?connection_limit=5&pgbouncer=true&application_name=db-backup"
      )
    ).toBe("postgresql://app@db/allonfire?application_name=db-backup");
  });

  it("drops Prisma's schema parameter and keeps the others", () => {
    expect(
      run(
        "libpq_url",
        "postgresql://app:secret@db:5432/allonfire?schema=public&sslmode=require"
      )
    ).toBe("postgresql://app@db:5432/allonfire?sslmode=require");
  });

  it("fails on a URL it cannot parse without echoing it", () => {
    const result = call("libpq_url", "mysql://app:hunter2@db/allonfire");
    expect(result.status).not.toBe(0);
    expect(result.stdout + result.stderr).not.toContain("hunter2");
  });
});

describe("query parameters", () => {
  it("gives Prisma's sslcert, the server's CA, to libpq as sslrootcert", () => {
    const url =
      "postgresql://app:secret@db/allonfire?sslmode=verify-full&sslcert=ca.pem";
    expect(run("libpq_url", url)).toBe(
      "postgresql://app@db/allonfire?sslmode=verify-full&sslrootcert=ca.pem"
    );
    expect(run("jdbc_url", url)).toBe(
      "jdbc:postgresql://db/allonfire?sslmode=verify-full&sslrootcert=ca.pem"
    );
  });

  it("keeps glob characters literal, whatever files sit in the directory", () => {
    const dir = mkdtempSync(join(tmpdir(), "database-url-"));
    writeFileSync(join(dir, "application_name=a"), "");
    try {
      const out = execFileSync(
        "bash",
        [
          "-c",
          `source "${SCRIPT}"; jdbc_url "$1"`,
          "jdbc_url",
          "postgresql://app:secret@db/allonfire?application_name=[a]",
        ],
        { cwd: dir, encoding: "utf8" }
      );
      expect(out.replace(TRAILING_NEWLINE, "")).toBe(
        "jdbc:postgresql://db/allonfire?application_name=[a]"
      );
    } finally {
      rmSync(dir, { force: true, recursive: true });
    }
  });
});
