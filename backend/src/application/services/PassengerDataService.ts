import { PassengerData, PassengerCategory, VerificationStatus, DataSource } from '../../domain/entities/PassengerData';
import { B2BCompany } from '../../domain/entities/B2BCompany';
import { B2BUser } from '../../domain/entities/B2BUser';
import { CostCenter } from '../../domain/entities/CostCenter';
import { EncryptionService } from '../../infrastructure/security/EncryptionService';

export interface PassengerDataFilter {
  companyId?: string;
  department?: string;
  category?: PassengerCategory;
  hasBenefits?: boolean;
  isVerified?: boolean;
  searchQuery?: string;
  costCenterId?: string;
  limit?: number;
  offset?: number;
}

export interface PassengerDataCreateRequest {
  companyId: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  birthDate: Date;
  passportSeries?: string;
  passportNumber?: string;
  passportIssueDate?: Date;
  passportIssuingAuthority?: string;
  phone?: string;
  email?: string;
  hasBenefits?: boolean;
  benefitType?: 'veteran' | 'disabled' | 'student' | 'pensioner' | 'subsidized';
  benefitCertificateNumber?: string;
  benefitExpiryDate?: Date;
  department?: string;
  position?: string;
  costCenterId?: string;
  isCompanyManager?: boolean;
  requiresSpecialAssistance?: boolean;
  specialAssistanceNotes?: string;
  isVip?: boolean;
  employeeId?: string;
}

export interface PassengerDataUpdateRequest {
  lastName?: string;
  firstName?: string;
  middleName?: string;
  birthDate?: Date;
  passportSeries?: string;
  passportNumber?: string;
  passportIssueDate?: Date;
  passportIssuingAuthority?: string;
  phone?: string;
  email?: string;
  hasBenefits?: boolean;
  benefitType?: 'veteran' | 'disabled' | 'student' | 'pensioner' | 'subsidized';
  benefitCertificateNumber?: string;
  benefitExpiryDate?: Date;
  department?: string;
  position?: string;
  costCenterId?: string;
  isCompanyManager?: boolean;
  requiresSpecialAssistance?: boolean;
  specialAssistanceNotes?: string;
  isVip?: boolean;
  employeeId?: string;
}

export interface PassengerDataImportResult {
  totalRecords: number;
  successfulImports: number;
  failedImports: number;
  errors: Array<{ row: number; error: string; data?: any }>;
  importBatchId: string;
}

export interface BulkOperationResult {
  totalRequested: number;
  successful: number;
  failed: number;
  errors: Array<{ passengerId: string; error: string }>;
}

export class PassengerDataService {
  constructor(
    private readonly passengerDataRepository: any, // Will be injected via DI
    private readonly companyRepository: any,
    private readonly encryptionService: EncryptionService
  ) {}

  // CRUD Operations
  async createPassenger(request: PassengerDataCreateRequest, createdBy: string): Promise<PassengerData> {
    // Validate company exists
    const company = await this.companyRepository.findById(request.companyId);
    if (!company) {
      throw new Error('Company not found');
    }

    // Validate employee exists if provided
    if (request.employeeId) {
      const employee = await this.validateEmployeeExists(request.employeeId, request.companyId);
      if (!employee) {
        throw new Error('Employee not found in company');
      }
    }

    // Validate cost center exists if provided
    if (request.costCenterId) {
      const costCenter = await this.validateCostCenterExists(request.costCenterId, request.companyId);
      if (!costCenter) {
        throw new Error('Cost center not found in company');
      }
    }

    // Create passenger data
    const passengerData = new PassengerData({
      ...request,
      encryptedData: await this.encryptPersonalData({
        passportSeries: request.passportSeries,
        passportNumber: request.passportNumber,
        passportIssueDate: request.passportIssueDate?.toISOString(),
        passportIssuingAuthority: request.passportIssuingAuthority,
        phone: request.phone,
        email: request.email
      }),
      createdBy
    });

    // Validate passenger data
    const validationErrors = passengerData.validate();
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    // Save to database
    const savedPassenger = await this.passengerDataRepository.create(passengerData);
    return this.sanitizePassengerData(savedPassenger);
  }

  async getPassengerById(id: string, requestCompanyId: string): Promise<PassengerData | null> {
    const passenger = await this.passengerDataRepository.findById(id);

    if (!passenger || passenger.companyId !== requestCompanyId) {
      return null;
    }

    return this.sanitizePassengerData(passenger);
  }

