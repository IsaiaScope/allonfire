"use client";

import { AOFSubmitButton } from "@allonfire/ui/features/form/components/aof-submit-button";
import { useAOFForm } from "@allonfire/ui/features/form/utils/form";
import { useAOFFormAction } from "@allonfire/ui/features/form/utils/form-submit";
import { aofToast } from "@allonfire/ui/shared/hooks/use-aof-toast";
import { IconDeviceFloppy, IconLoader2 } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useActionState, useEffect } from "react";
import { ActionKanji, kanjiAction } from "@/shared/components/brush-kanji";
import { FormAlert } from "@/shared/components/form-alert";
import { saveProvider } from "../actions/services";
import { SERVICES } from "../constants/services";
import { useRefreshServices } from "../hooks/use-refresh-services";
import {
  providerFormSchema,
  providerFormValues,
} from "../utils/provider-form-schema";
import type { ListedProvider } from "../utils/services-queries";
import {
  PROVIDER_FIELDS,
  ProviderIdentity,
  ProviderLimits,
  ProviderSwitches,
} from "./provider-fields";

/**
 * One provider's settings, an AOF form (ADR 0017) on the Version it was
 * opened with: its name, whether it sends, its sender and its limits. Saving reads
 * the page again; a provider changed meanwhile is refused, never overwritten.
 */
export const ProviderForm = ({ provider }: { provider: ListedProvider }) => {
  const t = useTranslations("Services");
  const [{ error, values, version }, action, pending] = useActionState(
    saveProvider.bind(null, provider.id),
    { opened: provider.version }
  );
  const refresh = useRefreshServices();
  useEffect(() => {
    if (version) {
      aofToast(t("saved"), "success");
      refresh();
    }
  }, [version, t, refresh]);
  // A copy known to be old (changed, removed) is read again, as the action
  // dropped the server's.
  const copyIsOld =
    error === SERVICES.SAVE_ERROR.CHANGED ||
    error === SERVICES.SAVE_ERROR.REMOVED;
  useEffect(() => {
    if (copyIsOld) {
      refresh();
    }
  }, [copyIsOld, refresh]);
  const form = useAOFForm({
    defaultValues: values ?? providerFormValues(provider),
    validators: {
      onChange: providerFormSchema({
        email: t("fieldError.email"),
        limit: t("fieldError.limit"),
        limitTooHigh: t("fieldError.limitTooHigh"),
        nameTooLong: t("fieldError.nameTooLong"),
        required: t("fieldError.required"),
      }),
    },
  });
  const formProps = useAOFFormAction(form, action);
  return (
    <form
      aria-label={provider.name}
      className="grid @2xl:grid-cols-2 @2xl:gap-x-6"
      {...formProps}
    >
      {/* Two columns: the inputs first, in pairs, then whether it is
          enabled under them. */}
      <ProviderIdentity fields={PROVIDER_FIELDS.IDENTITY} form={form} />
      <ProviderLimits fields={PROVIDER_FIELDS.LIMITS} form={form} />
      <ProviderSwitches fields={PROVIDER_FIELDS.SWITCHES} form={form} />
      <FormAlert className="@2xl:col-span-2 mt-2">
        {error ? t(`error.${error}`) : null}
      </FormAlert>
      <div className="@2xl:col-span-2 flex justify-end gap-3 pt-2">
        <AOFSubmitButton
          className={kanjiAction()}
          pending={pending}
          pendingChildren={
            <>
              <IconLoader2 aria-hidden className="animate-spin" />
              {t("saving")}
            </>
          }
          size="field"
        >
          <ActionKanji kanji={SERVICES.SAVE_KANJI} />
          <IconDeviceFloppy aria-hidden />
          {t("save")}
        </AOFSubmitButton>
      </div>
    </form>
  );
};
