/**
 * Starter ESG catalog: themes, metrics, emission factors and formulas covering the three pillars.
 *
 * Disclosure references are GRI Standards codes (plus "IFRS S2" on climate metrics); add POJK 51/2017 or other
 * references per metric in ESG Configuration. Emission factors are INDICATIVE defaults in kg CO2-e per unit:
 * replace them with the official factor for your reporting year before anything is published.
 */
export type Group = 'ENVIRONMENTAL' | 'SOCIAL' | 'GOVERNANCE';
export type Aggregation = 'SUM' | 'AVERAGE' | 'LATEST';

export interface CatalogTheme { code: string; name: string; group: Group }
export interface CatalogMetric {
  code: string;
  name: string;
  theme: string;
  /** What the company enters; omitted for yes/no or free-text answers. */
  unit?: string;
  /** Set when a formula converts the entry into another unit (e.g. kWh → tCO2-e). */
  resultUnit?: string;
  scope?: string;
  aggregation?: Aggregation;
  refs?: string[];
}

export const themes: CatalogTheme[] = [
  { code: 'ENV-ENERGY', name: 'Energy & Electricity', group: 'ENVIRONMENTAL' },
  { code: 'ENV-GHG', name: 'Greenhouse Gas Emissions', group: 'ENVIRONMENTAL' },
  { code: 'ENV-WATER', name: 'Water', group: 'ENVIRONMENTAL' },
  { code: 'ENV-WASTE', name: 'Waste', group: 'ENVIRONMENTAL' },
  { code: 'SOC-OHS', name: 'Occupational Health & Safety', group: 'SOCIAL' },
  { code: 'SOC-EMP', name: 'Employee Welfare', group: 'SOCIAL' },
  { code: 'SOC-RIGHTS', name: 'Working Hours & Worker Rights', group: 'SOCIAL' },
  { code: 'SOC-DEI', name: 'Diversity & Inclusion', group: 'SOCIAL' },
  { code: 'SOC-COMM', name: 'Community Relations', group: 'SOCIAL' },
  { code: 'GOV-ANTICORR', name: 'Anti-corruption & Anti-bribery', group: 'GOVERNANCE' },
  { code: 'GOV-COMPLY', name: 'Regulatory Compliance', group: 'GOVERNANCE' },
  { code: 'GOV-RISK', name: 'Audit & Risk Management', group: 'GOVERNANCE' },
  { code: 'GOV-POLICY', name: 'Corporate Policies', group: 'GOVERNANCE' },
  { code: 'GOV-FIN', name: 'Financial Reporting Transparency', group: 'GOVERNANCE' },
];

