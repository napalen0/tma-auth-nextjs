"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  isChannelMember: () => isChannelMember,
  sendMessage: () => sendMessage,
  signSession: () => signSession,
  validateInitData: () => validateInitData,
  verifySession: () => verifySession
});
module.exports = __toCommonJS(index_exports);

// src/validate.ts
var import_crypto = require("crypto");
function validateInitData(initData, options) {
  const { botToken, maxAge = 86400 } = options;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");
  const entries = Array.from(params.entries());
  entries.sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");
  const secretKey = (0, import_crypto.createHmac)("sha256", "WebAppData").update(botToken).digest();
  const computedHash = (0, import_crypto.createHmac)("sha256", new Uint8Array(secretKey)).update(dataCheckString).digest("hex");
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
var import_jose = require("jose");
function encodeSecret(secret) {
  return new TextEncoder().encode(secret);
}
async function signSession(payload, config) {
  const { secret, expiresIn = "7d" } = config;
  return new import_jose.SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(expiresIn).sign(encodeSecret(secret));
}
async function verifySession(token, config) {
  try {
    const { payload } = await (0, import_jose.jwtVerify)(token, encodeSecret(config.secret));
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  isChannelMember,
  sendMessage,
  signSession,
  validateInitData,
  verifySession
});
//# sourceMappingURL=index.js.map