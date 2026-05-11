import { Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Public } from '@turkelk/nestjs-cqrs-kernel';
import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly cookieName = 'wfm_session';
  private readonly isProduction: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {
    this.isProduction = config.get('NODE_ENV') === 'production';
  }

  @Public()
  @Get('login')
  @ApiOperation({ summary: 'Redirect to Keycloak login' })
  login(
    @Query('returnTo') returnTo: string = '/',
    @Query('provider') provider: string | undefined,
    @Res() res: Response,
  ) {
    const loginUrl = this.authService.getLoginUrl(returnTo, provider);
    res.redirect(loginUrl);
  }

  @Public()
  @Get('callback')
  @ApiExcludeEndpoint()
  async callback(
    @Query('code') code: string,
    @Query('state') state: string | undefined,
    @Res() res: Response,
  ) {
    if (!code) {
      res.status(401).json({ message: 'Missing authorization code' });
      return;
    }

    const result = await this.authService.handleCallback(code, state);
    if (!result.isSuccess) {
      res.status(401).json({ message: result.errorMessage });
      return;
    }

    const { sessionId, returnTo } = result.value!;

    res.cookie(this.cookieName, sessionId, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 3600 * 1000,
    });

    const frontendUrl = this.config.get(
      'FRONTEND_URL',
      'http://localhost:5174',
    );
    res.redirect(`${frontendUrl}${returnTo}`);
  }

  @Public()
  @Get('me')
  @ApiOperation({ summary: 'Get current user info and roles' })
  async me(@Req() req: Request, @Res() res: Response) {
    const sessionId = req.cookies?.[this.cookieName];
    if (!sessionId) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const result = await this.authService.getMe(sessionId);
    if (!result.isSuccess) {
      res.status(401).json({ message: result.errorMessage });
      return;
    }

    res.json(result.value);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Req() req: Request, @Res() res: Response) {
    const sessionId = req.cookies?.[this.cookieName];
    if (!sessionId) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    const result = await this.authService.refreshSession(sessionId);
    if (!result.isSuccess) {
      res.status(401).json({ message: result.errorMessage });
      return;
    }

    res.json({ message: 'Token refreshed' });
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Logout and clear session' })
  async logout(@Req() req: Request, @Res() res: Response) {
    const sessionId = req.cookies?.[this.cookieName];
    if (sessionId) {
      await this.authService.logout(sessionId);
    }

    res.clearCookie(this.cookieName, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      path: '/',
    });

    res.json({ message: 'Logged out' });
  }
}
