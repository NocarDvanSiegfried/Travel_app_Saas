import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export interface AuditEvent {
  id: string;
  timestamp: Date;
  userId?: string;
  companyId?: string;
  sessionId?: string;
  action: string;
  category: 'AUTHENTICATION' | 'AUTHORIZATION' | 'DATA_ACCESS' | 'DATA_MODIFICATION' | 'FINANCIAL' | 'SECURITY' | 'SYSTEM';
  resourceType: string;
  resourceId?: string;
  result: 'SUCCESS' | 'FAILURE';
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  riskScore: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  correlationId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

export interface AuditFilter {
  userId?: string;
  companyId?: string;
  action?: string;
  category?: AuditEvent['category'];
  result?: AuditEvent['result'];
  severity?: AuditEvent['severity'];
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  riskScore?: number;
}

export interface AuditStats {
  totalEvents: number;
  failedLogins: number;
  suspiciousActivity: number;
  criticalEvents: number;
  uniqueUsers: number;
  topActions: Array<{ action: string; count: number }>;
  riskTrend: Array<{ date: string; avgRiskScore: number }>;
}

// predefined audit events with their risk scores
const AUDIT_EVENT_DEFINITIONS = {
  // Authentication events
  LOGIN_SUCCESS: { category: 'AUTHENTICATION', defaultRisk: 10 },
  LOGIN_FAILURE: { category: 'AUTHENTICATION', defaultRisk: 25 },
  LOGOUT: { category: 'AUTHENTICATION', defaultRisk: 5 },
  PASSWORD_CHANGE: { category: 'AUTHENTICATION', defaultRisk: 30 },
  PASSWORD_RESET_REQUEST: { category: 'AUTHENTICATION', defaultRisk: 20 },
  TWO_FACTOR_ENABLED: { category: 'AUTHENTICATION', defaultRisk: 15 },
  TWO_FACTOR_DISABLED: { category: 'AUTHENTICATION', defaultRisk: 40 },
  TWO_FACTOR_VERIFICATION_SUCCESS: { category: 'AUTHENTICATION', defaultRisk: 10 },
  TWO_FACTOR_VERIFICATION_FAILURE: { category: 'AUTHENTICATION', defaultRisk: 35 },

  // Authorization events
  ROLE_CHANGE: { category: 'AUTHORIZATION', defaultRisk: 50 },
  PERMISSION_CHANGE: { category: 'AUTHORIZATION', defaultRisk: 45 },
  ACCESS_DENIED: { category: 'AUTHORIZATION', defaultRisk: 20 },

  // Data access events
  DATA_EXPORT: { category: 'DATA_ACCESS', defaultRisk: 25 },
  SENSITIVE_DATA_ACCESS: { category: 'DATA_ACCESS', defaultRisk: 35 },
  REPORT_GENERATED: { category: 'DATA_ACCESS', defaultRisk: 15 },
  AUDIT_LOG_ACCESSED: { category: 'DATA_ACCESS', defaultRisk: 30 },

  // Data modification events
  EMPLOYEE_CREATED: { category: 'DATA_MODIFICATION', defaultRisk: 20 },
  EMPLOYEE_UPDATED: { category: 'DATA_MODIFICATION', defaultRisk: 15 },
  EMPLOYEE_DELETED: { category: 'DATA_MODIFICATION', defaultRisk: 40 },
  COMPANY_SETTINGS_UPDATED: { category: 'DATA_MODIFICATION', defaultRisk: 35 },
  TICKET_CREATED: { category: 'DATA_MODIFICATION', defaultRisk: 10 },
  TICKET_UPDATED: { category: 'DATA_MODIFICATION', defaultRisk: 10 },
  TICKET_DELETED: { category: 'DATA_MODIFICATION', defaultRisk: 25 },

  // Financial events
  DEPOSIT_REPLENISHED: { category: 'FINANCIAL', defaultRisk: 30 },
  PAYMENT_PROCESSED: { category: 'FINANCIAL', defaultRisk: 25 },
  REFUND_ISSUED: { category: 'FINANCIAL', defaultRisk: 40 },
  BILLING_DETAILS_ACCESSED: { category: 'FINANCIAL', defaultRisk: 35 },

  // Security events
  MULTIPLE_LOGIN_ATTEMPTS: { category: 'SECURITY', defaultRisk: 45 },
  SUSPICIOUS_IP_LOGIN: { category: 'SECURITY', defaultRisk: 60 },
  SESSION_HIJACKING_DETECTED: { category: 'SECURITY', defaultRisk: 100 },
  BRUTE_FORCE_ATTEMPT: { category: 'SECURITY', defaultRisk: 80 },
  MALICIOUS_REQUEST_DETECTED: { category: 'SECURITY', defaultRisk: 90 },

  // System events
  SYSTEM_ERROR: { category: 'SYSTEM', defaultRisk: 15 },
  API_ACCESS: { category: 'SYSTEM', defaultRisk: 5 },
  CONFIGURATION_CHANGE: { category: 'SYSTEM', defaultRisk: 50 }
};

export class B2BAuditService {
  private readonly HASH_SALT = process.env.AUDIT_HASH_SALT || 'default-audit-salt';

  // Create audit event
  async createAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp' | 'riskScore' | 'severity'>): Promise<AuditEvent> {
    const auditEvent: AuditEvent = {
      id: uuidv4(),
      timestamp: new Date(),
      ...event,
      riskScore: this.calculateRiskScore(event),
      severity: this.determineSeverity(event.action, event.result)
    };

    // Hash sensitive data
    const sanitizedEvent = this.sanitizeAuditEvent(auditEvent);

    // TODO: Save to immutable audit log database
    // await this.auditRepository.insert(sanitizedEvent);

    // Real-time monitoring for critical events
    if (auditEvent.severity === 'CRITICAL' || auditEvent.riskScore >= 80) {
      await this.sendSecurityAlert(auditEvent);
    }

    console.log('Audit Event:', JSON.stringify(sanitizedEvent, null, 2));
    return auditEvent;
  }

  // Calculate risk score for audit event
  private calculateRiskScore(event: Omit<AuditEvent, 'id' | 'timestamp' | 'riskScore' | 'severity'>): number {
    const eventDef = AUDIT_EVENT_DEFINITIONS[event.action as keyof typeof AUDIT_EVENT_DEFINITIONS];
    let baseRisk = eventDef?.defaultRisk || 20;

    // Adjust risk based on result
    if (event.result === 'FAILURE') {
      baseRisk += 15;
    }

    // Adjust risk based on user role
    if (event.details.userRole === 'super_admin' || event.details.userRole === 'company_admin') {
      baseRisk += 10;
    }

    // Adjust risk based on IP reputation
    if (this.isSuspiciousIp(event.ipAddress)) {
      baseRisk += 25;
    }

    // Adjust risk based on time (outside business hours)
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      baseRisk += 10;
    }

    // Adjust risk for sensitive operations
    const sensitiveOperations = ['ROLE_CHANGE', 'EMPLOYEE_DELETE', 'DEPOSIT_REPLENISHED'];
    if (sensitiveOperations.includes(event.action)) {
      baseRisk += 20;
    }

    return Math.min(100, baseRisk); // Cap at 100
  }

  // Determine severity based on risk score and action type
  private determineSeverity(action: string, result: string): AuditEvent['severity'] {
    const eventDef = AUDIT_EVENT_DEFINITIONS[action as keyof typeof AUDIT_EVENT_DEFINITIONS];

    if (result === 'FAILURE') {
      if (eventDef?.defaultRisk && eventDef.defaultRisk >= 70) return 'CRITICAL';
      if (eventDef?.defaultRisk && eventDef.defaultRisk >= 50) return 'HIGH';
      return 'MEDIUM';
    }

    // Security events are inherently higher severity
    const securityActions = ['SESSION_HIJACKING_DETECTED', 'BRUTE_FORCE_ATTEMPT', 'MALICIOUS_REQUEST_DETECTED'];
    if (securityActions.includes(action)) return 'CRITICAL';

    if (eventDef?.defaultRisk && eventDef.defaultRisk >= 70) return 'HIGH';
    if (eventDef?.defaultRisk && eventDef.defaultRisk >= 40) return 'MEDIUM';
    return 'LOW';
  }

  // Sanitize audit event to remove sensitive information
  private sanitizeAuditEvent(event: AuditEvent): AuditEvent {
    const sanitized = { ...event };

    // Hash sensitive data but preserve structure
    if (sanitized.details.password) {
      sanitized.details.password = '[REDACTED]';
    }

    if (sanitized.details.email) {
      sanitized.details.emailHash = this.hashSensitiveData(sanitized.details.email);
      delete sanitized.details.email;
    }

    if (sanitized.details.phone) {
      sanitized.details.phoneMasked = this.maskPhoneNumber(sanitized.details.phone);
      delete sanitized.details.phone;
    }

    // Remove sensitive PII from oldValues and newValues
    if (sanitized.oldValues) {
      sanitized.oldValues = this.sanitizeObject(sanitized.oldValues);
    }

    if (sanitized.newValues) {
      sanitized.newValues = this.sanitizeObject(sanitized.newValues);
    }

    return sanitized;
  }

  // Hash sensitive data
  private hashSensitiveData(data: string): string {
    return crypto
      .createHash('sha256')
      .update(data + this.HASH_SALT)
      .digest('hex');
  }

  // Mask phone number
  private maskPhoneNumber(phone: string): string {
    if (phone.length < 4) return '[MASKED]';
    return phone.slice(0, 2) + '*' + phone.slice(-2);
  }

  // Sanitize object by removing sensitive fields
  private sanitizeObject(obj: Record<string, any>): Record<string, any> {
    const sensitiveFields = ['password', 'ssn', 'passport', 'creditCard', 'bankAccount'];
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 100) {
        // Truncate long strings
        sanitized[key] = value.substring(0, 50) + '...[TRUNCATED]';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  // Check if IP address is suspicious
  private isSuspiciousIp(ipAddress: string): boolean {
    // TODO: Implement IP reputation checking
    // Check against known malicious IPs, VPNs, TOR exit nodes
    const suspiciousRanges = ['10.0.0.', '192.168.', '172.16.']; // Example

    return suspiciousRanges.some(range => ipAddress.startsWith(range));
  }

  // Send security alerts for critical events
  private async sendSecurityAlert(event: AuditEvent): Promise<void> {
    const alert = {
      id: uuidv4(),
      eventId: event.id,
      severity: event.severity,
      message: `Security alert: ${event.action} ${event.result} by user ${event.userId}`,
      timestamp: event.timestamp,
      requiresAttention: true
    };

    // TODO: Send to security team
    // await this.notificationService.sendSecurityAlert(alert);
    console.log('🚨 SECURITY ALERT:', JSON.stringify(alert, null, 2));
  }

  // Query audit events with filters
  async getAuditEvents(filter: AuditFilter, pagination?: { limit: number; offset: number }): Promise<AuditEvent[]> {
    try {
      // TODO: Implement database query with filters
      // return await this.auditRepository.findByFilter(filter, pagination);

      // Mock implementation
      return [];
    } catch (error) {
      console.error('Failed to query audit events:', error);
      return [];
    }
  }

  // Get audit statistics
  async getAuditStats(filter: Partial<AuditFilter>): Promise<AuditStats> {
    try {
      // TODO: Implement statistics calculation
      // return await this.auditRepository.getStats(filter);

      // Mock implementation
      return {
        totalEvents: 0,
        failedLogins: 0,
        suspiciousActivity: 0,
        criticalEvents: 0,
        uniqueUsers: 0,
        topActions: [],
        riskTrend: []
      };
    } catch (error) {
      console.error('Failed to get audit stats:', error);
      return {
        totalEvents: 0,
        failedLogins: 0,
        suspiciousActivity: 0,
        criticalEvents: 0,
        uniqueUsers: 0,
        topActions: [],
        riskTrend: []
      };
    }
  }

  // Export audit events (with access control)
  async exportAuditEvents(
    filter: AuditFilter,
    userId: string,
    format: 'csv' | 'json' | 'pdf' = 'csv'
  ): Promise<Buffer> {
    // TODO: Verify user has permission to export audit logs
    // if (!this.hasExportPermission(userId)) {
    //   throw new Error('Insufficient permissions to export audit logs');
    // }

    const events = await this.getAuditEvents(filter);

    // Convert to requested format
    switch (format) {
      case 'csv':
        return this.convertToCsv(events);
      case 'json':
        return Buffer.from(JSON.stringify(events, null, 2));
      case 'pdf':
        // TODO: Implement PDF generation
        return Buffer.from('PDF export not implemented');
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  // Convert events to CSV format
  private convertToCsv(events: AuditEvent[]): Buffer {
    const headers = [
      'timestamp',
      'userId',
      'companyId',
      'action',
      'category',
      'result',
      'riskScore',
      'severity',
      'ipAddress'
    ];

    const csvRows = [
      headers.join(','),
      ...events.map(event => [
        event.timestamp.toISOString(),
        event.userId || '',
        event.companyId || '',
        event.action,
        event.category,
        event.result,
        event.riskScore,
        event.severity,
        event.ipAddress
      ].join(','))
    ];

    return Buffer.from(csvRows.join('\n'));
  }

  // Archive old audit events
  async archiveAuditEvents(olderThan: Date): Promise<number> {
    try {
      // TODO: Implement archiving logic
      // Move events older than specified date to cold storage
      const archivedCount = 0; // Mock result

      console.log(`Archived ${archivedCount} audit events older than ${olderThan.toISOString()}`);
      return archivedCount;
    } catch (error) {
      console.error('Failed to archive audit events:', error);
      return 0;
    }
  }

  // Cleanup old audit events (beyond retention period)
  async cleanupAuditEvents(olderThan: Date): Promise<number> {
    try {
      // TODO: Implement cleanup logic
      // Permanently delete events older than retention period
      const deletedCount = 0; // Mock result

      console.log(`Deleted ${deletedCount} audit events older than ${olderThan.toISOString()}`);
      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup audit events:', error);
      return 0;
    }
  }

  // Verify integrity of audit log
  async verifyAuditLogIntegrity(): Promise<{ isValid: boolean; tamperedRecords: string[] }> {
    try {
      // TODO: Implement integrity verification using cryptographic hashes
      // Check if any audit records have been tampered with

      return {
        isValid: true,
        tamperedRecords: []
      };
    } catch (error) {
      console.error('Failed to verify audit log integrity:', error);
      return {
        isValid: false,
        tamperedRecords: ['Integrity check failed']
      };
    }
  }

  // Get user activity timeline
  async getUserActivityTimeline(userId: string, limit: number = 50): Promise<AuditEvent[]> {
    try {
      // TODO: Implement user timeline query
      const filter: AuditFilter = { userId };
      return await this.getAuditEvents(filter, { limit, offset: 0 });
    } catch (error) {
      console.error('Failed to get user activity timeline:', error);
      return [];
    }
  }

  // Get recent security events
  async getRecentSecurityEvents(limit: number = 10): Promise<AuditEvent[]> {
    try {
      // TODO: Implement security events query
      const filter: AuditFilter = {
        category: 'SECURITY',
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      };
      return await this.getAuditEvents(filter, { limit, offset: 0 });
    } catch (error) {
      console.error('Failed to get recent security events:', error);
      return [];
    }
  }
}