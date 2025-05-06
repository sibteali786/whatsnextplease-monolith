// api/schedulers/taskOverdueScheduler.ts
import { Worker } from 'worker_threads';
import cron from 'node-cron';
import path from 'path';
import { logger } from '../utils/logger';

export class TaskOverdueScheduler {
  private scheduledJob: cron.ScheduledTask;
  private isProcessing = false;

  constructor() {
    // For testing: run every minute
    this.scheduledJob = cron.schedule('0 0 * * *', async () => {
      if (this.isProcessing) {
        logger.warn('Overdue task check already in progress, skipping');
        return;
      }

      this.isProcessing = true;
      try {
        await this.processOverdueTasks();
      } finally {
        this.isProcessing = false;
      }
    });

    logger.info('Task overdue scheduler initialized');
  }

  private async processOverdueTasks() {
    logger.info('Starting overdue tasks check');

    return new Promise<void>((resolve, reject) => {
      // Use __dirname to get absolute path and provide batch size
      const workerPath = path.resolve(process.cwd(), 'dist/schedulers/overdueTasksWorker.js');
      const worker = new Worker(workerPath, {
        workerData: { batchSize: 50 },
      });

      worker.on('message', message => {
        logger.info(
          `Overdue tasks processed: ${message.tasksProcessed}, notifications: ${message.notificationsCreated}`
        );
      });

      worker.on('error', error => {
        console.log('Worker error:', error);
        logger.error('Error in overdue tasks worker:', error);
        reject(error);
      });

      worker.on('exit', code => {
        if (code !== 0) {
          logger.error(`Worker stopped with exit code ${code}`);
          reject(new Error(`Worker stopped with exit code ${code}`));
        } else {
          logger.info('Overdue tasks check completed successfully');
          resolve();
        }
      });
    });
  }

  async runNow() {
    if (this.isProcessing) {
      logger.warn('Overdue task check already in progress');
      return false;
    }

    this.isProcessing = true;
    try {
      await this.processOverdueTasks();
      return true;
    } finally {
      this.isProcessing = false;
    }
  }

  stop() {
    this.scheduledJob.stop();
    logger.info('Task overdue scheduler stopped');
  }
}
