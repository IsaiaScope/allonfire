import { prisma } from "../index";

export async function logWebhook(data: {
  endpoint: string;
  method: string;
  payload?: unknown;
  response?: unknown;
  status: number;
}) {
  return await prisma.webhookLog.create({
    data: {
      endpoint: data.endpoint,
      method: data.method,
      payload: data.payload as never,
      response: data.response as never,
      status: data.status,
    },
  });
}
