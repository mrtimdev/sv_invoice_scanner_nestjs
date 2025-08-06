// text-parser.service.ts
import { Injectable } from '@nestjs/common';


interface ExtractedCodes {
    dealerCode?: string;
    securityCode?: string;
    noCodes: string[];
    saleOrder?: string;
    route?: string;
    vehicleNo?: string;
}

@Injectable()
export class TextParserService {
    extractDocumentFields(text: string) {
        const patterns: { [key: string]: RegExp } = {
            dealerCode: /dealer\s*code\s*([^\n]+)/i,
            route: /route\s*([^\n]+)/i,
            saleOrder: /sale\s*order\s*([^\n]+)/i,
            warehouse: /warehouse\s*([^\n]+)/i,
            vendorCode: /vendor\s*code\s*([^\n]+)/i,
            vehicleNo: /vehicle\s*no\s*([^\n]+)/i,
        };

        const keywords = [
            'Effective Date',
            'Dealer code',
            'SALE ORDER',
            'DELIVERY ORDER',
            'WAREHOUSE'
        ];



        const results: { [key: string]: string | string[] | null | Record<string, string[]> } = {};
        for (const [key, regex] of Object.entries(patterns)) {
            const match = regex.exec(text);
            results[key] = match ? match[1].trim() : null;
        }

        results.effectiveDate = this.extractEffectiveDate(text);
        results.no = this.extractLinesBelowNo(text);
        results.invoiceDate = this.extractPdDate(text);

        return results;
    }


    // new

    private extractVendorCodeAndNo(text: string): { vendorCode?: string; number?: string } {
        const lines = text.split('\n').map(line => line.trim());
        let vendorCode: string | undefined;
        let number: string | undefined;

        lines.forEach((line, index) => {
            if (line.toLowerCase().includes('vendor code') && index + 1 < lines.length) {
            const nextLine = lines[index + 1];
            if (/^\d+$/.test(nextLine)) {
                vendorCode = nextLine;
            }
            }

            if (line.toLowerCase().startsWith('no.') && index + 1 < lines.length) {
            const nextLine = lines[index + 1];
            if (/^\d+$/.test(nextLine)) {
                number = nextLine;
            }
            }
        });

        return { vendorCode, number };
    }

    private extractLinesBelowNo(text: string): string[] {
        const lines = text.split('\n').map(line => line.trim());
        const result: string[] = [];

        const startIndex = lines.findIndex(line => /^no[:.]?$/i.test(line));
        if (startIndex === -1) return [];

        // Look at next 1–3 lines after "No."
        for (let i = startIndex + 1; i < lines.length; i++) {
            const line = lines[i];
            if (line === '' || /^[A-Z\s-]{3,}$/.test(line)) break; // stop if new section/title line
            result.push(line);
        }

        return result;
    }


    private extractPdDate(text: string): string | null {
        const regex = /PD[:：]?\s*([0-9]{2}[,\.][0-9]{2}[,\.][0-9]{4})/i;
        const match = text.match(regex);
        return match ? match[1].replace(/,/g, ".") : null;
    }


    private extractDocumentNumber(text: string): string | null {
        const match = text.match(/^(KHB-LOG-AWAR-FOR-\d{3}-\d{3})/m);
        return match?.[1] || null;
    }

    private extractEffectiveDate(text: string): string | null {
        const formats = [
            /effective\s*date\s*:\s*(\d{2}-\d{2}-\d{4})/i,
            /effective\s*date\s*[\s:]*([^\n]+)/i,
            /tive\s*date\s*[\s:]*([^\n]+)/i,
            /(?:eff|exp|valid).*date\s*[\s:]*([^\n]+)/i
        ];

        for (const regex of formats) {
        const match = regex.exec(text);
        if (match) {
            return this.normalizeDate(match[1].trim());
        }
        }
        return null;
    }

