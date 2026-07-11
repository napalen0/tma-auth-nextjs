// src/validate.ts
import { createHmac } from "crypto";
function validateInitData(initData, options) {
  const { botToken, maxAge = 86400 } = options;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");
  const entries = Array.from(params.entries());
  entries.sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = createHmac("sha256", new Uint8Array(secretKey)).update(dataCheckString).digest("hex");
  if (computedHash !== hash) return null;
  const authDate = parseInt(params.get("auth_date") || "0", 10);
  const now = Math.floor(Date.now() / 1e3);
  if (maxAge > 0 && now - authDate > maxAge) return null;
  const userStr = params.get("user");
  if (!userStr) return null;
  let user;
  try {
    user = JSON.parse(userStr);
  } catch {
    return null;
  }
  return {
    user,
    authDate,
    hash,
    startParam: params.get("start_param") || void 0,
    chatType: params.get("chat_type") || void 0,
    chatInstance: params.get("chat_instance") || void 0
  };
}

// src/session.ts
import { SignJWT, jwtVerify } from "jose";
function encodeSecret(secret) {
  return new TextEncoder().encode(secret);
}
async function signSession(payload, config) {
  const { secret, expiresIn = "7d" } = config;
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(expiresIn).sign(encodeSecret(secret));
}
async function verifySession(token, config) {
  try {
    const { payload } = await jwtVerify(token, encodeSecret(config.secret));
    return payload;
  } catch {
    return null;
  }
}

// src/telegram.ts
async function isChannelMember(channel, telegramId, options) {
  try {
    const url = `https://api.telegram.org/bot${options.botToken}/getChatMember?chat_id=${encodeURIComponent(channel)}&user_id=${telegramId}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.ok) return false;
    const status = data.result?.status;
    return status === "member" || status === "administrator" || status === "creator";
  } catch {
    return false;
  }
}
async function sendMessage(chatId, text, options) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${options.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options.parseMode ?? "HTML",
        link_preview_options: { is_disabled: options.disableLinkPreview ?? true },
        ...options.button && {
          reply_markup: { inline_keyboard: [[options.button]] }
        }
      })
    });
    if (res.ok) {
      const data2 = await res.json().catch(() => ({}));
      return { ok: true, blocked: false, messageId: data2?.result?.message_id };
    }
    const data = await res.json().catch(() => ({}));
    const blocked = res.status === 403 || res.status === 400 && /not found|blocked|deactivated/i.test(data?.description || "");
    return { ok: false, blocked };
  } catch {
    return { ok: false, blocked: false };
  }
}
export {
  isChannelMember,
  sendMessage,
  signSession,
  validateInitData,
  verifySession
};
//# sourceMappingURL=index.mjs.map