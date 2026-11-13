// @module-tag unit
import { notFound } from "next/navigation";
import { HTTP } from "../../../http/constants/http";
import { AOFResourceView } from "../components/aof-resource-view";

vi.mock("next/navigation", () => ({ notFound: vi.fn() }));

const refetch = vi.fn();
const refused = (statusCode: number) => ({ statusCode });

const view = (query: { data: string | undefined; error: unknown }) =>
  AOFResourceView({
    children: (data: string) => `drawn ${data}`,
    failed: () => "failed",
    loading: "waiting",
    query: { ...query, refetch },
  });

beforeEach(() => {
  vi.mocked(notFound).mockClear();
});

describe("AOFResourceView", () => {
  it("draws the resource once it is read", () => {
    expect(view({ data: "the sea", error: null })).toBe("drawn the sea");
  });

  // This very page deleted the resource: the refetch that follows fails, and
  // the form must stay.
  it("keeps drawing the resource when a later read fails", () => {
    expect(
      view({ data: "the sea", error: refused(HTTP.STATUS.NOT_FOUND) })
    ).toBe("drawn the sea");
    expect(notFound).not.toHaveBeenCalled();
  });

  it("shows the loading slot while nothing is read yet", () => {
    expect(view({ data: undefined, error: null })).toBe("waiting");
  });

  it("is the 404 for a resource the API does not know", () => {
    vi.mocked(notFound).mockImplementationOnce(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
    expect(() =>
      view({ data: undefined, error: refused(HTTP.STATUS.NOT_FOUND) })
    ).toThrow("NEXT_NOT_FOUND");
  });

  it("hands any other refusal to the failed slot, with the read's retry", () => {
    const shown = AOFResourceView({
      children: (data: string) => data,
      failed: (retry) => {
        retry();
        return "failed";
      },
      loading: "waiting",
      query: {
        data: undefined,
        error: refused(HTTP.STATUS.FORBIDDEN),
        refetch,
      },
    });
    expect(shown).toBe("failed");
    expect(notFound).not.toHaveBeenCalled();
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("treats an error that is no refusal at all as a failure, never a 404", () => {
    expect(view({ data: undefined, error: new Error("offline") })).toBe(
      "failed"
    );
    expect(notFound).not.toHaveBeenCalled();
  });
});
