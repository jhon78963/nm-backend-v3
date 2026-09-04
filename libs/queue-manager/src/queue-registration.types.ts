import type { JobsOptions, QueueOptions } from 'bullmq';

export interface RegisterQueueOptions {
  /** Nombre de la cola BullMQ (debe ser único en Redis). */
  name: string;
  /**
   * Prefijo para variables de entorno específicas de la cola.
   * Ej: `MAIL` → MAIL_QUEUE_CONCURRENCY, MAIL_QUEUE_ATTEMPTS, etc.
   */
  configPrefix?: string;
  /** Concurrencia del worker. Por defecto lee {PREFIX}_QUEUE_CONCURRENCY o QUEUE_CONCURRENCY. */
  concurrency?: number;
  /** Opciones adicionales de BullMQ para la cola. */
  queueOptions?: Omit<QueueOptions, 'connection'>;
  /** Opciones por defecto al encolar jobs en esta cola. */
  defaultJobOptions?: JobsOptions;
}
