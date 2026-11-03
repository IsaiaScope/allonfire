import type { SharedTranslations } from "../translations/shared-translations";
import type { SharedTranslationsFor } from "../utils/aof-get-request-config";

// A Host speaking only base languages gets the shared text from core.
expectTypeOf<SharedTranslationsFor<"en" | "it">>().toEqualTypeOf<{
  shared?: undefined;
}>();

// A Host adding a language must supply the shared text in it.
expectTypeOf<SharedTranslationsFor<"en" | "it" | "fr">>().toEqualTypeOf<{
  shared: Record<"fr", SharedTranslations>;
}>();
