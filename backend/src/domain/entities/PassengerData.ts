import { Entity, BaseEntity } from './BaseEntity';
import { B2BCompany } from './B2BCompany';
import { B2BUser } from './B2BUser';
import { CostCenter } from './CostCenter';

export interface BenefitInfo {
  hasBenefits: boolean;
  benefitType?: 'veteran' | 'disabled' | 'student' | 'pensioner' | 'subsidized';
  certificateNumber?: string;
  expiryDate?: Date;
  isVerified: boolean;
  verificationDate?: Date;
}

export interface EncryptedPersonalData {
  passportSeries?: string;
  passportNumber?: string;
  passportIssueDate?: string;
  passportIssuingAuthority?: string;
  passportFullData?: string;
  phone?: string;
  email?: string;
}

export interface SpecialRequirements {
  requiresSpecialAssistance: boolean;
  assistanceNotes?: string;
  isVip: boolean;
  dietaryRestrictions?: string[];
  medicalConditions?: string[];
}

export enum PassengerCategory {
  ADULT = 'adult',
  CHILD = 'child',
  STUDENT = 'student',
  SENIOR = 'senior',
  DISABLED = 'disabled'
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

export enum DataSource {
  MANUAL = 'manual',
  CSV_IMPORT = 'csv_import',
  HR_INTEGRATION = 'hr_integration'
}

export class PassengerData extends BaseEntity {
  public companyId: string;
  public employeeId?: string;

  // Personal Information
  public lastName: string;
  public firstName: string;
  public middleName?: string;
  public birthDate: Date;
  public fullName: string; // Auto-generated

  // Encrypted PII Data
  public encryptedData: EncryptedPersonalData;

  // Benefits Information
  public benefitInfo: BenefitInfo;

  // Categorization
  public category: PassengerCategory;
  public specialRequirements: SpecialRequirements;

  // Company Structure
  public department?: string;
  public position?: string;
  public costCenterId?: string;
  public isCompanyManager: boolean;

  // Metadata
  public dataSource: DataSource;
  public importBatchId?: string;
  public verificationStatus: VerificationStatus;
  public lastVerifiedDate?: Date;

  // Audit
  public createdBy?: string;
  public updatedBy?: string;

  // Optional relations (loaded when needed)
  public company?: B2BCompany;
  public employee?: B2BUser;
  public costCenter?: CostCenter;

  constructor(data: Partial<PassengerData>) {
    super();
    Object.assign(this, data);
    this.ensureDefaults();
  }

  private ensureDefaults(): void {
    this.benefitInfo = this.benefitInfo || {
      hasBenefits: false,
      isVerified: false
    };

    this.encryptedData = this.encryptedData || {};

    this.specialRequirements = this.specialRequirements || {
      requiresSpecialAssistance: false,
      isVip: false
    };

    this.category = this.category || PassengerCategory.ADULT;
    this.dataSource = this.dataSource || DataSource.MANUAL;
    this.verificationStatus = this.verificationStatus || VerificationStatus.PENDING;
    this.isCompanyManager = this.isCompanyManager || false;

    // Auto-generate full name
    this.updateFullName();
  }

  private updateFullName(): void {
    const parts = [this.lastName, this.firstName];
    if (this.middleName) {
      parts.push(this.middleName);
    }
    this.fullName = parts.join(' ');
  }

