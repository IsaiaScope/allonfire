import type { SharedTranslationsFor } from "../aof-get-request-config";
import type { SharedTranslations } from "../shared-translations";

// A Host speaking only base languages gets the shared text from core.
expectTypeOf<SharedTranslationsFor<"en" | "it">>().toEqualTypeOf<{
  shared?: undefined;
}>();

// A Host adding a language must supply the shared text in it.
expectTypeOf<SharedTranslationsFor<"en" | "it" | "fr">>().toEqualTypeOf<{
  shared: Record<"fr", SharedTranslations>;
}>();
