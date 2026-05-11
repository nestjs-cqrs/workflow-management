import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { createPinoConfig } from '@turkelk/nestjs-cqrs-kernel';
import { ApprovalModule } from './approval/approval.module';

@Module({
  imports: [
    LoggerModule.forRoot(createPinoConfig('workflow-management')),
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get('DB_USERNAME', 'autoflux'),
        password: config.get('DB_PASSWORD', 'autoflux'),
        database: config.get('DB_DATABASE', 'autoflux'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    ApprovalModule,
  ],
})
export class AppModule {}
