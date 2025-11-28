import { FinancialDocument } from '../../domain/entities/FinancialDocument';
import { StorageManager } from '../storage/StorageManager';
import { createHash } from 'crypto';
import * as PDFDocument from 'pdfkit';

export interface DocumentTemplate {
  header: {
    title: string;
    subtitle?: string;
    logo?: string;
  };
  companyInfo: {
    name: string;
    inn: string;
    kpp?: string;
    address: string;
    bankInfo: {
      name: string;
      account: string;
      bik: string;
    };
  };
  clientInfo: {
    name: string;
    inn?: string;
    kpp?: string;
    address?: string;
    bankInfo?: {
      name: string;
      account: string;
      bik: string;
    };
  };
  documentInfo: {
    number: string;
    date: string;
    periodStart: string;
    periodEnd: string;
  };
  services: Array<{
    name: string;
    quantity: number;
    unit: string;
    price: number;
    amount: number;
  }>;
  totals: {
    amount: number;
    vatRate: number;
    vatAmount: number;
    totalAmount: number;
  };
  signatures: {
    provider: {
      position: string;
      name: string;
    };
    client: {
      position: string;
      name: string;
    };
  };
}

export interface GeneratedDocument {
  filePath: string;
  fileName: string;
  fileSize: number;
  fileHash: string;
  downloadUrl: string;
}

export class DocumentGeneratorService {
  constructor(private storageManager: StorageManager) {}

  /**
   * Генерирует PDF документ
   */
  async generatePDF(document: FinancialDocument): Promise<GeneratedDocument> {
    const template = this.buildTemplate(document);
    const pdfBuffer = await this.createPDFBuffer(template);
    const fileName = this.generateFileName(document);
    const filePath = `documents/${document.companyId}/${fileName}`;

    // Сохраняем в MinIO
    const uploadResult = await this.storageManager.uploadFile(
      filePath,
      pdfBuffer,
      'application/pdf'
    );

    // Вычисляем хэш файла
    const fileHash = createHash('sha256').update(pdfBuffer).digest('hex');

    return {
      filePath: uploadResult.filePath,
      fileName,
      fileSize: pdfBuffer.length,
      fileHash,
      downloadUrl: uploadResult.url
    };
  }

  /**
   * Создает буфер PDF документа
   */
  private async createPDFBuffer(template: DocumentTemplate): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const buffers: Buffer[] = [];

