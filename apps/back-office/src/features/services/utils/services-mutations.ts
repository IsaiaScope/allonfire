import { optimisticMutation } from "@allonfire/core/features/next/query/utils/optimistic-mutation";
import { optimisticUpdate } from "@allonfire/core/features/next/query/utils/optimistic-update";
import type { ServiceType } from "@allonfire/database/enums";
import { MUTATION } from "@/shared/constants/mutation";
import { QUERY } from "@/shared/constants/query";
import { setServiceEnabled } from "../actions/services";
import { type ServiceList, servicesListKey } from "./services-queries";

/**
 * Turns a whole Service type on or off (`optimisticMutation`): the choice is
 * written to the type's cached list first, so the switch and the cards read
 * it at once, then the `setServiceEnabled` action runs. A refusal or a thrown
 * error puts the confirmed choice back; once saved, every Services read is
 * asked again. Two quick choices of one type run in order, the last one
 * standing (the `enabled` flag has no Version).
 */
export const serviceEnabledMutation = (type: ServiceType) =>
  optimisticMutation({
    action: async (enabled: boolean) =>
      (await setServiceEnabled(type, enabled)) ? { enabled } : null,
    invalidates: [QUERY.SERVICES.ALL],
    mutationKey: MUTATION.SERVICES.ENABLED(type),
    patchCache: (queryClient, enabled) =>
      optimisticUpdate<ServiceList>(
        queryClient,
        servicesListKey(type),
        (list) => ({
          ...list,
          services: list.services.map((service) =>
            service.type === type ? { ...service, enabled } : service
          ),
        })
      ),
    scope: MUTATION.SERVICES.ENABLED(type).join("."),
  });
