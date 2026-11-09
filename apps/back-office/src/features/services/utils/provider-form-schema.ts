import { MAIL } from "@allonfire/core/features/mail/constants/mail";
import { z } from "zod";
import { SERVICES } from "../constants/services";
import type { ListedProvider } from "./services-queries";

/** The provider form's field messages, translated by the form. */
export type ProviderFieldMessages = {
  email: string;
  limit: string;
  limitTooHigh: string;
  nameTooLong: string;
  required: string;
};

const choiceSchema = z.enum([SERVICES.CHOICE.ON, SERVICES.CHOICE.OFF]);
const WHOLE = /^\d+$/;

/** A whole number of 0 or more, no higher than the API takes. */
const limitText = (messages?: ProviderFieldMessages) =>
  z
    .string()
    .trim()
    .regex(WHOLE, messages?.limit)
    .refine((text) => Number(text) <= MAIL.LIMIT.USAGE_MAX, {
      message: messages?.limitTooHigh,
    });

/**
 * The provider form's checks, on what it posts (every field text): the
 * same rules the API applies, which count. The name, the sender and the daily
 * limit are required, on or off (the API takes no empty sender); a monthly
 * limit left empty means none. Where a provider is reached is the
 * environment's, never a field.
 */
export const providerFormSchema = (messages?: ProviderFieldMessages) =>
  z.object({
    dailyLimit: limitText(messages),
    enabled: choiceSchema,
    fromAddress: z
      .email(messages?.email)
      .max(MAIL.LIMIT.ADDRESS_MAX, messages?.email),
    monthlyLimit: z.union([z.literal(""), limitText(messages)]),
    name: z
      .string()
      .trim()
      .min(1, messages?.required)
      .max(MAIL.LIMIT.NAME_MAX, messages?.nameTooLong),
  });

/** The form's fields, every one text as a form posts it. */
export type ProviderFormValues = Record<
  keyof z.input<ReturnType<typeof providerFormSchema>>,
  string
>;

/** A provider as the form starts: its stored settings as text. */
export const providerFormValues = (
  provider: ListedProvider
): ProviderFormValues => ({
  dailyLimit: String(provider.dailyLimit),
  enabled: provider.enabled ? SERVICES.CHOICE.ON : SERVICES.CHOICE.OFF,
  fromAddress: provider.fromAddress,
  monthlyLimit:
    provider.monthlyLimit === null ? "" : String(provider.monthlyLimit),
  name: provider.name,
});

/** A form's values as the API's change: numbers, nulls for "none". */
export const providerChangeOf = (
  values: z.output<ReturnType<typeof providerFormSchema>>
) => ({
  dailyLimit: Number(values.dailyLimit),
  enabled: values.enabled === SERVICES.CHOICE.ON,
  fromAddress: values.fromAddress,
  monthlyLimit: values.monthlyLimit === "" ? null : Number(values.monthlyLimit),
  name: values.name,
});
