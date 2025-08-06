import { forwardRef, Module } from "@nestjs/common";
import { DocumentProcessorService } from "./document-processor.service";
import { AdminModule } from "../admin.module";

@Module({
    imports: [forwardRef(() => AdminModule)],
    providers: [DocumentProcessorService],
    exports: [DocumentProcessorService], 
})
export class DocumentProcessorModule {}