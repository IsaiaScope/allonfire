// @module-tag unit
import { CodedError } from "@allonfire/core/features/errors/coded-error";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { App, Role } from "@allonfire/database/enums";
import type {
  UserPicture,
  UserRecord,
} from "@allonfire/database/features/auth/user.service";
import { AUTH } from "../../../../shared/constants/auth";
import { sessionFor } from "../../../../shared/tests/stub-auth";
import { USER } from "../../constants/users";
import type { UserDeps } from "../utils/deps";
import { stubUserDeps } from "./stub-user-deps";
import { testHost } from "./test-host";

const ADMIN = sessionFor({
  memberships: [{ app: App.BACK_OFFICE, role: Role.ADMIN }],
});
const OTHER = "user-2";
const SAVED = "avatar-user-2-new.avif";
const PREVIOUS = "avatar-user-2-old.avif";
const GOOGLE = `https://${AUTH.PICTURE_HOSTS[0]}/a/x=s96-c`;
const BLUR = "data:image/webp;base64,AAAA";
const SAVED_PICTURE: UserPicture = { image: SAVED, imageBlurDataUrl: BLUR };
const signed = (image: string | null) => image && `signed:${image}`;
/** A bad picture as the Host's saveAvatar throws it (the storage's 415). */
const UNSUPPORTED = new CodedError({
  code: ERROR.CODE.BAD_REQUEST,
  status: HTTP.STATUS.UNSUPPORTED_MEDIA_TYPE,
});
const AVATAR_PATH = `${USER.PATH.BASE}${USER.PATH.AVATAR.replace(":id", OTHER)}`;
const ROW: UserRecord = {
  createdAt: new Date("2026-10-01T10:00:00.000Z"),
  email: "pictured@allonfire.test",
  id: OTHER,
  image: SAVED,
  imageBlurDataUrl: BLUR,
  memberships: [],
  name: null,
};

type Options = {
  allows?: boolean;
  previous?: string | null;
  exists?: boolean;
  maxBytes?: number;
  save?: () => Promise<UserPicture>;
};

/** Deps recording every call the module makes, in order. */
const depsWith = ({
  allows = true,
  exists = true,
  maxBytes = UNIT.BYTES_PER_KIB,
  previous = null,
  save = () => Promise.resolve(SAVED_PICTURE),
}: Options = {}) => {
  const calls: string[] = [];
  const deleted: (string | null)[][] = [];
  const set: [string, UserPicture | null][] = [];
  const deps: UserDeps = {
    ...stubUserDeps(),
    avatarLink: signed,
    avatarMaxBytes: maxBytes,
    canListUsers: () => true,
    canManageUsers: () => Promise.resolve(allows),
    deleteAvatars: (images) => {
      calls.push("deleteAvatars");
      deleted.push([...images]);
      return Promise.resolve();
    },
    deleteUsers: () => {
      calls.push("deleteUsers");
      return Promise.resolve(1);
    },
    listUsers: () => Promise.resolve({ total: 1, users: [ROW] }),
    saveAvatar: () => {
      calls.push("saveAvatar");
      return save();
    },
    setUserImage: (id, picture) => {
      calls.push("setUserImage");
      set.push([id, picture]);
      return Promise.resolve(exists ? { previous } : null);
    },
    userImages: () => {
      calls.push("userImages");
      return Promise.resolve([PREVIOUS]);
    },
  };
  return { calls, deleted, deps, set };
};

const upload = (host: ReturnType<typeof testHost>, bytes = 16) => {
  const form = new FormData();
  form.append("file", new File([new Uint8Array(bytes)], "avatar.webp"));
  return host.request(AVATAR_PATH, { body: form, method: HTTP.METHOD.PUT });
};
const removeAvatar = (host: ReturnType<typeof testHost>) =>
  host.request(AVATAR_PATH, { method: HTTP.METHOD.DELETE });

