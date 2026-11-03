// @module-tag unit

import { CodedError } from "@allonfire/core/features/errors/coded-error";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { ResourceChangedError } from "@allonfire/core/features/version/utils/resource-changed-error";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { fillPath } from "@allonfire/core/shared/utils/route-path";
import type { UserPicture } from "@allonfire/database/features/auth/user.service";
import { AUTH } from "../../../../shared/constants/auth";
import { errorOf, json } from "../../../../shared/tests/test-host";
import { USER } from "../../constants/users";
import type { UserDeps } from "../utils/deps";
import {
  BACK_OFFICE_ADMIN as ADMIN,
  stubUserDeps,
  userHost,
  userRow,
} from "./stub-user-deps";

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
const AVATAR_PATH = `${USER.PATH.BASE}${fillPath(USER.PATH.AVATAR, { id: OTHER })}`;
const ROW = userRow({
  email: "pictured@allonfire.test",
  id: OTHER,
  image: SAVED,
  imageBlurDataUrl: BLUR,
});
/** The User's Version the change was made on. */
const VERSION = ROW.version;

type Options = {
  allows?: boolean;
  previous?: string | null;
  exists?: boolean;
  /** The stored User changed since the Version the change carries. */
  changed?: boolean;
  maxBytes?: number;
  save?: () => Promise<UserPicture>;
};

/** Deps recording every call the module makes, in order. */
const depsWith = ({
  allows = true,
  changed = false,
  exists = true,
  maxBytes = UNIT.BYTES_PER_KIB,
  previous = null,
  save = () => Promise.resolve(SAVED_PICTURE),
}: Options = {}) => {
  const calls: string[] = [];
  const deleted: (string | null)[][] = [];
  const set: [string, UserPicture | null][] = [];
  const versions: string[] = [];
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
    setUserImage: (id, picture, { expectedVersion }) => {
      calls.push("setUserImage");
      versions.push(expectedVersion);
      if (changed) {
        return Promise.reject(new ResourceChangedError());
      }
      set.push([id, picture]);
      return Promise.resolve(exists ? { previous } : null);
    },
    userImages: () => {
      calls.push("userImages");
      return Promise.resolve([PREVIOUS]);
    },
  };
  return { calls, deleted, deps, set, versions };
};

const upload = (
  host: ReturnType<typeof userHost>,
  bytes = 16,
  version: string | null = VERSION
) => {
  const form = new FormData();
  form.append("file", new File([new Uint8Array(bytes)], "avatar.webp"));
  if (version !== null) {
    form.append("version", version);
  }
  return host.request(AVATAR_PATH, { body: form, method: HTTP.METHOD.PUT });
};
const removeAvatar = (
  host: ReturnType<typeof userHost>,
  body: { version?: string } = { version: VERSION }
) => host.request(AVATAR_PATH, json(HTTP.METHOD.DELETE, body));

describe("User module: PUT avatar", () => {
  it("stores the name with its blur and answers both, the name as its signed link", async () => {
    const { deps, set } = depsWith();
    const res = await upload(userHost(ADMIN, deps));
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(await res.json()).toEqual({
      image: signed(SAVED),
      imageBlurDataUrl: BLUR,
    });
    expect(set).toEqual([[OTHER, SAVED_PICTURE]]);
  });

  it("deletes the picture it replaced", async () => {
    const { deleted, deps } = depsWith({ previous: PREVIOUS });
    await upload(userHost(ADMIN, deps));
    expect(deleted).toEqual([[PREVIOUS]]);
  });

  it("a provider's picture is replaced, handed to deleteAvatars to judge", async () => {
    const { deleted, deps } = depsWith({ previous: GOOGLE });
    await upload(userHost(ADMIN, deps));
    expect(deleted).toEqual([[GOOGLE]]);
  });

  it("an unknown User answers 404 and leaves no file", async () => {
    const { deleted, deps } = depsWith({ exists: false });
    const res = await upload(userHost(ADMIN, deps));
    expect(res.status).toBe(HTTP.STATUS.NOT_FOUND);
    expect(deleted).toEqual([[SAVED]]);
  });

  it("deletes the file just stored when the User's row cannot be written", async () => {
    const { deleted, deps } = depsWith();
    const res = await upload(
      userHost(ADMIN, {
        ...deps,
        setUserImage: () => Promise.reject(new Error("database down")),
      })
    );
    expect(res.status).toBe(HTTP.STATUS.INTERNAL_SERVER_ERROR);
    expect(deleted).toEqual([[SAVED]]);
  });

  it("answers 401 without a Session and 403 when the Host refuses, storing nothing", async () => {
    const { calls, deps } = depsWith({ allows: false });
    expect((await upload(userHost(null, deps))).status).toBe(
      HTTP.STATUS.UNAUTHORIZED
    );
    expect((await upload(userHost(ADMIN, deps))).status).toBe(
      HTTP.STATUS.FORBIDDEN
    );
    expect(calls).toEqual([]);
  });

  it("answers 413 over the limit, storing nothing", async () => {
    const { calls, deps } = depsWith({ maxBytes: 8 });
    const res = await upload(userHost(ADMIN, deps), 64);
    expect(res.status).toBe(HTTP.STATUS.PAYLOAD_TOO_LARGE);
    expect(calls).toEqual([]);
  });

  it("passes the Version to setUserImage", async () => {
    const { deps, versions } = depsWith();
    await upload(userHost(ADMIN, deps));
    expect(versions).toEqual([VERSION]);
  });

  it("a stale Version answers 409 RESOURCE_CHANGED and writes nothing", async () => {
    const { deleted, deps, set } = depsWith({ changed: true });
    const res = await upload(userHost(ADMIN, deps));
    expect(res.status).toBe(HTTP.STATUS.CONFLICT);
    expect((await errorOf(res)).code).toBe(ERROR.CODE.RESOURCE_CHANGED);
    expect(set).toEqual([]);
    // The file just stored is deleted: no row names it.
    expect(deleted).toEqual([[SAVED]]);
  });

  it("refuses a picture without a Version, storing nothing", async () => {
    const { calls, deps } = depsWith();
    const res = await upload(userHost(ADMIN, deps), 16, null);
    expect(res.status).toBe(HTTP.STATUS.BAD_REQUEST);
    expect(calls).toEqual([]);
  });

  it("passes saveAvatar's 415 through", async () => {
    const { calls, deps } = depsWith({
      save: () => Promise.reject(UNSUPPORTED),
    });
    const res = await upload(userHost(ADMIN, deps));
    expect(res.status).toBe(HTTP.STATUS.UNSUPPORTED_MEDIA_TYPE);
    expect(calls).toEqual(["saveAvatar"]);
  });
});

