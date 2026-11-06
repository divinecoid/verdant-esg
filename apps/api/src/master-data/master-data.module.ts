import { Module } from '@nestjs/common';
import { createCrudController } from '../common/crud.controller';
import * as dto from './dto';
import * as svc from './services';

const resources = [
  { path: 'companies', service: svc.CompaniesService, createDto: dto.CreateCompanyDto, updateDto: dto.UpdateCompanyDto },
  { path: 'projects', service: svc.ProjectsService, createDto: dto.CreateProjectDto, updateDto: dto.UpdateProjectDto },
  { path: 'esg-themes', service: svc.EsgThemesService, createDto: dto.CreateEsgThemeDto, updateDto: dto.UpdateEsgThemeDto },
  { path: 'esg-metrics', service: svc.EsgMetricsService, createDto: dto.CreateEsgMetricDto, updateDto: dto.UpdateEsgMetricDto },
  {
    path: 'data-input-attributes',
    service: svc.DataInputAttributesService,
    createDto: dto.CreateDataInputAttributeDto,
    updateDto: dto.UpdateDataInputAttributeDto,
  },
  {
    path: 'emission-factors',
    service: svc.EmissionFactorsService,
    createDto: dto.CreateEmissionFactorDto,
    updateDto: dto.UpdateEmissionFactorDto,
  },
  { path: 'base-year-ghg', service: svc.BaseYearGhgService, createDto: dto.CreateBaseYearGhgDto, updateDto: dto.UpdateBaseYearGhgDto },
  { path: 'configs', service: svc.AppConfigService, createDto: dto.CreateAppConfigDto, updateDto: dto.UpdateAppConfigDto },
];

@Module({
  controllers: resources.map(createCrudController),
  providers: resources.map((r) => r.service),
})
export class MasterDataModule {}
