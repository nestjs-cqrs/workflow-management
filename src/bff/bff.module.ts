import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { CookieToBearerMiddleware } from './middleware/cookie-to-bearer.middleware';
import { RolesGuard } from './guards/roles.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, RolesGuard],
  exports: [AuthService, RolesGuard],
})
export class BffModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CookieToBearerMiddleware).forRoutes('*');
  }
}
