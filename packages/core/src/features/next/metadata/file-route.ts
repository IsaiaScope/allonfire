import { objectFromEntries } from "../../../shared/utils/object";
import { HTTP } from "../../http/constants/http";

/**
 * A route serving a fixed set of files from one dynamic segment (`param`):
 * `GET` answers a listed file through `respond` and any other with Not
 * Found, and `generateStaticParams` builds every listed one at build time.
 */
export const fileRoute = <Param extends string, File>(
  param: Param,
  files: ReadonlyMap<string, File>,
  respond: (file: File) => Response | Promise<Response>
) => ({
  GET: async (
    _request: Request,
    { params }: { params: Promise<Record<Param, string>> }
  ) => {
    const file = files.get((await params)[param]);
    return file === undefined
      ? new Response(null, { status: HTTP.STATUS.NOT_FOUND })
      : respond(file);
  },
  generateStaticParams: async () =>
    [...files.keys()].map((name) =>
      objectFromEntries([[param, name] as const])
    ),
});
