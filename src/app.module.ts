import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { LoggerModule } from 'nestjs-pino';
import { createPinoConfig, JwtAuthGuard, JwtStrategy } from '@turkelk/nestjs-cqrs-kernel';
import { BffModule } from './bff/bff.module';
import { ApprovalModule } from './approval/approval.module';

@Module({
  imports: [
    LoggerModule.forRoot(createPinoConfig('workflow-management')),
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    BffModule,
    ApprovalModule,
  ],
  providers: [
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
