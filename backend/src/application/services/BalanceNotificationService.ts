import { CorporateAccount, TransactionLog, UserSpendingLimit } from '../../domain/entities';
import { CorporateAccountService } from './CorporateAccountService';
import { UserSpendingLimitService } from './UserSpendingLimitService';
import { B2BCompanyService } from './B2BCompanyService';
import { EmailService } from './EmailService';
import { SMSService } from './SMSService';
import { B2BAuditService } from './B2BAuditService';

export interface NotificationChannel {
  email?: boolean;
  sms?: boolean;
  push?: boolean;
  webhook?: boolean;
}

export interface NotificationSettings {
  lowBalanceThreshold: number;
  criticalBalanceThreshold: number;
  warningDaysBeforeExpiry: number;
  channels: NotificationChannel;
  recipients: {
    administrators: string[];
    finance: string[];
    managers: string[];
  };
}

export interface BalanceAlert {
  accountId: string;
  companyId: string;
  accountBalance: number;
  threshold: number;
  alertType: 'warning' | 'critical' | 'depleted';
  utilizationPercentage: number;
  daysOfOperationsRemaining?: number;
  recommendedTopupAmount?: number;
  lastDepositDate?: Date;
  averageDailySpend?: number;
}

export interface LimitAlert {
  limitId: string;
  userId: string;
  companyId: string;
  limitType: string;
  currentSpend: number;
  limitAmount: number;
  utilizationPercentage: number;
  daysRemaining?: number;
  warningLevel: 'warning' | 'critical' | 'exceeded';
}

export interface NotificationResult {
  success: boolean;
  alertId: string;
  sentVia: string[];
  failedVia: string[];
  errors?: string[];
}

export class BalanceNotificationService {
  constructor(
    private readonly corporateAccountService: CorporateAccountService,
    private readonly userSpendingLimitService: UserSpendingLimitService,
    private readonly b2bCompanyService: B2BCompanyService,
    private readonly emailService: EmailService,
    private readonly smsService: SMSService,
    private readonly auditService: B2BAuditService
  ) {}

  /**
   * Проверяет и отправляет уведомления о низком балансе
   */
  async checkAndSendBalanceNotifications(): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    try {
      // Получаем счета, требующие уведомлений
      const accounts = await this.corporateAccountService.getAccountsRequiringLowBalanceAlert();

      for (const account of accounts) {
        const company = await this.b2bCompanyService.getCompanyById(account.companyId);
        if (!company || !company.isActive) continue;

        const alert = await this.createBalanceAlert(account);
        const result = await this.sendBalanceAlert(alert, company);
        results.push(result);

        if (result.success) {
          await this.corporateAccountService.markLowBalanceAlertSent(account.id);
          await this.auditService.logBalanceAlert(account.companyId, alert);
        }
      }

      // Проверяем критический баланс (даже если уведомление уже было отправлено)
      const allAccounts = await this.getAllCorporateAccounts();
      for (const account of allAccounts) {
        if (this.isCriticalBalance(account)) {
          const alert = await this.createBalanceAlert(account, 'critical');
          const company = await this.b2bCompanyService.getCompanyById(account.companyId);
          if (company && company.isActive) {
            const result = await this.sendBalanceAlert(alert, company, true); // Принудительно отправить
            results.push(result);
          }
        }
      }

    } catch (error) {
      console.error('Error checking balance notifications:', error);
    }