  async updatePassenger(id: string, request: PassengerDataUpdateRequest, updatedBy: string, requestCompanyId: string): Promise<PassengerData> {
    const passenger = await this.passengerDataRepository.findById(id);
    if (!passenger || passenger.companyId !== requestCompanyId) {
      throw new Error('Passenger not found');
    }

    // Validate employee exists if provided
    if (request.employeeId && request.employeeId !== passenger.employeeId) {
      const employee = await this.validateEmployeeExists(request.employeeId, requestCompanyId);
      if (!employee) {
        throw new Error('Employee not found in company');
      }
    }

    // Update passenger data
    const updatedData = { ...request };

    // Update encrypted data if personal info changed
    if (this.hasPersonalDataChange(request)) {
      updatedData.encryptedData = await this.encryptPersonalData({
        ...passenger.encryptedData,
        passportSeries: request.passportSeries,
        passportNumber: request.passportNumber,
        passportIssueDate: request.passportIssueDate?.toISOString(),
        passportIssuingAuthority: request.passportIssuingAuthority,
        phone: request.phone,
        email: request.email
      });
    }

    // Update benefits info
    if (this.hasBenefitsChange(request)) {
      updatedData.benefitInfo = {
        ...passenger.benefitInfo,
        hasBenefits: request.hasBenefits ?? false,
        benefitType: request.benefitType,
        certificateNumber: request.benefitCertificateNumber,
        expiryDate: request.benefitExpiryDate
      };
    }

    // Update special requirements
    if (this.hasSpecialRequirementsChange(request)) {
      updatedData.specialRequirements = {
        ...passenger.specialRequirements,
        requiresSpecialAssistance: request.requiresSpecialAssistance ?? false,
        assistanceNotes: request.specialAssistanceNotes,
        isVip: request.isVip ?? false
      };
    }

    Object.assign(passenger, updatedData);
    passenger.updatedBy = updatedBy;

    // Validate updated passenger data
    const validationErrors = passenger.validate();
    if (validationErrors.length > 0) {
      throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
    }

    const savedPassenger = await this.passengerDataRepository.update(passenger);
    return this.sanitizePassengerData(savedPassenger);
  }

  async deletePassenger(id: string, requestCompanyId: string): Promise<void> {
    const passenger = await this.passengerDataRepository.findById(id);
    if (!passenger || passenger.companyId !== requestCompanyId) {
      throw new Error('Passenger not found');
    }

    // Check if passenger has active bookings
    const hasActiveBookings = await this.checkActiveBookings(id);
    if (hasActiveBookings) {
      throw new Error('Cannot delete passenger with active bookings');
    }

    await this.passengerDataRepository.delete(id);
  }

  // Search and Filtering
  async searchPassengers(filter: PassengerDataFilter): Promise<{
    passengers: PassengerData[];
    totalCount: number;
  }> {
    const searchFilter = { ...filter };

    // Add search query handling
    if (filter.searchQuery) {
      searchFilter.searchQuery = filter.searchQuery.toLowerCase();
    }

    const result = await this.passengerDataRepository.findByFilter(searchFilter);

    return {
      passengers: result.passengers.map(p => this.sanitizePassengerData(p)),
      totalCount: result.totalCount
    };
  }

  async getPassengersByCompany(companyId: string, options: {
    limit?: number;
    offset?: number;
    category?: PassengerCategory;
    department?: string;
  } = {}): Promise<{
    passengers: PassengerData[];
    totalCount: number;
  }> {
    return this.searchPassengers({
      companyId,
      limit: options.limit,
      offset: options.offset,
      category: options.category,
      department: options.department
    });
  }

