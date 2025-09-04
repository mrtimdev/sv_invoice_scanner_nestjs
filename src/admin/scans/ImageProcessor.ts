import * as sharp from 'sharp';
import * as path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createWorker, PSM, OEM } from 'tesseract.js';
import { tmpdir } from 'os';
import { Rembg } from "@xixiyahaha/rembg-node";

class ImageProcessor {

    async removeBackgroundAndCrop(inputPath: string) {
        const filename = path.basename(inputPath);
        const originalPath = join(process.cwd(), 'uploads/scans', filename);
        if (!existsSync(originalPath)) {
            throw new Error(`Input file does not exist: ${originalPath}`);
        }
        let croppedPath = join(process.cwd(), 'uploads', 'scans', `cropped-${filename}`);
        const input = sharp(originalPath);

        // optional arguments
        const rembg = new Rembg({
            logging: true,
        });

        const output = await rembg.remove(input);

        // const t =  await output.webp().toFile(outputPath);

        // optionally you can use .trim() too!
        const removedAndCropped = await output.trim().webp().toFile(croppedPath);
        return removedAndCropped;
    }

}

export default ImageProcessor;