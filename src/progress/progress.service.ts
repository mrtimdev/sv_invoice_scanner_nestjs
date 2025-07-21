import { Injectable } from '@nestjs/common';

@Injectable()
export class ProgressService {
  private progressMap: Record<
    string,
    { total: number; processed: number; lastUpdated: Date }
  > = {};

  createProgressSession(sessionId: string, totalFiles: number) {
    if (!this.progressMap[sessionId]) {
      this.progressMap[sessionId] = {
        total: totalFiles || 1, // Ensure at least 1 to avoid division by zero
        processed: 0,
        lastUpdated: new Date()
      };
      console.log(`[Progress] Created session ${sessionId} with total ${totalFiles}`);
    }
    return this.progressMap[sessionId];
  }

  updateProgress(sessionId: string, increment = 1) {
    if (this.progressMap[sessionId]) {
      this.progressMap[sessionId].processed += increment;
      this.progressMap[sessionId].lastUpdated = new Date();
      console.log(`[Progress] Updated session ${sessionId}: ${this.progressMap[sessionId].processed}/${this.progressMap[sessionId].total}`);
    } else {
      console.warn(`[Progress] Tried to update unknown session ${sessionId}`);
    }
  }

  getProgress(sessionId: string) {
    return (
      this.progressMap[sessionId] || {
        total: 0,
        processed: 0,
        lastUpdated: new Date(0)
      }
    );
  }

  removeSession(sessionId: string) {
    delete this.progressMap[sessionId];
    console.log(`[Progress] Removed session ${sessionId}`);
  }

  cleanupOldSessions(maxAgeMinutes = 30) {
    const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
    Object.keys(this.progressMap).forEach((sessionId) => {
      if (this.progressMap[sessionId].lastUpdated < cutoff) {
        this.removeSession(sessionId);
      }
    });
  }
}
