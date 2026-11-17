import { API_URL } from "../constants/api-url";

const LOCAL_HOSTS = new Set<string>(API_URL.LOCAL_HOSTS);

/**
 * The API address the browser calls, by the host its page was opened on:
 * `local` for a page on this machine, `remote` for any other host (Local only:
 * a phone on the tailnet, where the Session cookie is shared with the API's
 * tailnet address). With no `remote`, as in Production, or no page (the
 * server), it is `local`: the one API address.
 */
export const apiUrlFor = (
  hostname: string | undefined,
  { local, remote }: { local: string; remote: string | undefined }
): string =>
  remote !== undefined && hostname !== undefined && !LOCAL_HOSTS.has(hostname)
    ? remote
    : local;
