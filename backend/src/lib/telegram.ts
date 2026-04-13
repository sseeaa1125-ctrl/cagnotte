import * as logger from "./logger.js";

const TELEGRAM_API = "https://api.telegram.org/bot";

export class TelegramService {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async call(method: string, params?: Record<string, unknown>, retries = 1): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000); // 10s timeout
    const res = await fetch(`${TELEGRAM_API}${this.token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: params ? JSON.stringify(params) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json() as { ok: boolean; result?: unknown; description?: string; parameters?: { retry_after?: number } };
    if (!data.ok) {
      // Rate limit : attendre et réessayer une fois
      if (data.parameters?.retry_after && retries > 0) {
        const wait = (data.parameters.retry_after + 1) * 1000;
        logger.warn(`[Telegram] Rate limited on ${method}, retrying in ${wait}ms...`);
        await new Promise((r) => setTimeout(r, wait));
        return this.call(method, params, retries - 1);
      }
      logger.error(`Telegram API error [${method}]`, new Error(data.description || "Unknown error"));
      throw new Error(data.description || "Erreur API Telegram");
    }
    return data.result;
  }

  /** Vérifier que le token est valide */
  async getMe(): Promise<{ id: number; is_bot: boolean; first_name: string; username: string }> {
    return this.call("getMe") as Promise<{ id: number; is_bot: boolean; first_name: string; username: string }>;
  }

  /** Infos sur le groupe/channel */
  async getChat(chatId: number | string): Promise<{
    id: number;
    type: string;
    title?: string;
    username?: string;
  }> {
    return this.call("getChat", { chat_id: chatId }) as Promise<{
      id: number;
      type: string;
      title?: string;
      username?: string;
    }>;
  }

  /** Vérifier le statut d'un membre dans le groupe */
  async getChatMember(chatId: number | string, userId: number): Promise<{
    status: string;
    can_invite_users?: boolean;
    can_restrict_members?: boolean;
  }> {
    return this.call("getChatMember", { chat_id: chatId, user_id: userId }) as Promise<{
      status: string;
      can_invite_users?: boolean;
      can_restrict_members?: boolean;
    }>;
  }

  /** Générer un lien d'invitation unique (1 utilisation, expire en 24h) */
  async createInviteLink(chatId: number | string): Promise<{ invite_link: string }> {
    return this.call("createChatInviteLink", {
      chat_id: chatId,
      member_limit: 1,
      expire_date: Math.floor(Date.now() / 1000) + 86400, // 24h
    }) as Promise<{ invite_link: string }>;
  }

  /** Révoquer un lien d'invitation */
  async revokeInviteLink(chatId: number | string, inviteLink: string): Promise<unknown> {
    return this.call("revokeChatInviteLink", {
      chat_id: chatId,
      invite_link: inviteLink,
    });
  }

  /** Exclure un membre (ban puis unban pour permettre de rejoindre plus tard) */
  async banMember(chatId: number | string, userId: number | string): Promise<void> {
    await this.call("banChatMember", { chat_id: chatId, user_id: userId });
    // B4: Unban avec retry pour éviter un ban permanent si le réseau échoue
    await new Promise((resolve) => setTimeout(resolve, 500));
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await this.call("unbanChatMember", {
          chat_id: chatId,
          user_id: userId,
          only_if_banned: true,
        });
        return;
      } catch (err) {
        if (attempt === 2) {
          logger.error(`[Telegram] unban échoué après 3 tentatives chatId=${chatId} userId=${userId}`, err);
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  /** Envoyer un message à un utilisateur (via le bot en DM) */
  async sendMessage(chatId: number | string, text: string): Promise<unknown> {
    return this.call("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    });
  }

  /** Compter les membres du groupe */
  async getChatMemberCount(chatId: number | string): Promise<number> {
    return this.call("getChatMemberCount", { chat_id: chatId }) as Promise<number>;
  }

  /** Récupérer les updates récentes (pour détecter les groupes où le bot a été ajouté) */
  async getUpdates(offset?: number): Promise<Array<{
    update_id: number;
    my_chat_member?: {
      chat: { id: number; type: string; title?: string; username?: string };
      new_chat_member: { status: string };
    };
  }>> {
    return this.call("getUpdates", {
      allowed_updates: ["my_chat_member"],
      ...(offset !== undefined && { offset }),
    }) as Promise<Array<{
      update_id: number;
      my_chat_member?: {
        chat: { id: number; type: string; title?: string; username?: string };
        new_chat_member: { status: string };
      };
    }>>;
  }

  /** Configurer le webhook Telegram pour recevoir les événements chat_member */
  async setWebhook(url: string, secretToken?: string): Promise<unknown> {
    return this.call("setWebhook", {
      url,
      secret_token: secretToken,
      allowed_updates: ["chat_member", "message", "channel_post"],
    });
  }

  /** Supprimer le webhook */
  async deleteWebhook(): Promise<unknown> {
    return this.call("deleteWebhook", { drop_pending_updates: true });
  }
}
