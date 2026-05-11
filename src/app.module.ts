import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { createPinoConfig } from '@turkelk/nestjs-cqrs-kernel';
import { ApprovalModule } from './approval/approval.module';

@Module({
  imports: [
    LoggerModule.forRoot(createPinoConfig('workflow-management')),
    ConfigModule.forRoot({ isGlobal: true }),
    ApprovalModule,
  ],
})
export class AppModule {}
