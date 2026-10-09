import { CONTENT_TYPE } from "@allonfire/core/features/http/constants/http";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { prisma } from "@allonfire/database";
import { App } from "@allonfire/database/enums";
import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint, sessionMiddleware } from "better-auth/api";
import { APP_HEADER } from "../../../shared/constants/headers";
import { JOIN_APP_PATH } from "../../../shared/constants/paths";
import { JOIN_APP_DOC } from "../constants/openapi";
import { registrationClosed, registrationFor } from "../utils/registration";

/**
 * `POST /join-app`: a signed-in User joins the App named in `x-aof-app`, when
 * it is open to Registration. A Membership already there is left alone, so a
 * Role is never lowered.
 */
export const joinApp = {
  endpoints: {
    joinApp: createAuthEndpoint(
      JOIN_APP_PATH,
      {
        // Better Auth documents a plugin's endpoint only from this; without
        // it the reference lists the error answers and no success.
        metadata: {
          openapi: {
            description: JOIN_APP_DOC.DESCRIPTION,
            operationId: "joinApp",
            parameters: [
              {
                description: JOIN_APP_DOC.APP_HEADER,
                in: "header",
                name: APP_HEADER,
                required: true,
                schema: { enum: objectValues(App), type: "string" },
              },
            ],
            responses: {
              "200": {
                content: {
                  [CONTENT_TYPE.JSON]: {
                    schema: {
                      properties: {
                        app: { enum: objectValues(App), type: "string" },
                      },
                      required: ["app"],
                      type: "object",
                    },
                  },
                },
                description: JOIN_APP_DOC.OK,
              },
            },
          },
        },
        method: "POST",
        requireHeaders: true,
        use: [sessionMiddleware],
      },
      async (ctx) => {
        const registration = registrationFor(ctx.headers);
        if (!registration) {
          throw registrationClosed();
        }
        const userId = ctx.context.session.user.id;
        await prisma.membership.upsert({
          create: { ...registration, userId },
          update: {},
          where: { userId_app: { app: registration.app, userId } },
        });
        return ctx.json({ app: registration.app });
      }
    ),
  },
  id: "aof-join-app",
} satisfies BetterAuthPlugin;
