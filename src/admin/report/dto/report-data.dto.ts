// src/reports/dto/report-data.dto.ts
export interface ScanReportDto {
  totalScans: number;
  scansToday: number;
  scansThisMonth: number;
  monthChange: number;
  scansInPeriod: number;
}

export interface MonthlyTrendDto {
  labels: string[];
  values: number[];
}

export interface DashboardDataDto {
  totalScannedInvoices: string;
  invoicesScannedToday: number;
  invoicesScannedThisMonth: number;
  monthChange: number;
  monthlyTrendLabels: string;
  monthlyTrendValues: string;
  recentActivity?: string; // Make it optional since it wasn't in original interface
  currentYear: number;
}