    return results;
  }

  /**
   * Проверяет и отправляет уведомления о лимитах пользователей
   */
  async checkAndSendLimitNotifications(): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    try {
      // Получаем лимиты, требующие предупреждений
      const limits = await this.userSpendingLimitService.getLimitsRequiringWarnings();

      for (const limit of limits) {
        const alert = await this.createLimitAlert(limit);
        const company = await this.b2bCompanyService.getCompanyById(limit.companyId);
        if (!company || !company.isActive) continue;

        const result = await this.sendLimitAlert(alert, company);
        results.push(result);

        if (result.success) {
          await this.userSpendingLimitService.markWarningSent(limit.id);
          await this.auditService.logLimitAlert(limit.companyId, alert);
        }
      }

      // Проверяем просроченные лимиты
      const expiredLimits = await this.userSpendingLimitService.getExpiredLimits();
      for (const limit of expiredLimits) {
        const alert = await this.createLimitAlert(limit, 'critical');
        const company = await this.b2bCompanyService.getCompanyById(limit.companyId);
        if (company && company.isActive) {
          const result = await this.sendLimitAlert(alert, company, true);
          results.push(result);
        }
      }

    } catch (error) {
      console.error('Error checking limit notifications:', error);
    }

    return results;
  }

  /**
   * Создает алерт о балансе
   */
  private async createBalanceAlert(
    account: CorporateAccount,
    alertType: 'warning' | 'critical' = 'warning'
  ): Promise<BalanceAlert> {
    const utilizationPercentage = account.getUtilizationPercentage();
    const daysOfOperationsRemaining = await this.calculateDaysOfOperationsRemaining(account);
    const averageDailySpend = await this.calculateAverageDailySpend(account.companyId);
    const recommendedTopupAmount = this.calculateRecommendedTopupAmount(account, averageDailySpend);

    return {
      accountId: account.id,
      companyId: account.companyId,
      accountBalance: account.currentDepositBalance,
      threshold: account.minimumBalanceThreshold,
      alertType: alertType === 'critical' || account.isOverdrawn() ? 'critical' : 'warning',
      utilizationPercentage,
      daysOfOperationsRemaining,
      recommendedTopupAmount,
      lastDepositDate: account.lastDepositDate,
      averageDailySpend
    };
  }

  /**
   * Создает алерт о лимите
   */
  private async createLimitAlert(
    limit: UserSpendingLimit,
    alertType: 'warning' | 'critical' | 'exceeded' = 'warning'
  ): Promise<LimitAlert> {
    const utilizationPercentage = limit.getUtilizationPercentage();
    const daysRemaining = limit.getCurrentPeriod()?.daysRemaining;

    let warningLevel: 'warning' | 'critical' | 'exceeded' = 'warning';
    if (limit.isOverLimit()) {
      warningLevel = 'exceeded';
    } else if (utilizationPercentage >= 95) {
      warningLevel = 'critical';
    }

    return {
      limitId: limit.id,
      userId: limit.userId,
      companyId: limit.companyId,
      limitType: limit.limitType,
      currentSpend: limit.currentSpend,
      limitAmount: limit.limitAmount,
      utilizationPercentage,
      daysRemaining,
      warningLevel
    };
  }

  /**
   * Отправляет алерт о балансе
   */
  private async sendBalanceAlert(
    alert: BalanceAlert,
    company: any,
    force: boolean = false
  ): Promise<NotificationResult> {
    const sentVia: string[] = [];
    const failedVia: string[] = [];
    const errors: string[] = [];

    const settings = await this.getNotificationSettings(company.id);
    const subject = this.getBalanceAlertSubject(alert);
    const content = this.generateBalanceAlertContent(alert, company);

    try {
      // Email уведомление
      if ((settings.channels.email || force) && settings.recipients.administrators.length > 0) {
        try {
          await this.emailService.sendEmail({
            to: settings.recipients.administrators,
            subject,
            html: content.html,
            text: content.text
          });
          sentVia.push('email');
        } catch (error) {
          failedVia.push('email');
          errors.push(`Email failed: ${error}`);
        }
      }

      // SMS уведомление (только для критических алертов)
      if (alert.alertType === 'critical' && (settings.channels.sms || force)) {
        try {
          const smsContent = this.generateSMSAlertContent(alert);
          await this.smsService.sendSMS({
            to: settings.recipients.administrators,
            message: smsContent
          });
          sentVia.push('sms');
        } catch (error) {
          failedVia.push('sms');
          errors.push(`SMS failed: ${error}`);
        }
      }

    } catch (error) {
      errors.push(`General error: ${error}`);
    }

    return {
      success: sentVia.length > 0,
      alertId: `balance_${alert.accountId}_${Date.now()}`,
      sentVia,
      failedVia,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Отправляет алерт о лимите
   */
  private async sendLimitAlert(
    alert: LimitAlert,
    company: any,
    force: boolean = false
  ): Promise<NotificationResult> {
    const sentVia: string[] = [];
    const failedVia: string[] = [];
    const errors: string[] = [];

    const settings = await this.getNotificationSettings(company.id);
    const subject = this.getLimitAlertSubject(alert);
    const content = this.generateLimitAlertContent(alert, company);

    try {
      // Email уведомление
      if ((settings.channels.email || force) && settings.recipients.managers.length > 0) {
        try {
          await this.emailService.sendEmail({
            to: settings.recipients.managers,
            subject,
            html: content.html,
            text: content.text
          });
          sentVia.push('email');
        } catch (error) {
          failedVia.push('email');
          errors.push(`Email failed: ${error}`);
        }
      }

      // SMS уведомление для критических и превышенных лимитов
      if (alert.warningLevel !== 'warning' && (settings.channels.sms || force)) {
        try {
          const smsContent = this.generateLimitSMSContent(alert);
          await this.smsService.sendSMS({
            to: settings.recipients.managers,
            message: smsContent
          });
          sentVia.push('sms');
        } catch (error) {
          failedVia.push('sms');
          errors.push(`SMS failed: ${error}`);
        }
      }

    } catch (error) {
      errors.push(`General error: ${error}`);
    }

    return {
      success: sentVia.length > 0,
      alertId: `limit_${alert.limitId}_${Date.now()}`,
      sentVia,
      failedVia,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Расчитывает количество дней работы до истощения баланса
   */
  private async calculateDaysOfOperationsRemaining(account: CorporateAccount): Promise<number | undefined> {
    if (account.currentDepositBalance <= 0) return 0;

    try {
      const averageDailySpend = await this.calculateAverageDailySpend(account.companyId);
      if (averageDailySpend && averageDailySpend > 0) {
        return Math.floor(account.currentDepositBalance / averageDailySpend);
      }
    } catch (error) {
      console.error('Error calculating days remaining:', error);
    }

    return undefined;
  }

  /**
   * Расчитывает средние дневные траты компании
   */
  private async calculateAverageDailySpend(companyId: string): Promise<number | undefined> {
    try {
      // Получаем транзакции за последние 30 дней
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const transactions = await this.corporateAccountService.getTransactionHistory(companyId, {
        startDate: thirtyDaysAgo,
        transactionType: 'withdrawal'
      });

      const totalSpent = transactions.reduce((sum, txn) => sum + txn.amount, 0);
      return totalSpent / 30; // Среднее в день
    } catch (error) {
      console.error('Error calculating average daily spend:', error);
      return undefined;
    }
  }

  /**
   * Расчитывает рекомендуемую сумму пополнения
   */
  private calculateRecommendedTopupAmount(
    account: CorporateAccount,
    averageDailySpend?: number
  ): number | undefined {
    if (!averageDailySpend || averageDailySpend <= 0) return undefined;

    // Рекомендуем пополнить на 30 дней работы + 20% запас
    const thirtyDayRequirement = averageDailySpend * 30;
    const minimumRequired = account.minimumBalanceThreshold || 10000;
    const recommendedAmount = Math.max(thirtyDayRequirement * 1.2, minimumRequired * 2);

    // Если баланс отрицательный, добавляем сумму для покрытия долга
    if (account.currentDepositBalance < 0) {
      return recommendedAmount + Math.abs(account.currentDepositBalance);
    }

    return recommendedAmount;
  }

  /**
   * Проверяет, является ли баланс критическим
   */
  private isCriticalBalance(account: CorporateAccount): boolean {
    const criticalThreshold = (account.minimumBalanceThreshold || 10000) * 0.5;
    return account.currentDepositBalance <= criticalThreshold || account.isOverdrawn();
  }

  /**
   * Получает настройки уведомлений для компании
   */
  private async getNotificationSettings(companyId: string): Promise<NotificationSettings> {
    // Здесь должна быть логика получения настроек из БД
    // Пока возвращаем настройки по умолчанию
    return {
      lowBalanceThreshold: 25000,
      criticalBalanceThreshold: 10000,
      warningDaysBeforeExpiry: 7,
      channels: {
        email: true,
        sms: true,
        push: false,
        webhook: false
      },
      recipients: {
        administrators: [], // Должны быть получены из БД
        finance: [],
        managers: []
      }
    };
  }

  /**
   * Генерирует тему письма для алерта о балансе
   */
  private getBalanceAlertSubject(alert: BalanceAlert): string {
    switch (alert.alertType) {
      case 'critical':
        return `🚨 КРИТИЧЕСКИ НИЗКИЙ БАЛАНС: ${this.formatCurrency(alert.accountBalance)}`;
      case 'warning':
        return `⚠️ Низкий баланс на корпоративном счете`;
      case 'depleted':
        return `❌ Баланс на счете исчерпан`;
      default:
        return 'Уведомление о балансе';
    }
  }

  /**
   * Генерирует контент алерта о балансе
   */
  private generateBalanceAlertContent(alert: BalanceAlert, company: any): {
    html: string;
    text: string;
  } {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: ${alert.alertType === 'critical' ? '#dc3545' : '#ffc107'}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">
            ${alert.alertType === 'critical' ? '🚨 КРИТИЧЕСКИ НИЗКИЙ БАЛАНС' : '⚠️ НИЗКИЙ БАЛАНС'}
          </h1>
        </div>

        <div style="padding: 20px; background: #f8f9fa;">
          <h2 style="color: #333; margin-top: 0;">Компания: ${company.name}</h2>

          <div style="background: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p style="margin: 5px 0; font-size: 16px;"><strong>Текущий баланс:</strong>
              <span style="color: ${alert.accountBalance < 0 ? '#dc3545' : '#333'}; font-size: 18px;">
                ${this.formatCurrency(alert.accountBalance)}
              </span>
            </p>
            <p style="margin: 5px 0; font-size: 16px;"><strong>Пороговое значение:</strong> ${this.formatCurrency(alert.threshold)}</p>
            <p style="margin: 5px 0; font-size: 16px;"><strong>Использовано средств:</strong> ${alert.utilizationPercentage.toFixed(1)}%</p>

            ${alert.daysOfOperationsRemaining !== undefined ?
              `<p style="margin: 5px 0; font-size: 16px;"><strong>Дней работы осталось:</strong> ${alert.daysOfOperationsRemaining}</p>` : ''
            }

            ${alert.recommendedTopupAmount ?
              `<p style="margin: 5px 0; font-size: 16px;"><strong>Рекомендуемое пополнение:</strong> ${this.formatCurrency(alert.recommendedTopupAmount)}</p>` : ''
            }
          </div>

          ${alert.alertType === 'critical' ? `
            <div style="background: #dc3545; color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
              <p style="margin: 0; font-weight: bold;">⚠️ СРОЧНО ПОПОЛНИТЕ СЧЕТ!</p>
              <p style="margin: 5px 0;">Баланс критически низкий. Возможны срывы командировок и бизнес-процессов.</p>
            </div>
          ` : ''}

          <div style="margin-top: 20px; text-align: center;">
            <a href="#" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              Пополнить счет
            </a>
          </div>
        </div>
      </div>
    `;

    const text = `
Уведомление о балансе - ${company.name}

${alert.alertType === 'critical' ? 'КРИТИЧЕСКИ НИЗКИЙ БАЛАНС!' : 'Низкий баланс на счете'}

Текущий баланс: ${this.formatCurrency(alert.accountBalance)}
Пороговое значение: ${this.formatCurrency(alert.threshold)}
Использовано средств: ${alert.utilizationPercentage.toFixed(1)}%

${alert.daysOfOperationsRemaining !== undefined ? `Дней работы осталось: ${alert.daysOfOperationsRemaining}` : ''}
${alert.recommendedTopupAmount ? `Рекомендуемое пополнение: ${this.formatCurrency(alert.recommendedTopupAmount)}` : ''}

${alert.alertType === 'critical' ? '\nСРОЧНО ПОПОЛНИТЕ СЧЕТ! Баланс критически низкий.' : ''}

Для пополнения счета войдите в B2B портал.
    `;

    return { html, text };
  }

  /**
   * Генерирует SMS контент
   */
  private generateSMSAlertContent(alert: BalanceAlert): string {
    const alertType = alert.alertType === 'critical' ? 'КРИТИЧЕСКИ' : 'НИЗКИЙ';
    return `Баланс ${alertType}: ${this.formatCurrency(alert.accountBalance)}. Порог: ${this.formatCurrency(alert.threshold)}. Срочно пополните счет в B2B портале.`;
  }

  /**
   * Форматирует валюту
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB'
    }).format(amount);
  }

  // Вспомогательные методы для алертов о лимитах
  private getLimitAlertSubject(alert: LimitAlert): string {
    const level = alert.warningLevel === 'critical' ? 'КРИТИЧЕСКОЕ' :
                  alert.warningLevel === 'exceeded' ? 'ПРЕВЫШЕНИЕ' : 'Предупреждение';
    return `${level}: Лимит ${alert.limitType} использован на ${alert.utilizationPercentage.toFixed(1)}%`;
  }

  private generateLimitAlertContent(alert: LimitAlert, company: any): { html: string; text: string; } {
    // Логика генерации контента для алертов о лимитах
    // Аналогично generateBalanceAlertContent
    return {
      html: `<p>Alert content for limit: ${alert.limitType}</p>`,
      text: `Alert text for limit: ${alert.limitType}`
    };
  }

  private generateLimitSMSContent(alert: LimitAlert): string {
    const level = alert.warningLevel === 'critical' ? 'КРИТИЧЕСКОЕ' :
                  alert.warningLevel === 'exceeded' ? 'ПРЕВЫШЕНИЕ' : 'Предупреждение';
    return `${level}: Лимит ${alert.limitType} использован на ${alert.utilizationPercentage.toFixed(1)}%.`;
  }

  // Вспомогательные методы
  private async getAllCorporateAccounts(): Promise<CorporateAccount[]> {
    // Должен быть реализован в репозитории
    return [];
  }

  private async getExpiredLimits(): Promise<UserSpendingLimit[]> {
    // Должен быть реализован в репозитории
    return [];
  }
}