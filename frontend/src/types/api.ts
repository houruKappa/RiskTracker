// Auto-generated types from backend API
// In production, this should be generated from Swagger/OpenAPI spec

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'USER' | 'ADMIN';
  created_at: string;
  updated_at: string;
}

export interface RiskObject {
  id: string;
  name: string;
  object_type: 'IT_SYSTEM' | 'PROJECT' | 'PROCESS';
  description?: string;
  created_at: string;
  updated_at: string;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RiskStatus = 'IN_PROGRESS' | 'COMPLETED';
export type CountermeasureTarget = 'CAUSE' | 'CONSEQUENCE';
export type RiskObjectType = 'IT_SYSTEM' | 'PROJECT' | 'PROCESS';
export type UserRole = 'USER' | 'ADMIN';

export interface RiskCause {
  id: string;
  risk_id: string;
  name: string;
  description?: string;
  probability: RiskLevel;
  created_at: string;
}

export interface RiskConsequence {
  id: string;
  risk_id: string;
  name: string;
  description?: string;
  probability: RiskLevel;
  created_at: string;
}

export interface Countermeasure {
  id: string;
  risk_id: string;
  target_type: CountermeasureTarget;
  cause_id?: string;
  consequence_id?: string;
  description: string;
  assignee_id: string;
  assignee?: User;
  deadline: string;
  created_at: string;
}

export interface Risk {
  id: string;
  status: RiskStatus;
  title: string;
  target_id: string;
  target?: RiskObject;
  owner_id: string;
  owner?: User;
  probability: RiskLevel;
  impact: RiskLevel;
  financial_loss?: string;
  reputational_loss?: RiskLevel;
  legal_consequences?: number;
  comment?: string;
  max_cause_probability?: RiskLevel;
  max_consequence_probability?: RiskLevel;
  causes?: RiskCause[];
  consequences?: RiskConsequence[];
  created_at: string;
  updated_at: string;
}

export interface PaginatedRisks {
  items: Risk[];
  total_count: number;
  page: number;
  limit: number;
}

export interface CountermeasureReport {
  id: string;
  description: string;
  assignee_name: string;
  deadline: string;
  is_expired: boolean;
  is_expiring_soon: boolean;
  target_type: CountermeasureTarget;
}

export interface ReportItem {
  id: string;
  title: string;
  target_name: string;
  target_type: RiskObjectType;
  owner_name: string;
  status: RiskStatus;
  probability: RiskLevel;
  impact: RiskLevel;
  max_cause_probability?: RiskLevel;
  max_consequence_probability?: RiskLevel;
  countermeasures: CountermeasureReport[];
  created_at: string;
}

export interface PaginatedReport {
  items: ReportItem[];
  total_count: number;
  page: number;
  limit: number;
}

export interface ReportSummary {
  total_risks: number;
  in_progress_risks: number;
  completed_risks: number;
  expired_countermeasures: number;
  expiring_soon_countermeasures: number;
}

export interface AuditLog {
  id: number;
  entity_type: 'RISK' | 'COUNTERMEASURE' | 'RISK_OBJECT';
  entity_id: string;
  action_type: 'CREATE' | 'UPDATE' | 'DELETE';
  changed_by_user_id: string;
  timestamp: string;
  old_state?: Record<string, unknown>;
  new_state?: Record<string, unknown>;
}

export interface PaginatedAuditLogs {
  items: AuditLog[];
  total_count: number;
  page: number;
  limit: number;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface CreateRiskRequest {
  title: string;
  target_id: string;
  owner_id: string;
  probability: RiskLevel;
  impact: RiskLevel;
  financial_loss?: string;
  reputational_loss?: RiskLevel;
  legal_consequences?: number;
  comment?: string;
  causes?: Array<{ name: string; description?: string; probability: RiskLevel }>;
  consequences?: Array<{ name: string; description?: string; probability: RiskLevel }>;
}

export interface CreateCountermeasureRequest {
  risk_id: string;
  target_type: CountermeasureTarget;
  cause_id?: string;
  consequence_id?: string;
  description: string;
  assignee_id: string;
  deadline: string;
}

export interface UpdateCountermeasureRequest {
  description: string;
  assignee_id: string;
  deadline: string;
}

export interface CreateRiskObjectRequest {
  name: string;
  object_type: RiskObjectType;
  description?: string;
}

export interface CreateUserRequest {
  email: string;
  full_name: string;
  password: string;
  role: UserRole;
}

export interface ResetPasswordRequest {
  password: string;
}

export interface ReportFilters {
  page?: number;
  limit?: number;
  target_id?: string;
  owner_id?: string;
  status?: RiskStatus;
  date_from?: string;
  date_to?: string;
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  entity_type?: string;
  action_type?: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
}