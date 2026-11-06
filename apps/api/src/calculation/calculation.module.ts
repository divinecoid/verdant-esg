import { Module } from '@nestjs/common';
import { FormulaModule } from '../formula/formula.module';
import { ReportController } from '../report/report.controller';
import { ReportService } from '../report/report.service';
import { CalculationController } from './calculation.controller';
import { CalculationService } from './calculation.service';

@Module({
  imports: [FormulaModule],
  controllers: [CalculationController, ReportController],
  providers: [CalculationService, ReportService],
})
export class CalculationModule {}
