import { overviewRepository, AdminOverviewStats } from '../repositories/overview.repository';

export class OverviewService {
  public async getOverview(): Promise<AdminOverviewStats> {
    return overviewRepository.getAdminOverview();
  }
}

export const overviewService = new OverviewService();