export const metrics: CatalogMetric[] = [
  // Environmental – energy (calculated into emissions)
  { code: 'E-EN-01', name: 'Electricity purchased', theme: 'ENV-ENERGY', unit: 'kWh', resultUnit: 'tCO2-e', scope: 'Scope 2', refs: ['GRI 302-1', 'GRI 305-2', 'IFRS S2'] },
  { code: 'E-EN-02', name: 'Diesel consumption', theme: 'ENV-ENERGY', unit: 'litres', resultUnit: 'tCO2-e', scope: 'Scope 1', refs: ['GRI 302-1', 'GRI 305-1', 'IFRS S2'] },
  { code: 'E-EN-03', name: 'Gasoline consumption', theme: 'ENV-ENERGY', unit: 'litres', resultUnit: 'tCO2-e', scope: 'Scope 1', refs: ['GRI 302-1', 'GRI 305-1', 'IFRS S2'] },
  { code: 'E-EN-04', name: 'LPG consumption', theme: 'ENV-ENERGY', unit: 'kg', resultUnit: 'tCO2-e', scope: 'Scope 1', refs: ['GRI 302-1', 'GRI 305-1', 'IFRS S2'] },
  { code: 'E-EN-05', name: 'Renewable electricity share', theme: 'ENV-ENERGY', unit: '%', aggregation: 'AVERAGE', refs: ['GRI 302-1'] },
  { code: 'E-EN-06', name: 'Total energy consumption', theme: 'ENV-ENERGY', unit: 'MWh', refs: ['GRI 302-1'] },
  { code: 'E-GHG-01', name: 'Business air travel', theme: 'ENV-GHG', unit: 'passenger-km', resultUnit: 'tCO2-e', scope: 'Scope 3', refs: ['GRI 305-3', 'IFRS S2'] },
  // Environmental – water & waste
  { code: 'E-WA-01', name: 'Water withdrawal', theme: 'ENV-WATER', unit: 'm3', refs: ['GRI 303-3'] },
  { code: 'E-WA-02', name: 'Water recycled and reused', theme: 'ENV-WATER', unit: 'm3', refs: ['GRI 303-3'] },
  { code: 'E-WA-03', name: 'Water discharged', theme: 'ENV-WATER', unit: 'm3', refs: ['GRI 303-4'] },
  { code: 'E-WS-01', name: 'Total waste generated', theme: 'ENV-WASTE', unit: 'tonnes', refs: ['GRI 306-3'] },
  { code: 'E-WS-02', name: 'Hazardous waste generated', theme: 'ENV-WASTE', unit: 'tonnes', refs: ['GRI 306-3'] },
  { code: 'E-WS-03', name: 'Waste diverted from disposal', theme: 'ENV-WASTE', unit: 'tonnes', refs: ['GRI 306-4'] },
  { code: 'E-WS-04', name: 'Waste directed to disposal', theme: 'ENV-WASTE', unit: 'tonnes', refs: ['GRI 306-5'] },
  // Social
  { code: 'S-OH-01', name: 'Lost-time injuries', theme: 'SOC-OHS', unit: 'count', refs: ['GRI 403-9'] },
  { code: 'S-OH-02', name: 'Work-related fatalities', theme: 'SOC-OHS', unit: 'count', refs: ['GRI 403-9'] },
  { code: 'S-OH-03', name: 'Hours worked', theme: 'SOC-OHS', unit: 'hours', refs: ['GRI 403-9'] },
  { code: 'S-OH-04', name: 'Near-miss reports', theme: 'SOC-OHS', unit: 'count' },
  { code: 'S-OH-05', name: 'Health and safety training hours', theme: 'SOC-OHS', unit: 'hours', refs: ['GRI 403-5'] },
  { code: 'S-EM-01', name: 'Total employees', theme: 'SOC-EMP', unit: 'headcount', aggregation: 'LATEST', refs: ['GRI 2-7'] },
  { code: 'S-EM-02', name: 'Employee turnover rate', theme: 'SOC-EMP', unit: '%', aggregation: 'AVERAGE', refs: ['GRI 401-1'] },
  { code: 'S-EM-03', name: 'Average training hours per employee', theme: 'SOC-EMP', unit: 'hours', aggregation: 'AVERAGE', refs: ['GRI 404-1'] },
  { code: 'S-EM-04', name: 'Employees covered by health insurance', theme: 'SOC-EMP', unit: '%', aggregation: 'LATEST', refs: ['GRI 401-2'] },
  { code: 'S-RT-01', name: 'Employees paid at or above minimum wage', theme: 'SOC-RIGHTS', unit: '%', aggregation: 'LATEST', refs: ['GRI 202-1'] },
  { code: 'S-RT-02', name: 'Average weekly working hours', theme: 'SOC-RIGHTS', unit: 'hours', aggregation: 'AVERAGE' },
  { code: 'S-RT-03', name: 'Worker grievances received', theme: 'SOC-RIGHTS', unit: 'count', refs: ['GRI 2-25'] },
  { code: 'S-DI-01', name: 'Women in workforce', theme: 'SOC-DEI', unit: '%', aggregation: 'LATEST', refs: ['GRI 405-1'] },
  { code: 'S-DI-02', name: 'Women in management positions', theme: 'SOC-DEI', unit: '%', aggregation: 'LATEST', refs: ['GRI 405-1'] },
  { code: 'S-DI-03', name: 'Employees with disabilities', theme: 'SOC-DEI', unit: '%', aggregation: 'LATEST', refs: ['GRI 405-1'] },
  { code: 'S-CM-01', name: 'Community investment', theme: 'SOC-COMM', unit: 'IDR', refs: ['GRI 413-1'] },
  { code: 'S-CM-02', name: 'Community engagement programmes', theme: 'SOC-COMM', unit: 'count', refs: ['GRI 413-1'] },
  { code: 'S-CM-03', name: 'Community complaints received', theme: 'SOC-COMM', unit: 'count' },
  // Governance
  { code: 'G-AC-01', name: 'Confirmed incidents of corruption', theme: 'GOV-ANTICORR', unit: 'count', refs: ['GRI 205-3'] },
  { code: 'G-AC-02', name: 'Employees trained on anti-corruption', theme: 'GOV-ANTICORR', unit: '%', aggregation: 'LATEST', refs: ['GRI 205-2'] },
  { code: 'G-AC-03', name: 'Anti-bribery policy in place', theme: 'GOV-ANTICORR', refs: ['GRI 2-23'] },
  { code: 'G-CP-01', name: 'Significant fines and sanctions', theme: 'GOV-COMPLY', unit: 'IDR', refs: ['GRI 2-27'] },
  { code: 'G-CP-02', name: 'Non-compliance cases with laws and regulations', theme: 'GOV-COMPLY', unit: 'count', refs: ['GRI 2-27'] },
  { code: 'G-AR-01', name: 'Internal audits completed', theme: 'GOV-RISK', unit: 'count' },
  { code: 'G-AR-02', name: 'Open critical audit findings', theme: 'GOV-RISK', unit: 'count', aggregation: 'LATEST' },
  { code: 'G-AR-03', name: 'Risk register reviewed in the period', theme: 'GOV-RISK' },
  { code: 'G-PL-01', name: 'Sustainability policy approved by the board', theme: 'GOV-POLICY', refs: ['GRI 2-23'] },
  { code: 'G-PL-02', name: 'Employees who acknowledged the code of conduct', theme: 'GOV-POLICY', unit: '%', aggregation: 'LATEST', refs: ['GRI 2-23'] },
  { code: 'G-PL-03', name: 'Whistleblowing reports received', theme: 'GOV-POLICY', unit: 'count', refs: ['GRI 2-26'] },
  { code: 'G-FN-01', name: 'Financial statements audited by an external auditor', theme: 'GOV-FIN', refs: ['GRI 2-5'] },
  { code: 'G-FN-02', name: "External auditor's opinion", theme: 'GOV-FIN', refs: ['GRI 2-5'] },
];

