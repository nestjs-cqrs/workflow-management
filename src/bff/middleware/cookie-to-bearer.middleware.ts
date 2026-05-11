import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

@Injectable()
export class CookieToBearerMiddleware implements NestMiddleware {
  constructor(private readonly authService: AuthService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const sessionId = req.cookies?.['wfm_session'];
    if (sessionId && !req.headers.authorization) {
      const accessToken = await this.authService.getAccessToken(sessionId);
      if (accessToken) {
        req.headers.authorization = `Bearer ${accessToken}`;
      }
    }
    next();
  }
}
