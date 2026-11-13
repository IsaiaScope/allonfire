"use client";

import type { App } from "@allonfire/database/enums";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/features/api/utils/api";
import { ResourceView } from "@/shared/components/resource-view";
import { userQuery } from "../utils/users-queries";
import { EditUser } from "./edit-user";

/**
 * One User's edit page, read under the key the page hydrated it with (so it
 * opens filled), then the form on them (`ResourceView` draws the 404, the
 * error and the wait). `manageApp` and `selfId` are `EditUser`'s: whose page
 * it is, so their own Back Office Role stays locked.
 */
export const UserEditor = ({
  id,
  manageApp,
  selfId,
}: {
  id: string;
  manageApp: App;
  selfId: string;
}) => {
  const query = useQuery(userQuery(api, id));
  return (
    <ResourceView query={query}>
      {(user) => <EditUser manageApp={manageApp} selfId={selfId} user={user} />}
    </ResourceView>
  );
};
