import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { IsCalendarDate } from '../common/dates';
import { Frequency, RequestType, ReviewDecision } from '@prisma/client';
import { PartialType } from '@nestjs/mapped-types';

export class CreateDataRequestDto {
  @IsString() @IsNotEmpty() companyId: string;
  @IsEnum(RequestType) type: RequestType;
  @ValidateIf((o) => o.type === RequestType.PERIODIC) @IsEnum(Frequency) frequency?: Frequency;
  @IsCalendarDate() periodStart: string;
  @IsCalendarDate() periodEnd: string;
  @IsCalendarDate() dueDate: string;
  @ValidateIf((o) => o.type === RequestType.AD_HOC) @IsString() @IsNotEmpty() @MaxLength(2000) notes?: string;
}

export class ValueInputDto {
  @IsString() @IsNotEmpty() metricId: string;
  @IsOptional() @IsString() @MaxLength(500) value?: string | null;
  @IsOptional() @IsString() @MaxLength(100) dataStatus?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) description?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) comment?: string | null;
}

export class SaveValuesDto {
  @IsArray() @ArrayMaxSize(1000) @ValidateNested({ each: true }) @Type(() => ValueInputDto) values: ValueInputDto[];
  @IsOptional() @IsString() @MaxLength(2000) remarks?: string | null;
}

export class ReviewDto {
  @IsEnum(ReviewDecision) decision: ReviewDecision;
  @IsString() @IsNotEmpty() @MaxLength(2000) remarks: string;
}

export class CreateCaptureScheduleDto {
  @IsString() @IsNotEmpty() companyId: string;
  @IsEnum(Frequency) frequency: Frequency;
  @Type(() => Number) @IsInt() @Min(0) @Max(365) dueDays: number;
  @IsOptional() @IsBoolean() active?: boolean;
}
export class UpdateCaptureScheduleDto extends PartialType(CreateCaptureScheduleDto) {}
