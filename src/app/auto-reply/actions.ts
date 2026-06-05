"use server";

import type { AutoReplyConfig } from "@/types";

/**
 * Example Server Action — the persistence boundary for Auto Reply config.
 * Today it just echoes back; swap the body for a DB / external API call.
 * Because it is a Server Action, the client view calls it like a function
 * (no fetch boilerplate) while the secret-bearing work stays on the server.
 */
export async function saveAutoReplyConfig(
  accountId: string,
  config: AutoReplyConfig,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!accountId) return { ok: false, error: "Thiếu accountId" };
  if (config.enabled && config.prompt.trim().length < 10) {
    return { ok: false, error: "Prompt quá ngắn" };
  }
  // await db.autoReply.upsert({ where: { accountId }, data: config });
  return { ok: true };
}