  // Bulk Operations
  async bulkCreatePassengers(passengers: PassengerDataCreateRequest[], createdBy: string): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      totalRequested: passengers.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < passengers.length; i++) {
      try {
        await this.createPassenger(passengers[i], createdBy);
        result.successful++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          passengerId: passengers[i].lastName + ' ' + passengers[i].firstName,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  async bulkUpdatePassengers(updates: Array<{ id: string; data: PassengerDataUpdateRequest }>, updatedBy: string, companyId: string): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      totalRequested: updates.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const update of updates) {
      try {
        await this.updatePassenger(update.id, update.data, updatedBy, companyId);
        result.successful++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          passengerId: update.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  async bulkDeletePassengers(passengerIds: string[], companyId: string): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      totalRequested: passengerIds.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const id of passengerIds) {
      try {
        await this.deletePassenger(id, companyId);
        result.successful++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          passengerId: id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  // Import/Export Operations
  async importFromCSV(csvData: string, companyId: string, createdBy: string): Promise<PassengerDataImportResult> {
    const lines = csvData.split('\n').filter(line => line.trim());
    const headers = lines[0]?.split(',').map(h => h.trim());

    if (!headers || lines.length <= 1) {
      throw new Error('Invalid CSV data');
    }

    const result: PassengerDataImportResult = {
      totalRecords: lines.length - 1,
      successfulImports: 0,
      failedImports: 0,
      errors: [],
      importBatchId: this.generateImportBatchId()
    };

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row = this.parseCSVRow(headers, values);

        // Add company ID and import batch
        row.companyId = companyId;
        row.dataSource = DataSource.CSV_IMPORT;
        row.importBatchId = result.importBatchId;

        await this.createPassenger(row, createdBy);
        result.successfulImports++;
      } catch (error) {
        result.failedImports++;
        result.errors.push({
          row: i + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
          data: lines[i]
        });
      }
    }

    return result;
  }

  async exportToCSV(companyId: string, filter?: PassengerDataFilter): Promise<string> {
    const passengers = await this.searchPassengers({
      companyId,
      ...filter,
      limit: 10000 // Reasonable limit for export
    });

    if (passengers.passengers.length === 0) {
      throw new Error('No passengers found for export');
    }

    const headers = [
      'id', 'lastName', 'firstName', 'middleName', 'fullName', 'birthDate',
      'hasBenefits', 'benefitType', 'benefitVerified', 'category',
      'department', 'position', 'isVip', 'requiresSpecialAssistance',
      'verificationStatus', 'dataSource', 'createdAt'
    ];

    const csvRows = [headers.join(',')];

    for (const passenger of passengers.passengers) {
      const csvRow = headers.map(header => {
        const value = (passenger as any)[header];
        return value !== null && value !== undefined ? `"${value}"` : '';
      });
      csvRows.push(csvRow.join(','));
    }

    return csvRows.join('\n');
  }

  // Verification Operations
  async verifyPassenger(id: string, verifiedBy: string, notes?: string, companyId: string): Promise<PassengerData> {
    const passenger = await this.getPassengerById(id, companyId);
    if (!passenger) {
      throw new Error('Passenger not found');
    }

    passenger.verify(verifiedBy, notes);

    const savedPassenger = await this.passengerDataRepository.update(passenger);
    return this.sanitizePassengerData(savedPassenger);
  }

  async bulkVerifyPassengers(passengerIds: string[], verifiedBy: string, companyId: string): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      totalRequested: passengerIds.length,
      successful: 0,
      failed: 0,
      errors: []
    };

    for (const id of passengerIds) {
      try {
        await this.verifyPassenger(id, verifiedBy, undefined, companyId);
        result.successful++;
      } catch (error) {
        result.failed++;
        result.errors.push({
          passengerId: id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  // Benefits Management
  async updateBenefitsExpiryStatus(companyId: string): Promise<{ updatedCount: number }> {
    const passengers = await this.searchPassengers({ companyId });
    let updatedCount = 0;

    for (const passenger of passengers.passengers) {
      if (passenger.benefitInfo.hasBenefits && passenger.benefitInfo.expiryDate) {
        if (passenger.benefitInfo.expiryDate < new Date()) {
          passenger.markAsExpired();
          await this.passengerDataRepository.update(passenger);
          updatedCount++;
        }
      }
    }

    return { updatedCount };
  }

  // Analytics and Reporting
  async getPassengerStatistics(companyId: string): Promise<{
    totalCount: number;
    byCategory: Record<PassengerCategory, number>;
    byDepartment: Record<string, number>;
    verifiedCount: number;
    withBenefits: number;
    vipCount: number;
    requiresSpecialAssistance: number;
  }> {
    const passengers = await this.searchPassengers({ companyId });

    const stats = {
      totalCount: passengers.totalCount,
      byCategory: {} as Record<PassengerCategory, number>,
      byDepartment: {} as Record<string, number>,
      verifiedCount: 0,
      withBenefits: 0,
      vipCount: 0,
      requiresSpecialAssistance: 0
    };

    // Initialize categories
    Object.values(PassengerCategory).forEach(category => {
      stats.byCategory[category] = 0;
    });

    for (const passenger of passengers.passengers) {
      // Category statistics
      stats.byCategory[passenger.category]++;

      // Department statistics
      if (passenger.department) {
        stats.byDepartment[passenger.department] = (stats.byDepartment[passenger.department] || 0) + 1;
      }

      // Status statistics
      if (passenger.verificationStatus === VerificationStatus.VERIFIED) {
        stats.verifiedCount++;
      }
      if (passenger.benefitInfo.hasBenefits) {
        stats.withBenefits++;
      }
      if (passenger.specialRequirements.isVip) {
        stats.vipCount++;
      }
      if (passenger.specialRequirements.requiresSpecialAssistance) {
        stats.requiresSpecialAssistance++;
      }
    }

    return stats;
  }

  // Helper Methods
  private async encryptPersonalData(data: any): Promise<any> {
    const encrypted: any = {};

    for (const [key, value] of Object.entries(data)) {
      if (value) {
        encrypted[key] = await this.encryptionService.encrypt(value);
      }
    }

    return encrypted;
  }

  private sanitizePassengerData(passenger: PassengerData): PassengerData {
    // Remove sensitive data from the response
    const sanitized = passenger.clone();
    // Note: encryptedData should be handled at repository level
    return sanitized;
  }

  private async validateEmployeeExists(employeeId: string, companyId: string): Promise<B2BUser | null> {
    // This would typically call the B2BUserRepository
    // For now, returning null as placeholder
    return null;
  }

  private async validateCostCenterExists(costCenterId: string, companyId: string): Promise<CostCenter | null> {
    // This would typically call the CostCenterRepository
    // For now, returning null as placeholder
    return null;
  }

  private hasPersonalDataChange(request: PassengerDataUpdateRequest): boolean {
    const personalFields = ['passportSeries', 'passportNumber', 'passportIssueDate', 'passportIssuingAuthority', 'phone', 'email'];
    return personalFields.some(field => request[field as keyof PassengerDataUpdateRequest] !== undefined);
  }

  private hasBenefitsChange(request: PassengerDataUpdateRequest): boolean {
    const benefitFields = ['hasBenefits', 'benefitType', 'benefitCertificateNumber', 'benefitExpiryDate'];
    return benefitFields.some(field => request[field as keyof PassengerDataUpdateRequest] !== undefined);
  }

  private hasSpecialRequirementsChange(request: PassengerDataUpdateRequest): boolean {
    const specialFields = ['requiresSpecialAssistance', 'specialAssistanceNotes', 'isVip'];
    return specialFields.some(field => request[field as keyof PassengerDataUpdateRequest] !== undefined);
  }

  private parseCSVRow(headers: string[], values: string[]): PassengerDataCreateRequest {
    const row: any = {};

    headers.forEach((header, index) => {
      const value = values[index]?.trim();
      if (value) {
        // Map CSV headers to request fields
        switch (header.toLowerCase()) {
          case 'lastname':
          case 'last_name':
            row.lastName = value;
            break;
          case 'firstname':
          case 'first_name':
            row.firstName = value;
            break;
          case 'middlename':
          case 'middle_name':
            row.middleName = value;
            break;
          case 'birthdate':
          case 'birth_date':
            row.birthDate = new Date(value);
            break;
          case 'passportseries':
          case 'passport_series':
            row.passportSeries = value;
            break;
          case 'passportnumber':
          case 'passport_number':
            row.passportNumber = value;
            break;
          case 'phone':
            row.phone = value;
            break;
          case 'email':
            row.email = value;
            break;
          case 'department':
            row.department = value;
            break;
          case 'position':
            row.position = value;
            break;
          // Add more mappings as needed
        }
      }
    });

    return row;
  }

  private generateImportBatchId(): string {
    return `IMPORT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async checkActiveBookings(passengerId: string): Promise<boolean> {
    // This would check against booking repositories
    // For now, returning false
    return false;
  }

  // Search for passengers suitable for specific booking requirements
  async findSuitablePassengers(companyId: string, requirements: {
    category?: PassengerCategory;
    requiresSpecialAssistance?: boolean;
    isVip?: boolean;
    maxCount?: number;
  }): Promise<PassengerData[]> {
    const filter: PassengerDataFilter = {
      companyId,
      category: requirements.category,
      limit: requirements.maxCount
    };

    const result = await this.searchPassengers(filter);

    return result.passengers.filter(passenger => {
      if (requirements.requiresSpecialAssistance !== undefined &&
          passenger.specialRequirements.requiresSpecialAssistance !== requirements.requiresSpecialAssistance) {
        return false;
      }

      if (requirements.isVip !== undefined &&
          passenger.specialRequirements.isVip !== requirements.isVip) {
        return false;
      }

      return true;
    });
  }

  // Get passenger discount eligibility
  async getPassengerDiscountEligibility(passengerId: string, companyId: string): Promise<{
    isEligible: boolean;
    discountPercent: number;
    discountType: string;
    expires?: Date;
  }> {
    const passenger = await this.getPassengerById(passengerId, companyId);
    if (!passenger) {
      throw new Error('Passenger not found');
    }

    const isEligible = passenger.isEligibleForDiscountedFare();
    const discountPercent = passenger.getDiscountPercentage();

    let discountType = 'none';
    if (isEligible) {
      switch (passenger.category) {
        case PassengerCategory.CHILD:
          discountType = 'child_discount';
          break;
        case PassengerCategory.STUDENT:
          discountType = 'student_discount';
          break;
        case PassengerCategory.SENIOR:
          discountType = 'senior_discount';
          break;
        case PassengerCategory.DISABLED:
          discountType = 'disability_discount';
          break;
        default:
          discountType = 'corporate_discount';
      }
    }

    return {
      isEligible,
      discountPercent,
      discountType,
      expires: passenger.benefitInfo.expiryDate
    };
  }
}