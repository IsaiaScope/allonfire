// @module-tag unit
import { ServiceType } from "@allonfire/database/enums";
import { QueryClient } from "@tanstack/react-query";
import { QUERY } from "@/shared/constants/query";
import { setServiceEnabled } from "../../actions/services";
import { serviceEnabledMutation } from "../services-mutations";
import { type ServiceList, servicesListKey } from "../services-queries";

vi.mock("../../actions/services", () => ({ setServiceEnabled: vi.fn() }));

const KEY = servicesListKey(ServiceType.MAIL);

/** The Mail Service, on, with no providers: only its switch is under test. */
const SERVICES_LIST: ServiceList = {
  services: [{ enabled: true, providers: [], type: ServiceType.MAIL }],
};

/** A client whose Mail list is cached with the Service on. */
const seeded = () => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(KEY, SERVICES_LIST);
  return queryClient;
};

const enabledIn = (queryClient: QueryClient) =>
  queryClient.getQueryData(KEY)?.services[0]?.enabled;

const run = (queryClient: QueryClient, enabled: boolean) =>
  queryClient
    .getMutationCache()
    .build(queryClient, serviceEnabledMutation(ServiceType.MAIL))
    .execute(enabled);

beforeEach(() => {
  vi.mocked(setServiceEnabled).mockReset();
});

describe("serviceEnabledMutation", () => {
  it("shows the choice in the cache while the action is still pending", async () => {
    let release: () => void = () => undefined;
    vi.mocked(setServiceEnabled).mockReturnValue(
      new Promise((resolve) => {
        release = () => resolve(true);
      })
    );
    const queryClient = seeded();
    const done = run(queryClient, false);
    await vi.waitFor(() => expect(enabledIn(queryClient)).toBe(false));
    release();
    await done;
    expect(enabledIn(queryClient)).toBe(false);
  });

  it("sends the choice for its Service type", async () => {
    vi.mocked(setServiceEnabled).mockResolvedValue(true);
    await run(seeded(), false);
    expect(setServiceEnabled).toHaveBeenCalledWith(ServiceType.MAIL, false);
  });

  it("puts the confirmed choice back when the API refuses", async () => {
    vi.mocked(setServiceEnabled).mockResolvedValue(false);
    const queryClient = seeded();
    await run(queryClient, false).catch(() => undefined);
    expect(enabledIn(queryClient)).toBe(true);
  });

  it("puts the confirmed choice back when the action throws", async () => {
    vi.mocked(setServiceEnabled).mockRejectedValue(new Error("fetch failed"));
    const queryClient = seeded();
    await run(queryClient, false).catch(() => undefined);
    expect(enabledIn(queryClient)).toBe(true);
  });

  it("writes nothing and still runs the action when no list is cached", async () => {
    vi.mocked(setServiceEnabled).mockResolvedValue(true);
    const queryClient = new QueryClient();
    await run(queryClient, false);
    expect(queryClient.getQueryData(KEY)).toBeUndefined();
    expect(setServiceEnabled).toHaveBeenCalledTimes(1);
  });

  it("reads the Services again once saved", async () => {
    vi.mocked(setServiceEnabled).mockResolvedValue(true);
    const queryClient = seeded();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    await run(queryClient, false);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: QUERY.SERVICES.ALL });
  });
});