describe("User module: DELETE avatar", () => {
  it("empties the picture and deletes its file (204)", async () => {
    const { deleted, deps, set } = depsWith({ previous: PREVIOUS });
    const res = await removeAvatar(userHost(ADMIN, deps));
    expect(res.status).toBe(HTTP.STATUS.NO_CONTENT);
    expect(set).toEqual([[OTHER, null]]);
    expect(deleted).toEqual([[PREVIOUS]]);
  });

  it("answers 404 for an unknown User", async () => {
    const { deps } = depsWith({ exists: false });
    expect((await removeAvatar(userHost(ADMIN, deps))).status).toBe(
      HTTP.STATUS.NOT_FOUND
    );
  });

  it("passes the Version to setUserImage", async () => {
    const { deps, versions } = depsWith();
    await removeAvatar(userHost(ADMIN, deps));
    expect(versions).toEqual([VERSION]);
  });

  it("a stale Version answers 409 RESOURCE_CHANGED and writes nothing", async () => {
    const { deleted, deps, set } = depsWith({
      changed: true,
      previous: PREVIOUS,
    });
    const res = await removeAvatar(userHost(ADMIN, deps));
    expect(res.status).toBe(HTTP.STATUS.CONFLICT);
    expect((await errorOf(res)).code).toBe(ERROR.CODE.RESOURCE_CHANGED);
    expect(set).toEqual([]);
    expect(deleted).toEqual([]);
  });

  it("refuses a removal without a Version, removing nothing", async () => {
    const { calls, deps } = depsWith();
    const res = await removeAvatar(userHost(ADMIN, deps), {});
    expect(res.status).toBe(HTTP.STATUS.BAD_REQUEST);
    expect(calls).toEqual([]);
  });
});

describe("User module: a list and a deletion", () => {
  it("answers each listed User's picture through avatarLink", async () => {
    const { deps } = depsWith();
    const res = await userHost(ADMIN, deps).request(USER.PATH.BASE);
    const body = await res.json();
    expect(body.users[0].image).toBe(signed(SAVED));
    expect(body.users[0].imageBlurDataUrl).toBe(BLUR);
  });

  it("answers no blur beside a picture it cannot link", async () => {
    const { deps } = depsWith();
    const host = userHost(ADMIN, { ...deps, avatarLink: () => null });
    const body = await (await host.request(USER.PATH.BASE)).json();
    expect(body.users[0]).toMatchObject({
      image: null,
      imageBlurDataUrl: null,
    });
  });

  it("deletes the Users' pictures after the Users", async () => {
    const { calls, deleted, deps } = depsWith();
    await userHost(ADMIN, deps).request(
      USER.PATH.BASE,
      json(HTTP.METHOD.DELETE, { ids: [OTHER] })
    );
    expect(calls).toEqual(["userImages", "deleteUsers", "deleteAvatars"]);
    expect(deleted).toEqual([[PREVIOUS]]);
  });
});
