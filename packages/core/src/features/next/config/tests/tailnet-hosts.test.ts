// @module-tag unit
import { execFileSync } from "node:child_process";
import { stringifyJson } from "../../../../shared/utils/json";
import { tailnetHosts } from "../tailnet-hosts";

vi.mock("node:child_process", () => ({ execFileSync: vi.fn() }));

const TAILNET = "tailnet.ts.net";
const status = (magicDnsSuffix: string) =>
  stringifyJson({ BackendState: "Running", MagicDNSSuffix: magicDnsSuffix });

describe("tailnetHosts", () => {
  // `pnpm dev:tailscale` serves each App as a Tailscale Service
  // (back-office.tailnet.ts.net, laura.tailnet.ts.net): one name per App,
  // every one under this tailnet's suffix.
  it("lets in every name on this machine's tailnet, the Apps' Services included", () => {
    vi.mocked(execFileSync).mockReturnValue(status(TAILNET));
    expect(tailnetHosts()).toEqual([`*.${TAILNET}`]);
  });

  it("names nothing while Tailscale waits for a sign-in", () => {
    vi.mocked(execFileSync).mockReturnValue(status(""));
    expect(tailnetHosts()).toEqual([]);
  });

  it("names nothing where Tailscale is not installed", () => {
    vi.mocked(execFileSync).mockImplementation(() => {
      throw new Error("spawn tailscale ENOENT");
    });
    expect(tailnetHosts()).toEqual([]);
  });

  it("names nothing when the status is not what it expects", () => {
    vi.mocked(execFileSync).mockReturnValue("not json");
    expect(tailnetHosts()).toEqual([]);
  });
});
