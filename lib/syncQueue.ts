import 'server-only';

export class SyncQueue {
  private queue: (() => Promise<void>)[] = [];
  private isProcessing = false;
  private readonly STAGGER_DELAY_MS = 2000;

  public enqueue(task: () => Promise<void>): void {
    if (process.env.NODE_ENV === 'test') {
      void task().catch((error) => {
        console.error('[SyncQueue] Task failed during test:', error);
      });

      return;
    }

    this.queue.push(task);
    this.processNext();
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }
    this.isProcessing = true;

    const task = this.queue.shift();
    if (task) {
      try {
        await task();
      } catch (error) {
        console.error('[SyncQueue] Task failed:', error);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, this.STAGGER_DELAY_MS));

    this.isProcessing = false;
    this.processNext();
  }

  public get pendingTasks(): number {
    return this.queue.length;
  }
}

export const syncQueue = new SyncQueue();
