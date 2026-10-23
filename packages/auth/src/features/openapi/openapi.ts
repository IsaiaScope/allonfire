import {
  objectEntries,
  objectFromEntries,
} from "@allonfire/core/shared/utils/object";
import { AUTH } from "../../shared/constants/auth";
import type { AuthLike, OpenApiFragment } from "../../shared/types/auth";

/**
 * Better Auth's own OpenAPI document, reshaped for a host to merge: paths
 * under the host's mount point, one `Auth` tag instead of Better Auth's, on
 * every operation.
 */
export async function authOpenApi(auth: AuthLike): Promise<OpenApiFragment> {
  const document = await auth.openApi();
  const paths = objectFromEntries(
    objectEntries(document.paths).map(([path, operations]) => [
      `${auth.basePath}${path}`,
      objectFromEntries(
        objectEntries(operations).map(([method, operation]) => [
          method,
          { ...operation, tags: [AUTH.OPENAPI_TAG] },
        ])
      ),
    ])
  );
  return {
    components: document.components ?? {},
    paths,
    tags: [{ name: AUTH.OPENAPI_TAG }],
  };
}