    private extractStandardFields(text: string) {
        const patterns: { [key: string]: RegExp } = {
            dealerCode: /dealer\s*code\s*([^\n]+)/i,
            route: /route\s*([^\n]+)/i,
            saleOrder: /sale\s*order\s*([^\n]+)/i,
            warehouse: /warehouse\s*([^\n]+)/i,
            vendorCode: /vendor\s*code\s*([^\n]+)/i,
            vehicleNo: /vehicle\s*no\s*([^\n]+)/i,
        };

        const keywords = [
            'Effective Date',
            'Dealer code',
            'SALE ORDER',
            'DELIVERY ORDER',
            'WAREHOUSE'
        ];



        const results: { [key: string]: string | string[] | null | Record<string, string[]> } = {};
        for (const [key, regex] of Object.entries(patterns)) {
            const match = regex.exec(text);
            results[key] = match ? match[1].trim() : null;
        }

        results.effectiveDate = this.extractEffectiveDate(text);
        results.no = this.extractLinesBelowNo(text);
        results.invoiceDate = this.extractPdDate(text);

        return results;
    }




    extractCodesWithContext(text: string): ExtractedCodes {
        const result: ExtractedCodes = { noCodes: [] };

        // Helper: clean and normalize whitespace/newlines
        const normalizedText = text.replace(/\r\n|\n|\r/g, ' ').replace(/\s+/g, ' ');

        // 1. Extract Dealer Code (number near "DEALER CODE")
        const dealerCodeMatch = normalizedText.match(/DEALER CODE[:\s]*([\d|I]{7,15})/i);
        if (dealerCodeMatch) result.dealerCode = dealerCodeMatch[1];

        // 2. Extract Security Code (number near "SECURITYAT" or "SECURITY")
        const securityCodeMatch = normalizedText.match(/SECURITY(?:AT)?[:\s]*([\d]{5,15})/i);
        if (securityCodeMatch) result.securityCode = securityCodeMatch[1];

        // 3. Extract all "No." numbers (like under "No." header)
        const noMatches = [...normalizedText.matchAll(/No\.?\s*[:\-]?\s*([\w\d'-]+)/gi)];
        if (noMatches.length > 0) {
            result.noCodes = noMatches.map(m => m[1]);
        }

        // 4. Extract Sale Order (near SALE ORDER or in parentheses after dealer name)
        const saleOrderMatch = normalizedText.match(/SALE ORDER[:\s]*([A-Z0-9]+)/i)
            || normalizedText.match(/\((STT\d+)\)/i);
        if (saleOrderMatch) result.saleOrder = saleOrderMatch[1];

        // 5. Extract Route (look for "ROUTE" or similar patterns)
        const routeMatch = normalizedText.match(/ROUTE[:\s]*([\w\-\>\s]+)/i);
        if (routeMatch) result.route = routeMatch[1].trim();

        // 6. Extract Vehicle No (near VEHICLE NO or VEHICLE No)
        const vehicleNoMatch = normalizedText.match(/VEHICLE\s*No\.?[:\s]*([\w'\d]+)/i);
        if (vehicleNoMatch) result.vehicleNo = vehicleNoMatch[1];

        return result;
    }



    extractNoSectionValues(text: string): string[] {
        const lines = text.split(/\r?\n/).map(l => l.trim());

        // Find the line with 'No.'
        const noIndex = lines.findIndex(line => /^No\.?$/i.test(line));
        if (noIndex === -1) return [];

        const values: string[] = [];

        // Start reading lines after 'No.' line
        for (let i = noIndex + 1; i < lines.length; i++) {
            const line = lines[i];
            
            // Stop if line is empty or looks like a new section header (all caps, or known keywords)
            if (
            line === '' ||
            /^[A-Z\s\-]+$/.test(line) ||  // all caps likely section header
            line.match(/^(DELIVERY ORDER|WAREHOUSE|ROUTE|VEHICLE No|SECURITY|GATE CHECK|SALE ORDER)/i)
            ) {
            break;
            }

            // Collect non-empty lines
            if (line.length > 0) {
            values.push(line);
            }
        }

        return values;
        }

   

    private extractVehicleDate(text: string): string | null {
        // Normalize the text by replacing common OCR errors
        const normalizedText = text
            .replace(/[Oo]/g, '0')  // Replace O/o with 0
            .replace(/[lI]/g, '1')  // Replace l/I with 1
            .replace(/[`',"]/g, ''); // Remove stray punctuation

        // Split into lines and clean each line
        const lines = normalizedText.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);

        // Find the line containing "VEHICLE No" (with OCR error tolerance)
        const vehicleNoIndex = lines.findIndex(line => 
            /vehicle\s*no/gi.test(line.replace(/[^a-z0-9]/gi, ' '))
        );

        if (vehicleNoIndex === -1 || vehicleNoIndex + 2 >= lines.length) {
            return null;
        }

        // The date should be two lines below VEHICLE No
        const dateLine = lines[vehicleNoIndex + 2];

        // Try to extract date in various formats
        const dateFormats = [
            /(\d{2})[,.\-](\d{2})[,.\-](\d{4})/,  // DD,MM,YYYY or DD-MM-YYYY
            /(\d{2})\s*([A-Za-z]+)\s*(\d{4})/,    // 08 Jun 2025
            /(\d{4})[,.\-](\d{2})[,.\-](\d{2})/   // YYYY-MM-DD
        ];

        for (const format of dateFormats) {
            const match = dateLine.match(format);
            if (match) {
                // Standardize to DD-MM-YYYY format
                if (format === dateFormats[0]) {
                    return `${match[1]}-${match[2]}-${match[3]}`;
                } else if (format === dateFormats[1]) {
                    return `${match[1]}-${this.monthToNumber(match[2])}-${match[3]}`;
                } else {
                    return `${match[3]}-${match[2]}-${match[1]}`;
                }
            }
        }

        return null;
    }

    private monthToNumber(monthStr: string): string {
        const months = [
            'jan', 'feb', 'mar', 'apr', 'may', 'jun',
            'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
        ];
        const monthLower = monthStr.toLowerCase().substring(0, 3);
        const monthIndex = months.indexOf(monthLower);
        return (monthIndex + 1).toString().padStart(2, '0');
    }

    private extractAdditionalFields(text: string) {
        return {
        dealerName: this.extractAfterLabel(text, 'dealer name & address'),
        deliveryBy: this.extractAfterLabel(text, 'delivery by'),
        securitySignature: this.extractAfterLabel(text, 'loaded by'),
        };
    }

    private extractItems(text: string) {
        const itemRegex = /(\d{10})\s+([^\n]+?)\s+(\d+)\s+(\d+)/g;
        const items: { code: string; description: string; quantityOrder: string; quantityDelivered: string }[] = [];
        let match: any[] | null;

        while ((match = itemRegex.exec(text)) !== null) {
        items.push({
            code: match[1],
            description: match[2].trim(),
            quantityOrder: match[3],
            quantityDelivered: match[4]
        });
        }

        return items;
    }

    private extractAfterLabel(text: string, label: string): string | null {
        const regex = new RegExp(`${label}[\\s:]*([^\\n]+)`, 'i');
        const match = regex.exec(text);
        return match ? match[1].trim() : null;
    }

    private normalizeDate(rawDate: string): string {
        // Handle multiple date formats
        const formats = [
        { regex: /^(\d{2})-(\d{2})-(\d{4})$/, handler: (m) => `${m[3]}-${m[2]}-${m[1]}` }, // DD-MM-YYYY
        { regex: /^(\d{2}),(\d{2}),(\d{4})$/, handler: (m) => `${m[3]}-${m[2]}-${m[1]}` }, // DD,MM,YYYY
        { regex: /^(\d{2})\/(\d{2})\/(\d{4})$/, handler: (m) => `${m[3]}-${m[2]}-${m[1]}` }  // DD/MM/YYYY
        ];

        for (const format of formats) {
        const match = rawDate.match(format.regex);
        if (match) return format.handler(match);
        }
        return rawDate;
    }
}