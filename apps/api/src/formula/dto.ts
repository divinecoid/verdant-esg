import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateFormulaDto {
  @IsString() @IsNotEmpty() code: string;
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() @MaxLength(1000) expression: string;
  @IsString() @IsNotEmpty() metricId: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
export class UpdateFormulaDto extends PartialType(CreateFormulaDto) {}

export class SimulateFormulaDto {
  @IsString() @MaxLength(1000) expression: string;
  /** Values for data-input variables, keyed by attribute code. */
  @IsOptional() @IsObject() inputs?: Record<string, number>;
  /** Year used to pick emission-factor values; defaults to each factor's latest year. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1900) @Max(2200) year?: number;
}

export class CreateMetricMappingDto {
  @IsString() @IsNotEmpty() companyId: string;
  @IsArray() @ArrayNotEmpty() @ArrayUnique() @IsString({ each: true }) metricIds: string[];
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdateMetricMappingDto {
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsArray() @ArrayNotEmpty() @ArrayUnique() @IsString({ each: true }) metricIds?: string[];
}
