import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { LoggerModule } from 'nestjs-pino';
import { createPinoConfig, JwtAuthGuard, JwtStrategy, ResultInterceptor } from '@turkelk/nestjs-cqrs-kernel';
import { BffModule } from './bff/bff.module';
import { ApprovalModule } from './approval/approval.module';
import { WorkflowRegistryModule } from './workflow-registry/workflow-registry.module';
import { ResultUnwrapInterceptor } from './shared/interceptors/result-unwrap.interceptor';

@Module({
  imports: [
    LoggerModule.forRoot(createPinoConfig('workflow-management')),
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    BffModule,
    ApprovalModule,
    WorkflowRegistryModule,
  ],
  providers: [
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResultUnwrapInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResultInterceptor,
    },
  ],
})
export class AppModule {}
