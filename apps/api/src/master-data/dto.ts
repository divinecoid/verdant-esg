import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { CompanyType, EsgGroup } from '@prisma/client';

const optionalString = () => (target: object, key: string) => {
  IsOptional()(target, key);
  IsString()(target, key);
};

// ---- Company -------------------------------------------------------------
export class ContactDto {
  @IsString() @IsNotEmpty() name: string;
  @optionalString() phone?: string;
  @IsOptional() @IsEmail() email?: string;
}

export class CreateCompanyDto {
  @IsString() @IsNotEmpty() code: string;
  @IsString() @IsNotEmpty() name: string;
  @IsEnum(CompanyType) type: CompanyType;
  @optionalString() sector?: string;
  @IsOptional() @IsString() parentId?: string | null;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ContactDto) contacts?: ContactDto[];
}
export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {}

// ---- Project -------------------------------------------------------------
export class CreateProjectDto {
  @IsString() @IsNotEmpty() companyId: string;
  @IsString() @IsNotEmpty() name: string;
  @optionalString() sector?: string;
  @Type(() => Number) @IsNumber() @Min(0) @Max(100) ownershipPct: number;
  @Type(() => Number) @IsNumber() @Min(0) investedCapital: number;
  @IsOptional() @IsDateString() initialInvestedAt?: string | null;
  @IsOptional() @IsDateString() closingDate?: string | null;
}
export class UpdateProjectDto extends PartialType(CreateProjectDto) {}

// ---- ESG theme / metric --------------------------------------------------
export class CreateEsgThemeDto {
  @IsString() @IsNotEmpty() code: string;
  @IsString() @IsNotEmpty() name: string;
  @IsEnum(EsgGroup) group: EsgGroup;
  @IsOptional() @IsBoolean() active?: boolean;
}
export class UpdateEsgThemeDto extends PartialType(CreateEsgThemeDto) {}

export class CreateEsgMetricDto {
  @IsString() @IsNotEmpty() code: string;
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() themeId: string;
  @optionalString() scope?: string;
  @optionalString() unit?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
export class UpdateEsgMetricDto extends PartialType(CreateEsgMetricDto) {}

// ---- Data input attribute ------------------------------------------------
export class CreateDataInputAttributeDto {
  @IsString() @IsNotEmpty() code: string;
  @IsString() @IsNotEmpty() name: string;
  @optionalString() description?: string;
  @optionalString() unit?: string;
  @IsOptional() @IsString() dataType?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
export class UpdateDataInputAttributeDto extends PartialType(CreateDataInputAttributeDto) {}

// ---- Emission factor -----------------------------------------------------
export class EmissionFactorValueDto {
  @Type(() => Number) @IsInt() @Min(1900) @Max(2200) year: number;
  @Type(() => Number) @IsNumber() value: number;
}

export class CreateEmissionFactorDto {
  @IsString() @IsNotEmpty() code: string;
  @IsString() @IsNotEmpty() name: string;
  @optionalString() description?: string;
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EmissionFactorValueDto)
  @ArrayUnique((v: EmissionFactorValueDto) => v.year)
  values?: EmissionFactorValueDto[];
}
export class UpdateEmissionFactorDto extends PartialType(CreateEmissionFactorDto) {}

// ---- Base year GHG -------------------------------------------------------
export class CreateBaseYearGhgDto {
  @IsString() @IsNotEmpty() code: string;
  @Type(() => Number) @IsInt() @Min(1900) @Max(2200) year: number;
  @Type(() => Number) @IsNumber() @Min(0) value: number;
  @IsOptional() @IsBoolean() active?: boolean;
}
export class UpdateBaseYearGhgDto extends PartialType(CreateBaseYearGhgDto) {}

// ---- General configuration ----------------------------------------------
export class CreateAppConfigDto {
  @IsString() @IsNotEmpty() code: string;
  @IsString() @IsNotEmpty() value: string;
  @optionalString() description?: string;
}
export class UpdateAppConfigDto extends PartialType(CreateAppConfigDto) {}
