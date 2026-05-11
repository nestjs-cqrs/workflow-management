import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Result } from '@turkelk/nestjs-cqrs-kernel';
import Redis from 'ioredis';
import { randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface KeycloakUserInfo {
  sub: string;
  email: string;
  preferred_username?: string;
  name?: string;
}

export interface AuthMeResponse {
  keycloakId: string;
  email: string;
  displayName: string;
  roles: string[];
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private redis: Redis;
  private keycloakUrl: string;
  private realm: string;
  private clientId: string;
  private clientSecret: string;
  private callbackUrl: string;

  constructor(private readonly config: ConfigService) {
    this.redis = new Redis({
      host: config.get('REDIS_HOST', 'localhost'),
      port: config.get<number>('REDIS_PORT', 6379),
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 5) {
          this.logger.warn('Redis connection failed after 5 retries — giving up');
          return null;
        }
        return Math.min(times * 500, 3000);
      },
      lazyConnect: true,
    });
    this.redis.on('error', (err) => {
      this.logger.warn({ err: err.message }, 'Redis connection error');
    });
    this.keycloakUrl = config.get(
      'KEYCLOAK_INTERNAL_URL',
      config.get('KEYCLOAK_URL', 'http://localhost:8080'),
    );
    this.realm = config.get('KEYCLOAK_REALM', 'autoflux');
    this.clientId = config.get('KEYCLOAK_CLIENT_ID', 'wfm-bff');
    this.clientSecret = config.get('KEYCLOAK_CLIENT_SECRET', 'change-me');
    this.callbackUrl = config.get(
      'AUTH_CALLBACK_URL',
      'http://localhost:3001/auth/callback',
    );
  }

  getLoginUrl(returnTo: string, provider?: string): string {
    const state = Buffer.from(JSON.stringify({ returnTo })).toString(
      'base64url',
    );
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.callbackUrl,
      response_type: 'code',
      scope: 'openid email profile',
      state,
    });

    if (provider) {
      params.set('kc_idp_hint', provider);
    }

    const publicUrl = this.config.get('KEYCLOAK_URL', 'http://localhost:8080');
    return `${publicUrl}/realms/${this.realm}/protocol/openid-connect/auth?${params}`;
  }

  async handleCallback(
    code: string,
    state?: string,
  ): Promise<Result<{ sessionId: string; returnTo: string }>> {
    const tokenUrl = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token`;
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.callbackUrl,
      }),
    });

    if (!response.ok) {
      return Result.unauthorized('Failed to exchange authorization code');
    }

    const tokens: TokenResponse = await response.json();
    const userInfoResult = await this.getUserInfo(tokens.access_token);
    if (!userInfoResult.isSuccess) return userInfoResult as Result<never>;

    const decoded = jwt.decode(tokens.access_token) as {
      realm_access?: { roles: string[] };
    } | null;
    const realmRoles = decoded?.realm_access?.roles ?? [];

    const sessionId = randomUUID();
    const ttl = 30 * 24 * 3600;
    const userInfo = userInfoResult.value!;

    await Promise.all([
      this.redis.set(
        `wfm:session:${sessionId}:access_token`,
        tokens.access_token,
        'EX',
        tokens.expires_in,
      ),
      this.redis.set(
        `wfm:session:${sessionId}:refresh_token`,
        tokens.refresh_token,
        'EX',
        ttl,
      ),
      this.redis.set(
        `wfm:session:${sessionId}:user`,
        JSON.stringify({
          keycloakId: userInfo.sub,
          email: userInfo.email,
          displayName:
            userInfo.name ?? userInfo.preferred_username ?? userInfo.email,
          roles: realmRoles,
        }),
        'EX',
        ttl,
      ),
    ]);

    let returnTo = '/';
    if (state) {
      try {
        const parsed = JSON.parse(
          Buffer.from(state, 'base64url').toString(),
        );
        returnTo = parsed.returnTo ?? '/';
      } catch {
        // ignore malformed state
      }
    }

    return Result.success({ sessionId, returnTo });
  }

  async getAccessToken(sessionId: string): Promise<string | null> {
    const accessToken = await this.redis.get(
      `wfm:session:${sessionId}:access_token`,
    );
    if (accessToken) return accessToken;

    const refreshResult = await this.refreshSession(sessionId);
    if (!refreshResult.isSuccess) return null;

    return this.redis.get(`wfm:session:${sessionId}:access_token`);
  }

  async getMe(sessionId: string): Promise<Result<AuthMeResponse>> {
    const userData = await this.redis.get(`wfm:session:${sessionId}:user`);
    if (!userData) {
      return Result.unauthorized('Session expired');
    }

    return Result.success(JSON.parse(userData));
  }

  async logout(sessionId: string): Promise<Result<void>> {
    const refreshToken = await this.redis.get(
      `wfm:session:${sessionId}:refresh_token`,
    );

    if (refreshToken) {
      const logoutUrl = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/logout`;
      await fetch(logoutUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          refresh_token: refreshToken,
        }),
      }).catch(() => {});
    }

    await Promise.all([
      this.redis.del(`wfm:session:${sessionId}:access_token`),
      this.redis.del(`wfm:session:${sessionId}:refresh_token`),
      this.redis.del(`wfm:session:${sessionId}:user`),
    ]);

    return Result.success(undefined);
  }

  async refreshSession(sessionId: string): Promise<Result<void>> {
    const refreshToken = await this.redis.get(
      `wfm:session:${sessionId}:refresh_token`,
    );
    if (!refreshToken) {
      return Result.unauthorized('Session expired');
    }

    const tokenUrl = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token`;
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      return Result.unauthorized('Failed to refresh token');
    }

    const tokens: TokenResponse = await response.json();
    const ttl = 30 * 24 * 3600;

    const decoded = jwt.decode(tokens.access_token) as {
      realm_access?: { roles: string[] };
    } | null;
    const newRoles = decoded?.realm_access?.roles ?? [];

    const userData = await this.redis.get(`wfm:session:${sessionId}:user`);
    if (userData) {
      const user = JSON.parse(userData);
      user.roles = newRoles;
      await this.redis.set(
        `wfm:session:${sessionId}:user`,
        JSON.stringify(user),
        'EX',
        ttl,
      );
    }

    await Promise.all([
      this.redis.set(
        `wfm:session:${sessionId}:access_token`,
        tokens.access_token,
        'EX',
        tokens.expires_in,
      ),
      this.redis.set(
        `wfm:session:${sessionId}:refresh_token`,
        tokens.refresh_token,
        'EX',
        ttl,
      ),
    ]);

    return Result.success(undefined);
  }

  private async getUserInfo(
    accessToken: string,
  ): Promise<Result<KeycloakUserInfo>> {
    const url = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/userinfo`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      return Result.unauthorized('Failed to get user info from Keycloak');
    }

    return Result.success(await response.json());
  }
}