describe("User module: PUT avatar", () => {
  it("stores the name with its blur and answers both, the name as its signed link", async () => {
    const { deps, set } = depsWith();
    const res = await upload(testHost(ADMIN, deps));
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(await res.json()).toEqual({
      image: signed(SAVED),
      imageBlurDataUrl: BLUR,
    });
    expect(set).toEqual([[OTHER, SAVED_PICTURE]]);
  });

  it("deletes the picture it replaced", async () => {
    const { deleted, deps } = depsWith({ previous: PREVIOUS });
    await upload(testHost(ADMIN, deps));
    expect(deleted).toEqual([[PREVIOUS]]);
  });

  it("a provider's picture is replaced, handed to deleteAvatars to judge", async () => {
    const { deleted, deps } = depsWith({ previous: GOOGLE });
    await upload(testHost(ADMIN, deps));
    expect(deleted).toEqual([[GOOGLE]]);
  });

  it("an unknown User answers 404 and leaves no file", async () => {
    const { deleted, deps } = depsWith({ exists: false });
    const res = await upload(testHost(ADMIN, deps));
    expect(res.status).toBe(HTTP.STATUS.NOT_FOUND);
    expect(deleted).toEqual([[SAVED]]);
  });

  it("deletes the file just stored when the User's row cannot be written", async () => {
    const { deleted, deps } = depsWith();
    const res = await upload(
      testHost(ADMIN, {
        ...deps,
        setUserImage: () => Promise.reject(new Error("database down")),
      })
    );
    expect(res.status).toBe(HTTP.STATUS.INTERNAL_SERVER_ERROR);
    expect(deleted).toEqual([[SAVED]]);
  });

  it("answers 401 without a Session and 403 when the Host refuses, storing nothing", async () => {
    const { calls, deps } = depsWith({ allows: false });
    expect((await upload(testHost(null, deps))).status).toBe(
      HTTP.STATUS.UNAUTHORIZED
    );
    expect((await upload(testHost(ADMIN, deps))).status).toBe(
      HTTP.STATUS.FORBIDDEN
    );
    expect(calls).toEqual([]);
  });

  it("answers 413 over the limit, storing nothing", async () => {
    const { calls, deps } = depsWith({ maxBytes: 8 });
    const res = await upload(testHost(ADMIN, deps), 64);
    expect(res.status).toBe(HTTP.STATUS.PAYLOAD_TOO_LARGE);
    expect(calls).toEqual([]);
  });

  it("passes saveAvatar's 415 through", async () => {
    const { calls, deps } = depsWith({
      save: () => Promise.reject(UNSUPPORTED),
    });
    const res = await upload(testHost(ADMIN, deps));
    expect(res.status).toBe(HTTP.STATUS.UNSUPPORTED_MEDIA_TYPE);
    expect(calls).toEqual(["saveAvatar"]);
  });
});

describe("User module: DELETE avatar", () => {
  it("empties the picture and deletes its file (204)", async () => {
    const { deleted, deps, set } = depsWith({ previous: PREVIOUS });
    const res = await removeAvatar(testHost(ADMIN, deps));
    expect(res.status).toBe(HTTP.STATUS.NO_CONTENT);
    expect(set).toEqual([[OTHER, null]]);
    expect(deleted).toEqual([[PREVIOUS]]);
  });

  it("answers 404 for an unknown User", async () => {
    const { deps } = depsWith({ exists: false });
    expect((await removeAvatar(testHost(ADMIN, deps))).status).toBe(
      HTTP.STATUS.NOT_FOUND
    );
  });
});

describe("User module: a list and a deletion", () => {
  it("answers each listed User's picture through avatarLink", async () => {
    const { deps } = depsWith();
    const res = await testHost(ADMIN, deps).request(USER.PATH.BASE);
    const body = await res.json();
    expect(body.users[0].image).toBe(signed(SAVED));
    expect(body.users[0].imageBlurDataUrl).toBe(BLUR);
  });

  it("answers no blur beside a picture it cannot link", async () => {
    const { deps } = depsWith();
    const host = testHost(ADMIN, { ...deps, avatarLink: () => null });
    const body = await (await host.request(USER.PATH.BASE)).json();
    expect(body.users[0]).toMatchObject({
      image: null,
      imageBlurDataUrl: null,
    });
  });

  it("deletes the Users' pictures after the Users", async () => {
    const { calls, deleted, deps } = depsWith();
    await testHost(ADMIN, deps).request(USER.PATH.BASE, {
      body: stringifyJson({ ids: [OTHER] }),
      headers: { [HTTP.HEADER.CONTENT_TYPE]: HTTP.CONTENT_TYPE.JSON },
      method: HTTP.METHOD.DELETE,
    });
    expect(calls).toEqual(["userImages", "deleteUsers", "deleteAvatars"]);
    expect(deleted).toEqual([[PREVIOUS]]);
  });
});
