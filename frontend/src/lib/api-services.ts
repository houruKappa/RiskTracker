import api from './api-client';
import type { User, Risk, RiskObject, Countermeasure, ReportSummary, PaginatedRisks, PaginatedReport } from '@/types/api';

export const authService = {
  login: (email: string, password: string) => 
    api.post<{ token: string; user: User }>('/api/v1/auth/login', { email, password }),
  
  logout: () => 
    api.post('/api/v1/auth/logout'),
  
  me: () => 
    api.get<User>('/api/v1/users/me'),
};

export const riskObjectService = {
  list: () => 
    api.get<RiskObject[]>('/api/v1/objects'),
  
  create: (data: { name: string; object_type: string; description?: string }) => 
    api.post<RiskObject>('/api/v1/admin/objects', data),
  
  update: (id: string, data: { name: string; object_type: string; description?: string }) => 
    api.put<RiskObject>(`/api/v1/admin/objects/${id}`, data),
  
  delete: (id: string) => 
    api.delete(`/api/v1/admin/objects/${id}`),
};

export const riskService = {
  list: (params?: { page?: number; limit?: number; status?: string; target_id?: string; search?: string }) => 
    api.get<PaginatedRisks>('/api/v1/risks', { params }),
  
  get: (id: string) => 
    api.get<Risk>(`/api/v1/risks/${id}`),
  
  create: (data: {
    title: string;
    target_id: string;
    owner_id: string;
    probability: string;
    impact: string;
    financial_loss?: string;
    reputational_loss?: string;
    legal_consequences?: number;
    comment?: string;
    causes?: Array<{ name: string; description?: string; probability: string }>;
    consequences?: Array<{ name: string; description?: string; probability: string }>;
  }) => api.post<Risk>('/api/v1/risks', data),
  
  update: (id: string, data: Partial<{
    title: string;
    target_id: string;
    owner_id: string;
    probability: string;
    impact: string;
    financial_loss?: string;
    reputational_loss?: string;
    legal_consequences?: number;
    comment?: string;
    causes?: Array<{ name: string; description?: string; probability: string }>;
    consequences?: Array<{ name: string; description?: string; probability: string }>;
  }>) => api.put<Risk>(`/api/v1/risks/${id}`, data),
  
  updateStatus: (id: string, status: string) => 
    api.patch<{ status: string }>(`/api/v1/risks/${id}/status`, { status }),
  
  addCause: (id: string, data: { name: string; description?: string; probability: string }) => 
    api.post(`/api/v1/risks/${id}/causes`, data),
  
  addConsequence: (id: string, data: { name: string; description?: string; probability: string }) => 
    api.post(`/api/v1/risks/${id}/consequences`, data),
  
  deleteCause: (riskId: string, causeId: string) => 
    api.delete(`/api/v1/risks/${riskId}/causes/${causeId}`),
  
  deleteConsequence: (riskId: string, consequenceId: string) => 
    api.delete(`/api/v1/risks/${riskId}/consequences/${consequenceId}`),
  
  useList: (params?: { page?: number; limit?: number; status?: string; target_id?: string }) => 
    api.get<PaginatedRisks>('/api/v1/risks', { params }),
};

export const countermeasureService = {
  listByRiskId: (riskId: string) => 
    api.get<Countermeasure[]>(`/api/v1/risks/${riskId}/countermeasures`),
  
  get: (id: string) => 
    api.get<Countermeasure>(`/api/v1/countermeasures/${id}`),
  
  create: (data: {
    risk_id: string;
    target_type: 'CAUSE' | 'CONSEQUENCE';
    cause_id?: string;
    consequence_id?: string;
    description: string;
    assignee_id: string;
    status?: string;
    deadline: string;
  }) => api.post<Countermeasure>('/api/v1/countermeasures', data),
  
  update: (id: string, data: {
    description: string;
    assignee_id: string;
    status?: string;
    deadline: string;
  }) => api.put<Countermeasure>(`/api/v1/countermeasures/${id}`, data),
  
  remove: (id: string) => 
    api.delete(`/api/v1/countermeasures/${id}`),
  
  useListByRiskId: (riskId: string) => 
    api.get<Countermeasure[]>(`/api/v1/risks/${riskId}/countermeasures`),
};

export const reportService = {
  summary: () => 
    api.get<ReportSummary>('/api/v1/reports/summary'),
  
  detail: (params?: {
    page?: number;
    limit?: number;
    target_id?: string;
    owner_id?: string;
    assignee_id?: string;
    risk_ids?: string;
    status?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
  }) => api.get<PaginatedReport>('/api/v1/reports/detail', { params }),
  
  auditLogs: (params?: {
    page?: number;
    limit?: number;
    entity_type?: string;
    action_type?: string;
    user_id?: string;
    user_email?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
  }) => api.get<{ items: any[]; total_count: number; page: number; limit: number }>('/api/v1/logs', { params }),
};

export const userService = {
  list: () => 
    api.get<User[]>('/api/v1/users'),
  
  create: (data: { email: string; full_name: string; password: string; role: 'USER' | 'ADMIN' }) => 
    api.post<User>('/api/v1/admin/users', data),
  
  update: (id: string, data: { email: string; full_name: string; role: 'USER' | 'ADMIN' }) => 
    api.put<User>(`/api/v1/admin/users/${id}`, data),
  
  resetPassword: (id: string, password: string) => 
    api.put(`/api/v1/admin/users/${id}/password`, { password }),
};