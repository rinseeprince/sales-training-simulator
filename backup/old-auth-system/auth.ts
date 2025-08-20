// Authentication and Authorization Types

export type UserRole = 'admin' | 'manager' | 'user';

export type ScenarioVisibility = 'personal' | 'manager_shared' | 'public';

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  department?: string;
  manager_id?: string;
  email_verified: boolean;
  failed_login_attempts: number;
  locked_until?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
  manager?: AuthUser;
  team_members?: AuthUser[];
}

export interface UserPermissions {
  id: string;
  manager_id: string;
  allow_user_saving: boolean;
  allow_scenario_sharing: boolean;
  max_scenarios_per_user: number;
  custom_permissions: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface EnhancedScenario {
  id: string;
  created_by: string;
  title: string;
  prompt: string;
  visibility: ScenarioVisibility;
  is_template: boolean;
  settings: Record<string, any>;
  persona?: string;
  difficulty: string;
  industry?: string;
  tags: string[];
  usage_count: number;
  last_used?: string;
  created_at: string;
  updated_at: string;
  creator?: AuthUser;
  access_permissions?: ScenarioAccess[];
}

export interface ScenarioAccess {
  id: string;
  scenario_id: string;
  user_id: string;
  granted_by: string;
  access_type: 'read' | 'write' | 'admin';
  granted_at: string;
  expires_at?: string;
  scenario?: EnhancedScenario;
  user?: AuthUser;
  granter?: AuthUser;
}

export interface InvitationToken {
  id: string;
  email: string;
  token: string;
  invited_by: string;
  assigned_role: UserRole;
  assigned_manager_id?: string;
  status: InvitationStatus;
  expires_at: string;
  metadata: Record<string, any>;
  created_at: string;
  accepted_at?: string;
  inviter?: AuthUser;
  assigned_manager?: AuthUser;
}

export interface AuthSession {
  id: string;
  user_id: string;
  session_token: string;
  refresh_token?: string;
  expires_at: string;
  last_activity: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user?: AuthUser;
}

export interface AuditLogEntry {
  id: string;
  user_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata: Record<string, any>;
  success: boolean;
  error_message?: string;
  created_at: string;
  user?: AuthUser;
}

// Authentication request/response types
export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
  department?: string;
  invitation_token?: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  user?: AuthUser;
  verification_required?: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  user?: AuthUser;
  session_token?: string;
  refresh_token?: string;
  permissions?: UserPermissions;
  requires_verification?: boolean;
}

export interface VerifyEmailRequest {
  token: string;
  email: string;
}

export interface VerifyEmailResponse {
  success: boolean;
  message: string;
  user?: AuthUser;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  email: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}

export interface InviteUserRequest {
  email: string;
  role: UserRole;
  manager_id?: string;
  message?: string;
}

export interface InviteUserResponse {
  success: boolean;
  message: string;
  invitation?: InvitationToken;
}

export interface AcceptInvitationRequest {
  token: string;
  password: string;
  name?: string;
}

export interface AcceptInvitationResponse {
  success: boolean;
  message: string;
  user?: AuthUser;
  session_token?: string;
}

// Authorization context types
export interface AuthContext {
  user: AuthUser | null;
  permissions: UserPermissions | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<LoginResponse>;
  register: (data: RegisterRequest) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
  verifyEmail: (data: VerifyEmailRequest) => Promise<VerifyEmailResponse>;
  forgotPassword: (data: ForgotPasswordRequest) => Promise<ForgotPasswordResponse>;
  resetPassword: (data: ResetPasswordRequest) => Promise<ResetPasswordResponse>;
  acceptInvitation: (data: AcceptInvitationRequest) => Promise<AcceptInvitationResponse>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: Partial<AuthUser>) => Promise<void>;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
  canAccessScenario: (scenario: EnhancedScenario) => boolean;
  canSaveScenarios: () => boolean;
}

// Route protection types
export interface RouteProtectionConfig {
  requireAuth?: boolean;
  requiredRoles?: UserRole[];
  requiredPermissions?: string[];
  redirectTo?: string;
  requireEmailVerification?: boolean;
}

// API response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string>;
}

// Error types
export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class PermissionError extends Error {
  constructor(
    message: string = 'Insufficient permissions',
    public requiredRole?: UserRole,
    public requiredPermission?: string
  ) {
    super(message);
    this.name = 'PermissionError';
  }
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
  score: number;
}

// Email template types
export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailContext {
  user?: AuthUser;
  inviter?: AuthUser;
  token?: string;
  expiresAt?: string;
  appName?: string;
  appUrl?: string;
  supportEmail?: string;
}

// Rate limiting types
export interface RateLimitConfig {
  windowMs: number;
  maxAttempts: number;
  blockDuration: number;
  skipSuccessfulRequests?: boolean;
}

// Audit types
export type AuditAction = 
  | 'login'
  | 'logout'
  | 'register'
  | 'password_reset'
  | 'email_verify'
  | 'profile_update'
  | 'role_change'
  | 'permission_change'
  | 'scenario_create'
  | 'scenario_update'
  | 'scenario_delete'
  | 'scenario_share'
  | 'invitation_create'
  | 'invitation_accept'
  | 'failed_login'
  | 'account_locked'
  | 'unauthorized_access';

export interface CreateAuditLogParams {
  userId?: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
}
