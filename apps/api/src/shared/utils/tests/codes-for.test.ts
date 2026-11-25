// @module-tag unit
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { API } from "../../constants/api";
import { codesFor } from "../codes-for";

describe("codesFor", () => {
  it("lists the codes sent with a status, in API.ERROR.CODE order", () => {
    expect(codesFor(HTTP.STATUS.FORBIDDEN)).toEqual([
      API.ERROR.CODE.CANNOT_DELETE_SELF,
      API.ERROR.CODE.CANNOT_CHANGE_OWN_ROLE,
      API.ERROR.CODE.FORBIDDEN,
    ]);
  });

  it("answers one code for a status that has one", () => {
    expect(codesFor(HTTP.STATUS.NOT_FOUND)).toEqual([ERROR.CODE.NOT_FOUND]);
  });

  it("covers every code under exactly one status", () => {
    const listed = API.ERROR.STATUS.flatMap((status) => codesFor(status));

    expect([...listed].sort()).toEqual(
      [...objectValues(API.ERROR.CODE)].sort()
    );
  });
});
