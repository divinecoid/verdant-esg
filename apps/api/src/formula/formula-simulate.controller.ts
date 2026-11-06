import { Body, Controller, Post } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../common/roles.decorator';
import { SimulateFormulaDto } from './dto';
import { FormulaService } from './formula.service';

@Controller('formulas/simulate')
export class FormulaSimulateController {
  constructor(private readonly formulas: FormulaService) {}

  @Post()
  @Roles(Role.ESG_TEAM)
  simulate(@Body() dto: SimulateFormulaDto) {
    return this.formulas.simulate(dto.expression, dto.inputs, dto.year);
  }
}
