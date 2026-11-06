import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { MasterDataModule } from './master-data/master-data.module';
import { ScheduleModule } from '@nestjs/schedule';
import { FormulaModule } from './formula/formula.module';
import { MailModule } from './mail/mail.service';
import { UsersModule } from './users/users.module';
import { DataRequestModule } from './data-request/data-request.module';
import { CalculationModule } from './calculation/calculation.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DashboardModule } from './dashboard/dashboard.controller';
import { MinutesModule } from './minutes/minutes.controller';
import { PerformanceModule } from './performance/performance.controller';
import { RegistersModule } from './registers/registers.module';
import { HealthController } from './health/health.controller';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AuditModule,
    MasterDataModule,
    FormulaModule,
    MailModule,
    UsersModule,
    DataRequestModule,
    CalculationModule,
    DashboardModule,
    PerformanceModule,
    RegistersModule,
    MinutesModule,
    ScheduleModule.forRoot(),
    // Generous default for every route; login has its own much tighter limit (see AuthController).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 600 }]),
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
