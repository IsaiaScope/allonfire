import { objectEntries, objectFromEntries } from "@allonfire/utils/object";
import { AUTH_OPENAPI_TAG } from "../constants/openapi";
import type { AuthLike, OpenApiFragment } from "../types/auth";

/**
 * Better Auth's own OpenAPI document, reshaped for a host to merge: paths
 * under the host's mount point, one `Auth` tag instead of Better Auth's.
 */
export async function authOpenApi(auth: AuthLike): Promise<OpenApiFragment> {
  const document = await auth.openApi();
  const paths = objectFromEntries(
    objectEntries(document.paths).map(([path, operations]) => [
      `${auth.basePath}${path}`,
      objectFromEntries(
        objectEntries(operations).map(([method, operation]) => [
          method,
          { ...operation, tags: [AUTH_OPENAPI_TAG] },
        ])
      ),
    ])
  );
  return {
    components: document.components ?? {},
    paths,
    tags: [{ name: AUTH_OPENAPI_TAG }],
  };
}