  // Age calculation
  public getAge(asOf: Date = new Date()): number {
    const today = new Date(asOf);
    const birthDate = new Date(this.birthDate);

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  // Category validation based on age
  public validateCategory(): boolean {
    const age = this.getAge();

    switch (this.category) {
      case PassengerCategory.CHILD:
        return age < 12;
      case PassengerCategory.STUDENT:
        return age >= 18 && age <= 25;
      case PassengerCategory.SENIOR:
        return age >= 60;
      case PassengerCategory.DISABLED:
        return this.benefitInfo.benefitType === 'disabled';
      case PassengerCategory.ADULT:
      default:
        return age >= 12;
    }
  }

  // Benefits validation
  public validateBenefits(): boolean {
    if (!this.benefitInfo.hasBenefits) {
      return true; // No benefits to validate
    }

    // Check if benefits are expired
    if (this.benefitInfo.expiryDate && this.benefitInfo.expiryDate < new Date()) {
      return false;
    }

    // Check if benefits are verified
    return this.benefitInfo.isVerified;
  }

  // Check if passenger requires special consideration for booking
  public requiresSpecialBookingConsideration(): boolean {
    return (
      this.specialRequirements.requiresSpecialAssistance ||
      this.specialRequirements.isVip ||
      this.specialRequirements.medicalConditions?.length > 0 ||
      this.specialRequirements.dietaryRestrictions?.length > 0
    );
  }

  // Check if passenger is eligible for discounted fare
  public isEligibleForDiscountedFare(): boolean {
    return (
      this.benefitInfo.hasBenefits &&
      this.benefitInfo.isVerified &&
      (
        this.category === PassengerCategory.CHILD ||
        this.category === PassengerCategory.STUDENT ||
        this.category === PassengerCategory.SENIOR ||
        this.category === PassengerCategory.DISABLED
      )
    );
  }

  // Get discount percentage based on category and benefits
  public getDiscountPercentage(): number {
    if (!this.isEligibleForDiscountedFare()) {
      return 0;
    }

    switch (this.category) {
      case PassengerCategory.CHILD:
        return 50; // 50% discount for children
      case PassengerCategory.STUDENT:
        return 25; // 25% discount for students
      case PassengerCategory.SENIOR:
        return 30; // 30% discount for seniors
      case PassengerCategory.DISABLED:
        return 75; // 75% discount for disabled
      default:
        return 0;
    }
  }

  // Data validation
  public validate(): string[] {
    const errors: string[] = [];

    // Required fields
    if (!this.lastName?.trim()) errors.push('Last name is required');
    if (!this.firstName?.trim()) errors.push('First name is required');
    if (!this.birthDate) errors.push('Birth date is required');
    if (!this.companyId) errors.push('Company ID is required');

    // Name validation
    if (this.lastName && this.lastName.length > 100) {
      errors.push('Last name must be 100 characters or less');
    }
    if (this.firstName && this.firstName.length > 100) {
      errors.push('First name must be 100 characters or less');
    }
    if (this.middleName && this.middleName.length > 100) {
      errors.push('Middle name must be 100 characters or less');
    }

    // Birth date validation
    if (this.birthDate) {
      const age = this.getAge();
      if (age < 0) errors.push('Birth date cannot be in the future');
      if (age > 120) errors.push('Birth date suggests invalid age');
    }

    // Benefits validation
    if (this.benefitInfo.hasBenefits) {
      if (!this.benefitInfo.benefitType) {
        errors.push('Benefit type is required when benefits are enabled');
      }

      if (this.benefitInfo.expiryDate && this.benefitInfo.expiryDate < new Date()) {
        errors.push('Benefits have expired');
      }
    }

    // Category validation
    if (!Object.values(PassengerCategory).includes(this.category)) {
      errors.push('Invalid passenger category');
    }

    // Verification status validation
    if (!Object.values(VerificationStatus).includes(this.verificationStatus)) {
      errors.push('Invalid verification status');
    }

    // Data source validation
    if (!Object.values(DataSource).includes(this.dataSource)) {
      errors.push('Invalid data source');
    }

    return errors;
  }

  // Safe data export (without sensitive information)
  public toSafeObject(): Partial<PassengerData> {
    return {
      id: this.id,
      companyId: this.companyId,
      employeeId: this.employeeId,
      lastName: this.lastName,
      firstName: this.firstName,
      middleName: this.middleName,
      fullName: this.fullName,
      birthDate: this.birthDate,
      benefitInfo: this.benefitInfo,
      category: this.category,
      specialRequirements: this.specialRequirements,
      department: this.department,
      position: this.position,
      costCenterId: this.costCenterId,
      isCompanyManager: this.isCompanyManager,
      dataSource: this.dataSource,
      verificationStatus: this.verificationStatus,
      lastVerifiedDate: this.lastVerifiedDate,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Update personal information
  public updatePersonalInfo(data: {
    lastName?: string;
    firstName?: string;
    middleName?: string;
    birthDate?: Date;
  }): void {
    if (data.lastName !== undefined) this.lastName = data.lastName;
    if (data.firstName !== undefined) this.firstName = data.firstName;
    if (data.middleName !== undefined) this.middleName = data.middleName;
    if (data.birthDate !== undefined) this.birthDate = data.birthDate;

    this.updateFullName();
  }

  // Update encrypted data
  public updateEncryptedData(data: Partial<EncryptedPersonalData>): void {
    this.encryptedData = { ...this.encryptedData, ...data };
  }

  // Update benefits information
  public updateBenefits(data: Partial<BenefitInfo>): void {
    this.benefitInfo = { ...this.benefitInfo, ...data };
  }

  // Update special requirements
  public updateSpecialRequirements(data: Partial<SpecialRequirements>): void {
    this.specialRequirements = { ...this.specialRequirements, ...data };
  }

  // Verify passenger data
  public verify(verifiedBy: string, notes?: string): void {
    this.verificationStatus = VerificationStatus.VERIFIED;
    this.lastVerifiedDate = new Date();
    this.updatedBy = verifiedBy;
  }

  // Mark data as expired
  public markAsExpired(): void {
    this.verificationStatus = VerificationStatus.EXPIRED;
    if (this.benefitInfo.hasBenefits) {
      this.benefitInfo.isVerified = false;
    }
  }

  // Clone passenger data
  public clone(): PassengerData {
    const cloned = new PassengerData({
      ...this,
      id: undefined, // Remove ID for new record
      createdAt: undefined,
      updatedAt: undefined
    });
    return cloned;
  }

  // Compare with another passenger record
  public matches(other: PassengerData): boolean {
    return (
      this.lastName?.toLowerCase() === other.lastName?.toLowerCase() &&
      this.firstName?.toLowerCase() === other.firstName?.toLowerCase() &&
      this.middleName?.toLowerCase() === other.middleName?.toLowerCase() &&
      this.birthDate?.getTime() === other.birthDate?.getTime()
    );
  }

  // Export to CSV-friendly format
  public toCsvRow(): Record<string, string | null> {
    return {
      id: this.id || '',
      lastName: this.lastName || '',
      firstName: this.firstName || '',
      middleName: this.middleName || null,
      fullName: this.fullName || '',
      birthDate: this.birthDate ? this.birthDate.toISOString().split('T')[0] : '',
      hasBenefits: this.benefitInfo.hasBenefits ? 'Yes' : 'No',
      benefitType: this.benefitInfo.benefitType || null,
      benefitVerified: this.benefitInfo.isVerified ? 'Yes' : 'No',
      category: this.category,
      department: this.department || null,
      position: this.position || null,
      isVip: this.specialRequirements.isVip ? 'Yes' : 'No',
      requiresSpecialAssistance: this.specialRequirements.requiresSpecialAssistance ? 'Yes' : 'No',
      verificationStatus: this.verificationStatus,
      dataSource: this.dataSource,
      createdAt: this.createdAt ? this.createdAt.toISOString() : ''
    };
  }

  // Import from CSV row
  static fromCsvRow(row: Record<string, string>): PassengerData {
    return new PassengerData({
      lastName: row.lastName || '',
      firstName: row.firstName || '',
      middleName: row.middleName || undefined,
      birthDate: row.birthDate ? new Date(row.birthDate) : new Date(),
      benefitInfo: {
        hasBenefits: row.hasBenefits?.toLowerCase() === 'yes',
        benefitType: row.benefitType as any || undefined,
        isVerified: row.benefitVerified?.toLowerCase() === 'yes'
      },
      category: row.category as PassengerCategory || PassengerCategory.ADULT,
      department: row.department || undefined,
      position: row.position || undefined,
      specialRequirements: {
        requiresSpecialAssistance: row.requiresSpecialAssistance?.toLowerCase() === 'yes',
        isVip: row.isVip?.toLowerCase() === 'yes'
      },
      verificationStatus: row.verificationStatus as VerificationStatus || VerificationStatus.PENDING,
      dataSource: row.dataSource as DataSource || DataSource.CSV_IMPORT
    });
  }
}