export const attributes = [
  { code: 'di_electricity_kwh', name: 'Electricity purchased', unit: 'kWh' },
  { code: 'di_diesel_litres', name: 'Diesel consumed', unit: 'litres' },
  { code: 'di_gasoline_litres', name: 'Gasoline consumed', unit: 'litres' },
  { code: 'di_lpg_kg', name: 'LPG consumed', unit: 'kg' },
  { code: 'di_air_passenger_km', name: 'Air travel', unit: 'passenger-km' },
];

const NOTE = 'Indicative default value; replace with the official factor for your reporting year before publishing.';
/** `year` is the first year the value applies to; later years use it until a newer value is added. */
export const emissionFactors = [
  { code: 'EF_GRID_ELEC', name: 'Grid electricity (kg CO2-e per kWh)', description: NOTE, year: 2020, value: 0.87 },
  { code: 'EF_DIESEL', name: 'Diesel (kg CO2-e per litre)', description: NOTE, year: 2020, value: 2.68 },
  { code: 'EF_GASOLINE', name: 'Gasoline (kg CO2-e per litre)', description: NOTE, year: 2020, value: 2.31 },
  { code: 'EF_LPG', name: 'LPG (kg CO2-e per kg)', description: NOTE, year: 2020, value: 2.99 },
  { code: 'EF_AIR_TRAVEL', name: 'Air travel (kg CO2-e per passenger-km)', description: NOTE, year: 2020, value: 0.15 },
];

/** kg → tonnes via "/ 1000"; each formula feeds its metric's single data input. */
export const formulas = [
  { code: 'F-EN-01', name: 'Electricity → tCO2-e', metric: 'E-EN-01', expression: 'EF_GRID_ELEC * {di_electricity_kwh} / 1000' },
  { code: 'F-EN-02', name: 'Diesel → tCO2-e', metric: 'E-EN-02', expression: 'EF_DIESEL * {di_diesel_litres} / 1000' },
  { code: 'F-EN-03', name: 'Gasoline → tCO2-e', metric: 'E-EN-03', expression: 'EF_GASOLINE * {di_gasoline_litres} / 1000' },
  { code: 'F-EN-04', name: 'LPG → tCO2-e', metric: 'E-EN-04', expression: 'EF_LPG * {di_lpg_kg} / 1000' },
  { code: 'F-GHG-01', name: 'Air travel → tCO2-e', metric: 'E-GHG-01', expression: 'EF_AIR_TRAVEL * {di_air_passenger_km} / 1000' },
];
