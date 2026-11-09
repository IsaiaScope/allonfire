import { CodedError } from "../../errors/coded-error";
import { ERROR } from "../../errors/constants/error-codes";
import { HTTP } from "../../http/constants/http";

/**
 * A save refused: the resource changed since the Version it carries, or
 * another change left nothing for it to apply to. A service throws it; being
 * a `CodedError`, every host's `onError` answers it as the 409
 * `RESOURCE_CHANGED`, so no module maps it. `ids` names the resources that
 * changed, when the thrower knows them.
 */
export class ResourceChangedError extends CodedError {
  readonly ids: readonly string[];

  constructor(ids: readonly string[] = [], options?: ErrorOptions) {
    super(
      { code: ERROR.CODE.RESOURCE_CHANGED, status: HTTP.STATUS.CONFLICT },
      options
    );
    this.name = "ResourceChangedError";
    this.ids = ids;
  }
}

/**
 * The shared Version check (ADR 0028): throws `ResourceChangedError` unless
 * the Version a save carries (`expected`) is the one the resource holds now
 * (`actual`, read under the save's lock).
 */
export const checkVersion = (expected: string, actual: string): void => {
  if (expected !== actual) {
    throw new ResourceChangedError();
  }
};
