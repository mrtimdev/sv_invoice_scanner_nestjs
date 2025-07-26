// invoice-data.dto.ts
import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';

export class InvoiceDataDto {
  @ApiProperty({ description: 'Raw OCR text' })
  rawText: string;

  @ApiProperty({
    description: 'All extracted fields',
    type: 'object',
    additionalProperties: {
      type: 'any',
    },
    example: {
      saleOrderCode: 'STT4',
      documentNumber: '68133113',
      documentDate: '08,06,2025',
      warehouse: 'WF11-FG Warehouse'
    }
  })
  extractedData: Record<string, any>;
}