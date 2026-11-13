// @module-tag unit

import { API } from "@allonfire/api/shared/constants/api";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { MAIL } from "@allonfire/core/features/mail/constants/mail";
import { objectEntries } from "@allonfire/core/shared/utils/object";
import { ServiceType } from "@allonfire/database/enums";
import { refresh, updateTag } from "next/cache";
import { FAKE_API, resetFakeApi } from "@/features/api/tests/fake-api";
import { SERVICES, serviceTag } from "../../constants/services";
import { saveProvider, sendTestEmail, setServiceEnabled } from "../services";

vi.mock(
  "@/features/api/utils/server-api",
  () => import("@/features/api/tests/fake-api")
);
vi.mock("next/cache", () => import("@/shared/tests/next-cache-mock"));

const ID = "provider-1";
const OPENED = "version-1";

const formOf = (fields: Record<string, string> = {}) => {
  const form = new FormData();
  for (const [key, value] of objectEntries({
    dailyLimit: "300",
    enabled: SERVICES.CHOICE.ON,
    fromAddress: "hello@allonfire.test",
    monthlyLimit: "",
    name: "Provider 1",
    ...fields,
  })) {
    form.append(key, value);
  }
  return form;
};
const save = (form = formOf()) => saveProvider(ID, { opened: OPENED }, form);

beforeEach(() => {
  resetFakeApi();
  vi.mocked(refresh).mockClear();
  vi.mocked(updateTag).mockClear();
});

it("saves on the opened Version and carries the new one", async () => {
  FAKE_API.answers.set(HTTP.METHOD.PATCH, {
    body: { version: "version-2" },
    status: HTTP.STATUS.OK,
  });
  expect(await save()).toEqual({ opened: OPENED, version: "version-2" });
  expect(FAKE_API.sent[0]?.body).toMatchObject({ version: OPENED });
  expect(updateTag).toHaveBeenCalledWith(SERVICES.CACHE.TAG);
  expect(refresh).not.toHaveBeenCalled();
});

it("refuses an invalid form before any request", async () => {
  const state = await save(formOf({ dailyLimit: "many" }));
  expect(state.error).toBe(SERVICES.SAVE_ERROR.INVALID);
  expect(FAKE_API.sent).toHaveLength(0);
});

it.each([
  [API.ERROR.CODE.PROVIDER_INCOMPLETE, SERVICES.SAVE_ERROR.INCOMPLETE],
  [ERROR.CODE.RESOURCE_CHANGED, SERVICES.SAVE_ERROR.CHANGED],
  [ERROR.CODE.VALIDATION_FAILED, SERVICES.SAVE_ERROR.INVALID],
])("answers the API's %s as %s, keeping the values", async (code, error) => {
  FAKE_API.answers.set(HTTP.METHOD.PATCH, {
    code,
    status: API.ERROR.STATUS_OF_CODE[code],
  });
  const state = await save();
  expect(state.error).toBe(error);
  expect(state.values?.name).toBe("Provider 1");
  // A copy known to be old is dropped too; an invalid form changed nothing.
  expect(updateTag).toHaveBeenCalledTimes(
    code === ERROR.CODE.RESOURCE_CHANGED ? 1 : 0
  );
});

it("answers a provider another Admin removed, dropping the copy", async () => {
  FAKE_API.answers.set(HTTP.METHOD.PATCH, {
    code: ERROR.CODE.NOT_FOUND,
    status: HTTP.STATUS.NOT_FOUND,
  });
  expect((await save()).error).toBe(SERVICES.SAVE_ERROR.REMOVED);
  expect(updateTag).toHaveBeenCalledWith(SERVICES.CACHE.TAG);
});

it("answers a Session that may no longer change Services as refused", async () => {
  FAKE_API.answers.set(HTTP.METHOD.PATCH, { status: HTTP.STATUS.FORBIDDEN });
  expect((await save()).error).toBe(SERVICES.SAVE_ERROR.REFUSED);
});

describe("sendTestEmail", () => {
  it("answers the outcome and drops the copy: the test used quota", async () => {
    FAKE_API.answers.set(HTTP.METHOD.POST, {
      body: { outcome: MAIL.OUTCOME.ACCEPTED },
      status: HTTP.STATUS.OK,
    });
    expect(await sendTestEmail(ID)).toEqual({
      outcome: MAIL.OUTCOME.ACCEPTED,
    });
    expect(updateTag).toHaveBeenCalledWith(SERVICES.CACHE.TAG);
  });

  it("answers a provider that is gone, dropping the copy", async () => {
    FAKE_API.answers.set(HTTP.METHOD.POST, {
      status: HTTP.STATUS.NOT_FOUND,
    });
    expect(await sendTestEmail(ID)).toEqual({
      error: SERVICES.TEST_ERROR.REMOVED,
    });
    expect(updateTag).toHaveBeenCalledWith(SERVICES.CACHE.TAG);
  });

  it("answers a rate limit without dropping anything", async () => {
    FAKE_API.answers.set(HTTP.METHOD.POST, {
      status: HTTP.STATUS.TOO_MANY_REQUESTS,
    });
    expect(await sendTestEmail(ID)).toEqual({
      error: SERVICES.TEST_ERROR.RATE_LIMITED,
    });
    expect(updateTag).not.toHaveBeenCalled();
  });
});

describe("setServiceEnabled", () => {
  it("drops that type's copy once the Service is switched, no other type's", async () => {
    expect(await setServiceEnabled(ServiceType.MAIL, false)).toBe(true);
    expect(updateTag).toHaveBeenCalledWith(serviceTag(ServiceType.MAIL));
    expect(updateTag).not.toHaveBeenCalledWith(SERVICES.CACHE.TAG);
    expect(refresh).not.toHaveBeenCalled();
  });
});
