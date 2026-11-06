import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { ComplianceStatus, FindingStatus, IncidentStatus, RiskStatus, Severity, TargetDirection } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { IsCalendarDate } from '../common/dates';

const text = (max: number) => (target: object, key: string) => {
  IsString()(target, key);
  IsNotEmpty()(target, key);
  MaxLength(max)(target, key);
};
const optionalText = (max: number) => (target: object, key: string) => {
  IsOptional()(target, key);
  IsString()(target, key);
  MaxLength(max)(target, key);
};

export class CreateTargetDto {
  @IsString() @IsNotEmpty() metricId: string;
  @IsString() @IsNotEmpty() companyId: string;
  @Type(() => Number) @IsInt() @Min(1900) @Max(2200) year: number;
  @Type(() => Number) @IsNumber() value: number;
  @IsEnum(TargetDirection) direction: TargetDirection;
}
export class UpdateTargetDto extends PartialType(CreateTargetDto) {}

export class CreateIncidentDto {
  @IsString() @IsNotEmpty() companyId: string;
  @IsCalendarDate() occurredAt: string;
  @text(100) type: string;
  @IsEnum(Severity) severity: Severity;
  @text(2000) description: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) lostDays?: number | null;
  @IsOptional() @IsEnum(IncidentStatus) status?: IncidentStatus;
}
export class UpdateIncidentDto extends PartialType(CreateIncidentDto) {}

export class CreateFindingDto {
  @IsString() @IsNotEmpty() companyId: string;
  @text(100) source: string;
  @IsCalendarDate() reportedAt: string;
  @IsEnum(Severity) severity: Severity;
  @text(2000) description: string;
  @optionalText(200) owner?: string | null;
  @IsOptional() @IsCalendarDate() dueDate?: string | null;
  @IsOptional() @IsEnum(FindingStatus) status?: FindingStatus;
}
export class UpdateFindingDto extends PartialType(CreateFindingDto) {}

export class CreateRiskDto {
  @IsString() @IsNotEmpty() companyId: string;
  @text(200) title: string;
  @text(100) category: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) likelihood: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) impact: number;
  @optionalText(200) owner?: string | null;
  @optionalText(2000) mitigation?: string | null;
  @IsOptional() @IsEnum(RiskStatus) status?: RiskStatus;
  @IsOptional() @IsCalendarDate() reviewDate?: string | null;
}
export class UpdateRiskDto extends PartialType(CreateRiskDto) {}

export class CreateComplianceDto {
  @IsString() @IsNotEmpty() companyId: string;
  @text(200) regulation: string;
  @text(1000) requirement: string;
  @IsOptional() @IsEnum(ComplianceStatus) status?: ComplianceStatus;
  @IsOptional() @IsCalendarDate() dueDate?: string | null;
  @IsOptional() @IsCalendarDate() lastReviewedAt?: string | null;
  @optionalText(2000) notes?: string | null;
}
export class UpdateComplianceDto extends PartialType(CreateComplianceDto) {}
