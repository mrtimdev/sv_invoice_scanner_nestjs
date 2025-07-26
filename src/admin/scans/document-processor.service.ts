// document-processor.service.ts
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createWorker, PSM, OEM, Worker } from 'tesseract.js';


import * as FormData from 'form-data';
import fetch from 'node-fetch';

import * as fs from 'fs';


import { openAsBlob, writeFileSync } from 'node:fs';
import * as path from 'path';
import { AdminService } from '../admin.service';

const execAsync = promisify(exec);

@Injectable()
export class DocumentProcessorService {
  private readonly logger = new Logger(DocumentProcessorService.name);

  constructor(private readonly adminService: AdminService) {}

  async processDocument(file: Express.Multer.File) {
    const originalPath = join(process.cwd(), 'uploads/scans', file.filename);
    const filename = path.basename(originalPath);
    let croppedPath = join(process.cwd(), 'uploads', 'scans', `cropped-${filename}`);
    try {

      const setting = await this.adminService.getSetting();
      if (setting && setting.is_scan_with_ai) {
        await this.removeBackground(originalPath, croppedPath);
        console.log('AI Scan is enabled. Sending to background remover...');
      } else {
        croppedPath = originalPath; // Use original if AI is disabled
        console.log('AI Scan is disabled. Skipping AI processing.');
      }
      


      if (!existsSync(croppedPath)) {
        throw new InternalServerErrorException('Cropped image not generated');
      }

      this.logger.log(`Autocropped image saved to: ${croppedPath}`);

      // Step 2: Perform OCR
      const { text, confidence } = await this.performOCR(croppedPath);

      return {
        text,
        originalImage: `/uploads/scans/${file.filename}`,
        croppedImage: `/uploads/scans/autocropped-${file.filename}`,
        confidence,
      };
    } catch (error) {
      this.logger.error(`Processing failed: ${error.message}`);
      throw new InternalServerErrorException(error.message);
    }
  }

  // private async autocropDocument(inputPath: string, outputPath: string): Promise<void> {
  //   try {
      
  //     const pythonPath = join(process.cwd(), 'python', 'venv', 'Scripts', 'python.exe');
  //     const scriptPath = join(process.cwd(), 'python', 'autocrop.py');

  //     const { stdout, stderr } = await execAsync(
  //       `"${pythonPath}" "${scriptPath}" "${inputPath}" "${outputPath}"`
  //     );

  //     this.logger.debug(`Python output:\n${stdout}`);
  //     if (stderr) this.logger.warn(`Python errors:\n${stderr}`);

  //     if (!existsSync(outputPath)) {
  //       throw new Error('Autocrop script ran but no output file was created');
  //     }
  //   } catch (error) {
  //     this.logger.error(`Autocrop failed: ${error.message}`);
  //     throw new Error(`Document autocrop failed: ${error.message}`);
  //   }
  // }



  private async autocropDocument(inputPath: string, outputPath: string): Promise<void> {
    try {
      const pythonPath = join(process.cwd(), 'python', 'venv', 'Scripts', 'python.exe');
      const scriptPath = join(process.cwd(), 'python', 'autocrop.py');
      const { stdout, stderr } = await execAsync(
        `venv\\Scripts\\activate; python "${scriptPath}" "${inputPath}" "${outputPath}"`
      );

      this.logger.debug(`Python output:\n${stdout}`);
      if (stderr) this.logger.warn(`Python errors:\n${stderr}`);

      // Verify the output was created
      if (!existsSync(outputPath)) {
        throw new Error('Autocrop script ran but no output file was created');
      }
    } catch (error) {
      this.logger.error(`Autocrop failed: ${error.message}`);
      throw new Error(`Document autocrop failed: ${error.message}`);
    }
  }


  private async performOCR(imagePath: string) {
    let worker: Worker | null = null;
    try {
      worker = await createWorker();
    //   await worker.loadLanguage('eng');
      await worker.reinitialize('eng');
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
        tessedit_ocr_engine_mode: OEM.LSTM_ONLY,
        preserve_interword_spaces: '1',
      });

      const { data } = await worker.recognize(imagePath);
      
      const cleanedText = data.text
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s$€£.,-]/g, '')
        .trim();

      return {
        text: cleanedText,
        confidence: data.confidence,
      };
    } finally {
      if (worker) await worker.terminate();
    }
  }


  private async removeBackground(inputPath: string, outputPath: string): Promise<void> {
    if (!existsSync(inputPath)) {
        throw new Error(`Input file does not exist: ${inputPath}`);
    }
        
      try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(inputPath));
        formData.append('size', 'auto');
        const response = await fetch('http://38.242.149.46:8000/timdev/api/v1/image_service/bg_remover', {
            method: 'POST',
            body: formData,
        });

        // 4. Handle response
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
        }

        // 5. Save result
        const resultBuffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(outputPath, resultBuffer);
        console.log('✅ Background removed successfully:', outputPath);
    } catch (error) {
        console.error('❌ Background removal failed:', error);
        throw error;
    }

  }


  async removeBackgroundAndAutoCrop(inputPath: string, outputPath: string): Promise<void> {
    if (!existsSync(inputPath)) {
        throw new Error(`Input file does not exist: ${inputPath}`);
    }
        
      try {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(inputPath));
        formData.append('size', 'auto');
        const response = await fetch('http://38.242.149.46:8000/timdev/api/v1/image_service/bg_remover', {
            method: 'POST',
            body: formData,
        });

        // 4. Handle response
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API Error: ${response.status} - ${JSON.stringify(errorData)}`);
        }

        // 5. Save result
        const resultBuffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(outputPath, resultBuffer);
        console.log('✅ Background removed successfully:', outputPath);
    } catch (error) {
        console.error('❌ Background removal failed:', error);
        throw error;
    }

  }

}