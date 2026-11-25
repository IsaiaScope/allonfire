"use server";

import { API } from "@allonfire/api/shared/constants/api";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import type { SendOutcome } from "@allonfire/core/features/mail/constants/mail";
import { textOf } from "@allonfire/core/features/next/api/utils/aof-refusal";
import { objectFromEntries } from "@allonfire/core/shared/utils/object";
import type { ServiceType } from "@allonfire/database/enums";
import { updateTag } from "next/cache";
import { z } from "zod";
import { refusalOf } from "@/features/api/utils/api-refusal";
import { serverApi } from "@/features/api/utils/server-api";
import { SERVICES } from "../constants/services";
import {
  type ProviderFormValues,
  providerChangeOf,
  providerFormSchema,
} from "../utils/provider-form-schema";
import { serviceTag } from "../utils/service-tag";

const saveErrorSchema = z.enum(SERVICES.SAVE.ERROR);
type SaveProviderError = z.infer<typeof saveErrorSchema>;

/** Why saving failed and what was typed; or saved, the form's new Version. */
export type SaveProviderState = {
  error?: SaveProviderError;
  values?: ProviderFormValues;
  version?: string;
};

const PROVIDER_FIELDS = [
  "dailyLimit",
  "enabled",
  "fromAddress",
  "monthlyLimit",
  "name",
] as const;

/**
 * Saves a provider's settings through the API as the visitor (an Admin,
 * checked there) on the Version the form holds: a provider changed since is
 * refused (`changed`) and nothing is written. Saved, the page reads the
 * providers again and the form carries the new Version.
 */
export const saveProvider = async (
  id: string,
  state: SaveProviderState & { opened: string },
  form: FormData
): Promise<SaveProviderState & { opened: string }> => {
  const values = providerFormValuesOf(form);
  const parsed = providerFormSchema().safeParse(values);
  if (!parsed.success) {
    return { ...state, error: SERVICES.SAVE.ERROR.INVALID, values };
  }
  const version = state.version ?? state.opened;
  const response = await (await serverApi())[
    API.VERSION.CURRENT
  ].services.providers[":id"].$patch({
    json: { ...providerChangeOf(parsed.data), version },
    param: { id },
  });
  if (response.status !== HTTP.STATUS.OK) {
    const error = await refusalOf(response, SERVICES.SAVE.ERROR, {
      [ERROR.CODE.RESOURCE_CHANGED]: SERVICES.SAVE.ERROR.CHANGED,
      [API.ERROR.CODE.PROVIDER_INCOMPLETE]: SERVICES.SAVE.ERROR.INCOMPLETE,
      [ERROR.CODE.NOT_FOUND]: SERVICES.SAVE.ERROR.REMOVED,
      [ERROR.CODE.VALIDATION_FAILED]: SERVICES.SAVE.ERROR.INVALID,
    });
    // A copy known to be old (changed, removed) is dropped; a refusal of
    // the form's own values changed nothing.
    if (
      error === SERVICES.SAVE.ERROR.CHANGED ||
      error === SERVICES.SAVE.ERROR.REMOVED
    ) {
      updateTag(SERVICES.CACHE.TAG);
    }
    return { ...state, error, values };
  }
  updateTag(SERVICES.CACHE.TAG);
  return { opened: state.opened, version: (await response.json()).version };
};

/** The posted provider form, every field as text. */
const providerFormValuesOf = (form: FormData): ProviderFormValues =>
  objectFromEntries(
    PROVIDER_FIELDS.map((name) => [name, textOf(form, name)] as const)
  );

/** Turns a Service on or off; the next read is fresh. */
export const setServiceEnabled = async (
  type: ServiceType,
  enabled: boolean
): Promise<boolean> => {
  const response = await (await serverApi())[API.VERSION.CURRENT].services[
    ":type"
  ].$patch({ json: { enabled }, param: { type } });
  updateTag(serviceTag(type));
  return response.ok;
};

const testErrorSchema = z.enum(SERVICES.TEST.ERROR);

/** What a test send answers: the provider's outcome, or why none was asked. */
export type TestSendState = {
  outcome?: SendOutcome;
  error?: z.infer<typeof testErrorSchema>;
};

/**
 * Sends one test email through the provider to the signed-in Admin's own
 * address (the API reads it), and answers what the provider did with it.
 */
export const sendTestEmail = async (id: string): Promise<TestSendState> => {
  try {
    const response = await (await serverApi())[
      API.VERSION.CURRENT
    ].services.providers[":id"].test.$post({ param: { id } });
    if (response.status === HTTP.STATUS.OK) {
      updateTag(SERVICES.CACHE.TAG);
      return { outcome: (await response.json()).outcome };
    }
    if (response.status === HTTP.STATUS.NOT_FOUND) {
      updateTag(SERVICES.CACHE.TAG);
      return { error: SERVICES.TEST.ERROR.REMOVED };
    }
    return {
      error:
        response.status === HTTP.STATUS.TOO_MANY_REQUESTS
          ? SERVICES.TEST.ERROR.RATE_LIMITED
          : SERVICES.TEST.ERROR.FAILED,
    };
  } catch {
    return { error: SERVICES.TEST.ERROR.FAILED };
  }
};