      doc.on('data', (buffer) => buffers.push(buffer));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      try {
        this.renderDocument(doc, template);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Рендерит PDF документ
   */
  private renderDocument(doc: PDFKit.PDFDocument, template: DocumentTemplate): void {
    // Заголовок
    this.renderHeader(doc, template);

    // Шапка с реквизитами
    this.renderPartiesInfo(doc, template);

    // Информация о документе
    this.renderDocumentInfo(doc, template);

    // Таблица услуг
    this.renderServicesTable(doc, template);

    // Итоги
    this.renderTotals(doc, template);

    // Подписи
    this.renderSignatures(doc, template);

    // Печать и штамп (опционально)
    this.renderStamp(doc, template);
  }

  /**
   * Рендерит заголовок документа
   */
  private renderHeader(doc: PDFKit.PDFDocument, template: DocumentTemplate): void {
    doc.fontSize(18).font('Helvetica-Bold').text(template.header.title, {
      align: 'center',
      marginBottom: 10
    });

    if (template.header.subtitle) {
      doc.fontSize(12).font('Helvetica').text(template.header.subtitle, {
        align: 'center',
        marginBottom: 20
      });
    }
  }

  /**
   * Рендерит информацию о сторонах
   */
  private renderPartiesInfo(doc: PDFKit.PDFDocument, template: DocumentTemplate): void {
    const startX = 50;
    let currentY = doc.y + 20;

    // Исполнитель (слева)
    doc.fontSize(12).font('Helvetica-Bold').text('Исполнитель:', startX, currentY);
    currentY += 15;

    doc.fontSize(10).font('Helvetica').text(template.companyInfo.name, startX, currentY);
    currentY += 12;

    doc.text(`ИНН ${template.companyInfo.inn}`, startX, currentY);
    currentY += 12;

    if (template.companyInfo.kpp) {
      doc.text(`КПП ${template.companyInfo.kpp}`, startX, currentY);
      currentY += 12;
    }

    doc.text(`Адрес: ${template.companyInfo.address}`, startX, currentY);
    currentY += 12;

    doc.text(`р/с ${template.companyInfo.bankInfo.account}`, startX, currentY);
    currentY += 12;

    doc.text(`в ${template.companyInfo.bankInfo.name}`, startX, currentY);
    currentY += 12;

    doc.text(`БИК ${template.companyInfo.bankInfo.bik}`, startX, currentY);

    // Заказчик (справа)
    const clientStartX = 300;
    currentY = doc.y - 12 * 6 - 15; // Возвращаемся к началу

    doc.fontSize(12).font('Helvetica-Bold').text('Заказчик:', clientStartX, currentY);
    currentY += 15;

    doc.fontSize(10).font('Helvetica').text(template.clientInfo.name, clientStartX, currentY);
    currentY += 12;

    if (template.clientInfo.inn) {
      doc.text(`ИНН ${template.clientInfo.inn}`, clientStartX, currentY);
      currentY += 12;
    }

    if (template.clientInfo.kpp) {
      doc.text(`КПП ${template.clientInfo.kpp}`, clientStartX, currentY);
      currentY += 12;
    }

    if (template.clientInfo.address) {
      doc.text(`Адрес: ${template.clientInfo.address}`, clientStartX, currentY);
      currentY += 12;
    }

    if (template.clientInfo.bankInfo) {
      doc.text(`р/с ${template.clientInfo.bankInfo.account}`, clientStartX, currentY);
      currentY += 12;
      doc.text(`в ${template.clientInfo.bankInfo.name}`, clientStartX, currentY);
      currentY += 12;
      doc.text(`БИК ${template.clientInfo.bankInfo.bik}`, clientStartX, currentY);
    }

    doc.y = Math.max(
      doc.y,
      currentY + 20
    );
  }

  /**
   * Рендерит информацию о документе
   */
  private renderDocumentInfo(doc: PDFKit.PDFDocument, template: DocumentTemplate): void {
    doc.moveDown(20);

    const infoText = `АКТ № ${template.documentInfo.number} от ${template.documentInfo.date}`;
    doc.fontSize(14).font('Helvetica-Bold').text(infoText, { align: 'center', marginBottom: 15 });

    const periodText = `Период оказания услуг: с ${template.documentInfo.periodStart} по ${template.documentInfo.periodEnd}`;
    doc.fontSize(11).font('Helvetica').text(periodText, { align: 'center', marginBottom: 20 });
  }

  /**
   * Рендерит таблицу услуг
   */
  private renderServicesTable(doc: PDFKit.PDFDocument, template: DocumentTemplate): void {
    const tableTop = doc.y;
    const headers = ['№', 'Наименование услуги', 'Кол-во', 'Ед. изм.', 'Цена', 'Сумма'];
    const columnWidths = [30, 200, 50, 50, 70, 70];
    const rowHeight = 20;

    // Заголовки таблицы
    doc.fontSize(10).font('Helvetica-Bold');
    let currentX = 50;

    headers.forEach((header, index) => {
      doc.text(header, currentX, tableTop, {
        width: columnWidths[index],
        align: 'center'
      });
      currentX += columnWidths[index];
    });

    // Линия под заголовками
    doc.moveTo(50, tableTop + rowHeight)
      .lineTo(550, tableTop + rowHeight)
      .stroke();

    // Данные услуг
    doc.fontSize(9).font('Helvetica');
    let currentY = tableTop + rowHeight + 5;

    template.services.forEach((service, index) => {
      currentX = 50;

      // №
      doc.text((index + 1).toString(), currentX, currentY, {
        width: columnWidths[0],
        align: 'center'
      });
      currentX += columnWidths[0];

      // Наименование услуги
      doc.text(service.name, currentX, currentY, {
        width: columnWidths[1]
      });
      currentX += columnWidths[1];

      // Количество
      doc.text(service.quantity.toString(), currentX, currentY, {
        width: columnWidths[2],
        align: 'center'
      });
      currentX += columnWidths[2];

      // Единица измерения
      doc.text(service.unit, currentX, currentY, {
        width: columnWidths[3],
        align: 'center'
      });
      currentX += columnWidths[3];

      // Цена
      doc.text(this.formatCurrency(service.price), currentX, currentY, {
        width: columnWidths[4],
        align: 'right'
      });
      currentX += columnWidths[4];

      // Сумма
      doc.text(this.formatCurrency(service.amount), currentX, currentY, {
        width: columnWidths[5],
        align: 'right'
      });

      currentY += rowHeight;
    });

    // Линия под таблицей
    doc.moveTo(50, currentY)
      .lineTo(550, currentY)
      .stroke();

    doc.y = currentY + 20;
  }

  /**
   * Рендерит итоги
   */
  private renderTotals(doc: PDFKit.PDFDocument, template: DocumentTemplate): void {
    const totalsY = doc.y;
    const rightColumn = 400;

    // Итого
    doc.fontSize(11).font('Helvetica-Bold').text('Итого:', rightColumn, totalsY);
    doc.fontSize(11).font('Helvetica').text(
      this.formatCurrency(template.totals.amount),
      500,
      totalsY,
      { align: 'right' }
    );

    // НДС
    doc.fontSize(11).font('Helvetica-Bold').text(
      `НДС (${template.totals.vatRate}%):`,
      rightColumn,
      totalsY + 20
    );
    doc.fontSize(11).font('Helvetica').text(
      this.formatCurrency(template.totals.vatAmount),
      500,
      totalsY + 20,
      { align: 'right' }
    );

    // Всего
    doc.fontSize(12).font('Helvetica-Bold').text('Всего к оплате:', rightColumn, totalsY + 40);
    doc.fontSize(12).font('Helvetica-Bold').text(
      this.formatCurrency(template.totals.totalAmount),
      500,
      totalsY + 40,
      { align: 'right' }
    );

    // Сумма прописью
    const amountInWords = this.numberToWords(template.totals.totalAmount);
    doc.fontSize(10).font('Helvetica').text(
      `Всего наименований ${template.services.length}, на сумму ${this.formatCurrency(template.totals.totalAmount)}`,
      50,
      totalsY + 70,
      { width: 450 }
    );

    doc.text(
      `В том числе НДС ${this.formatCurrency(template.totals.vatAmount)}`,
      50,
      totalsY + 85,
      { width: 450 }
    );

    doc.text(
      amountInWords,
      50,
      totalsY + 100,
      { width: 450 }
    );

    doc.y = totalsY + 130;
  }

  /**
   * Рендерит подписи
   */
  private renderSignatures(doc: PDFKit.PDFDocument, template: DocumentTemplate): void {
    doc.moveDown(40);

    const signatureY = doc.y;
    const signatureWidth = 200;
    const middleX = 300;

    // Подпись исполнителя
    doc.fontSize(10).font('Helvetica').text('Исполнитель:', 50, signatureY);
    doc.text(`${template.signatures.provider.position}`, 50, signatureY + 15);
    doc.text('__________________ / _____________', 50, signatureY + 30);
    doc.text(`(подпись)         (${template.signatures.provider.name})`, 50, signatureY + 45);

    // Подпись заказчика
    doc.fontSize(10).font('Helvetica').text('Заказчик:', middleX, signatureY);
    doc.text(`${template.signatures.client.position}`, middleX, signatureY + 15);
    doc.text('__________________ / _____________', middleX, signatureY + 30);
    doc.text(`(подпись)         (${template.signatures.client.name})`, middleX, signatureY + 45);
  }

  /**
   * Рендерит печать и штамп (опционально)
   */
  private renderStamp(doc: PDFKit.PDFDocument, template: DocumentTemplate): void {
    // Место для печати
    const stampY = doc.y + 30;

    doc.rect(400, stampY, 80, 80).stroke();
    doc.fontSize(8).font('Helvetica').text('М.П.', 440, stampY + 35, { align: 'center' });
  }

  /**
   * Строит шаблон документа из сущности
   */
  private buildTemplate(document: FinancialDocument): DocumentTemplate {
    const services = this.extractServices(document);

    return {
      header: {
        title: this.getDocumentTitle(document),
        subtitle: this.getDocumentSubtitle(document)
      },
      companyInfo: {
        name: document.provider.name,
        inn: document.provider.inn!,
        kpp: document.provider.kpp,
        address: document.provider.address!,
        bankInfo: {
          name: document.provider.bankName!,
          account: document.provider.bankAccount!,
          bik: document.provider.bankBik!
        }
      },
      clientInfo: {
        name: document.client.name,
        inn: document.client.inn,
        kpp: document.client.kpp,
        address: document.client.address,
        bankInfo: document.client.bankAccount ? {
          name: document.client.bankName!,
          account: document.client.bankAccount!,
          bik: document.client.bankBik!
        } : undefined
      },
      documentInfo: {
        number: document.documentNumber,
        date: document.documentDate.toLocaleDateString('ru-RU'),
        periodStart: document.reportingPeriodStart.toLocaleDateString('ru-RU'),
        periodEnd: document.reportingPeriodEnd.toLocaleDateString('ru-RU')
      },
      services,
      totals: {
        amount: document.totalAmount,
        vatRate: document.vatAmount > 0 ? 20 : 0,
        vatAmount: document.vatAmount,
        totalAmount: document.totalAmount + document.vatAmount
      },
      signatures: {
        provider: {
          position: 'Генеральный директор',
          name: '________________'
        },
        client: {
          position: 'Генеральный директор',
          name: '________________'
        }
      }
    };
  }

  /**
   * Извлекает услуги из документа
   */
  private extractServices(document: FinancialDocument): Array<{
    name: string;
    quantity: number;
    unit: string;
    price: number;
    amount: number;
  }> {
    const services: Array<{
      name: string;
      quantity: number;
      unit: string;
      price: number;
      amount: number;
    }> = [];

    // Группируем по центрам затрат
    const costCenterGroups = document.costCenterSummary.reduce((groups, cc) => {
      const key = cc.costCenterName || 'Без центра затрат';
      if (!groups[key]) {
        groups[key] = { count: 0, amount: 0 };
      }
      groups[key].count += cc.transactionCount;
      groups[key].amount += cc.totalAmount;
      return groups;
    }, {} as Record<string, { count: number; amount: number }>);

    // Создаем услуги на основе групп
    Object.entries(costCenterGroups).forEach(([name, data]) => {
      const averagePrice = data.count > 0 ? data.amount / data.count : 0;

      services.push({
        name: `Организация поездок и услуг в рамках центра затрат: ${name}`,
        quantity: data.count,
        unit: 'усл.',
        price: averagePrice,
        amount: data.amount
      });
    });

    // Если нет центра затрат, создаем общую услугу
    if (services.length === 0) {
      services.push({
        name: document.contract.description || 'Организация поездок и сопутствующих услуг',
        quantity: document.transactionCount || 1,
        unit: 'усл.',
        price: document.totalAmount,
        amount: document.totalAmount
      });
    }

    return services;
  }

  /**
   * Возвращает заголовок документа
   */
  private getDocumentTitle(document: FinancialDocument): string {
    const titles = {
      act: 'АКТ',
      invoice: 'СЧЕТ-ФАКТУРА',
      upd: 'УНИВЕРСАЛЬНЫЙ ПЕРЕДАТОЧНЫЙ ДОКУМЕНТ',
      certificate: 'СЕРТИФИКАТ'
    };

    return titles[document.documentType] || 'ДОКУМЕНТ';
  }

  /**
   * Возвращает подзаголовок документа
   */
  private getDocumentSubtitle(document: FinancialDocument): string {
    const subtitles = {
      act: 'оказанных услуг',
      invoice: 'на оплату',
      upd: 'на передачу товаров (выполнение работ, оказание услуг)',
      certificate: 'оказанных услуг'
    };

    return subtitles[document.documentType] || '';
  }

  /**
   * Генерирует имя файла
   */
  private generateFileName(document: FinancialDocument): string {
    const date = document.documentDate.toISOString().slice(0, 10);
    const typePrefix = {
      act: 'ACT',
      invoice: 'INVOICE',
      upd: 'UPD',
      certificate: 'CERT'
    };

    return `${typePrefix[document.documentType]}_${document.documentNumber}_${date}.pdf`;
  }

  /**
   * Форматирует валюту
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }

  /**
   * Преобразует число в текст (для суммы прописью)
   */
  private numberToWords(amount: number): string {
    // Упрощенная реализация
    const integerPart = Math.floor(amount);
    const decimalPart = Math.round((amount - integerPart) * 100);

    // TODO: Реализовать полное преобразование в слова
    return `${this.formatCurrency(integerPart)} руб. ${decimalPart.toString().padStart(2, '0')} коп.`;
  }
}