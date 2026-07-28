import { SPELL_CREATION_WEEKLY_LIMIT } from "../shared/constants";

interface RedisResponse<T = unknown> {
  result: T;
}

class RedisService {
  private url: string;
  private token: string;

  constructor() {
    const upstashUrl = process.env.UPSTASH_REDIS_URL || "";
    const upstashToken = process.env.UPSTASH_REDIS_TOKEN || "";

    if (!upstashUrl || !upstashToken) {
      console.warn(
        "[Redis] Upstash credentials not configured. Rate limiting will be disabled."
      );
    }

    this.url = upstashUrl;
    this.token = upstashToken;
  }

  private async request<T = unknown>(command: string[]): Promise<T | null> {
    if (!this.url || !this.token) {
      return null;
    }

    try {
      const response = await fetch(this.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        console.error(
          `[Redis] Request failed: ${response.status} ${response.statusText}`
        );
        return null;
      }

      const data = (await response.json()) as RedisResponse<T>;
      return data.result;
    } catch (error) {
      console.error(`[Redis] Request error:`, error);
      return null;
    }
  }

  async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
  ): Promise<boolean> {
    const current = (await this.request<number>(["INCR", key])) || 0;

    if (current === 1) {
      await this.request(["EXPIRE", key, windowSeconds.toString()]);
    }

    return current <= limit;
  }

  async getRateLimitCounter(key: string): Promise<number> {
    return (await this.request<number>(["GET", key])) || 0;
  }

  async getWeeklySpellSlots(userId: number): Promise<number> {
    const key = `lab:slots:weekly:${userId}`;
    const used = (await this.request<number>(["GET", key])) || 0;
    return Math.max(0, SPELL_CREATION_WEEKLY_LIMIT - used);
  }

  async incrementWeeklySpellCount(userId: number): Promise<number> {
    const key = `lab:slots:weekly:${userId}`;
    const count = (await this.request<number>(["INCR", key])) || 1;

    if (count === 1) {
      await this.request(["EXPIRE", key, "604800"]);
    }

    return count;
  }

  async resetWeeklySpellCount(userId: number): Promise<void> {
    const key = `lab:slots:weekly:${userId}`;
    await this.request(["DEL", key]);
  }

  async setResearchStatus(
    spellId: string,
    status: "researching" | "ready",
    startTime?: number
  ): Promise<void> {
    const key = `lab:research:${spellId}`;
    const value = JSON.stringify({
      status,
      startTime: startTime || Date.now(),
    });
    await this.request(["SET", key, value, "EX", "86400"]);
  }

  async getResearchStatus(
    spellId: string
  ): Promise<{ status: string; startTime: number } | null> {
    const key = `lab:research:${spellId}`;
    const value = await this.request<string>(["GET", key]);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  async setBattleState(battleId: string, state: unknown): Promise<void> {
    const key = `battle:session:${battleId}`;
    const value = JSON.stringify(state);
    await this.request(["SET", key, value, "EX", "3600"]);
  }

  async getBattleState(battleId: string): Promise<unknown | null> {
    const key = `battle:session:${battleId}`;
    const value = await this.request<string>(["GET", key]);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  async deleteBattleState(battleId: string): Promise<void> {
    const key = `battle:session:${battleId}`;
    await this.request(["DEL", key]);
  }

  async addToMatchmakingQueue(
    userId: number,
    score: number = Date.now()
  ): Promise<void> {
    const key = "battle:queue:brawl";
    await this.request(["ZADD", key, score.toString(), userId.toString()]);
  }

  async removeFromMatchmakingQueue(userId: number): Promise<void> {
    const key = "battle:queue:brawl";
    await this.request(["ZREM", key, userId.toString()]);
  }

  async getNextFromQueue(): Promise<number | null> {
    const key = "battle:queue:brawl";
    const result = (await this.request<[string, string][]>([
      "ZRANGE",
      key,
      "0",
      "0",
      "WITHSCORES",
    ])) || [];

    if (result.length === 0) return null;
    const userId = parseInt(result[0][0], 10);
    await this.removeFromMatchmakingQueue(userId);
    return userId;
  }

  async getQueueSize(): Promise<number> {
    const key = "battle:queue:brawl";
    return (await this.request<number>(["ZCARD", key])) || 0;
  }

  async setSession(
    userId: number,
    data: unknown,
    expiresIn: number = 86400
  ): Promise<void> {
    const key = `session:${userId}`;
    const value = JSON.stringify(data);
    await this.request(["SET", key, value, "EX", expiresIn.toString()]);
  }

  async getSession(userId: number): Promise<unknown | null> {
    const key = `session:${userId}`;
    const value = await this.request<string>(["GET", key]);
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  async deleteSession(userId: number): Promise<void> {
    const key = `session:${userId}`;
    await this.request(["DEL", key]);
  }
}

let redisService: RedisService | null = null;

export function getRedisService(): RedisService {
  if (!redisService) {
    redisService = new RedisService();
  }
  return redisService;
}
