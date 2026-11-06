import { Module } from '@nestjs/common';
import { createCrudController } from '../common/crud.controller';
import * as dto from './dto';
import { FormulaSimulateController } from './formula-simulate.controller';
import { FormulaService } from './formula.service';
import { MetricMappingService } from './metric-mapping.service';

const resources = [
  { path: 'formulas', service: FormulaService, createDto: dto.CreateFormulaDto, updateDto: dto.UpdateFormulaDto },
  {
    path: 'metric-mappings',
    service: MetricMappingService,
    createDto: dto.CreateMetricMappingDto,
    updateDto: dto.UpdateMetricMappingDto,
  },
];

@Module({
  // The simulate route is listed first so `POST formulas/simulate` is never read as `POST formulas/:id`.
  controllers: [FormulaSimulateController, ...resources.map(createCrudController)],
  providers: [FormulaService, MetricMappingService],
  exports: [FormulaService, MetricMappingService],
})
export class FormulaModule {}
