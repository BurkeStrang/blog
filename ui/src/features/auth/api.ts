import { apiService } from "../../shared/services/api";

export const getGoogleAuthUrl = (): Promise<{ url: string }> => apiService.getGoogleAuthUrl();
