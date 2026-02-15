import { get } from "./client";
import { AdminDashboardStats } from "./admin-dashboard.types";

class AdminDashboardService {
    async getStats(): Promise<AdminDashboardStats> {
        return get<AdminDashboardStats>("/admin/dashboard/stats");
    }
}

export const adminDashboardService = new AdminDashboardService();
