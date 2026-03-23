/**
 * Notification Worker
 *
 * BullMQ worker that consumes jobs from the "notification" queue.
 * Dispatches notifications across multiple channels: EMAIL, WEBHOOK,
 * PUSH, SLACK, and WHATSAPP.
 */

import { Worker, Job } from "bullmq";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NotificationChannel = "EMAIL" | "WEBHOOK" | "PUSH" | "SLACK" | "WHATSAPP";

interface NotificationJobData {
  /** Database ID of the alerta (alert rule) that triggered this notification */
  alertaId: string;
  /** Database ID of the ato (official act) that matched the alert */
  atoId: string;
  /** Delivery channel */
  canal: NotificationChannel;
  /** Notification payload / message content */
  conteudo: {
    titulo: string;
    mensagem: string;
    url?: string;
    /** Channel-specific data (e.g., email address, webhook URL) */
    destinatario: string;
    metadata?: Record<string, unknown>;
  };
}

/**
 * PrismaClient — from @dora/database
 * Expected models: notificacao
 */
type PrismaClient = any;

interface NotificationWorkerOptions {
  /** Redis connection options for BullMQ */
  connection: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  /** Number of concurrent notification jobs (default: 5) */
  concurrency?: number;
  /** Prisma client for recording notifications */
  prisma: PrismaClient;
  /**
   * Optional logger — from @dora/logger
   * Expected interface: { info(...), error(...), warn(...), debug(...) }
   */
  logger?: any;
}

// ---------------------------------------------------------------------------
// Channel dispatchers (placeholder implementations)
// ---------------------------------------------------------------------------

/**
 * Send notification via EMAIL.
 * Placeholder — real implementation would use nodemailer or an email API
 * (e.g., AWS SES, SendGrid, Resend).
 */
async function sendEmail(
  destinatario: string,
  titulo: string,
  mensagem: string,
  _metadata?: Record<string, unknown>,
): Promise<{ success: boolean; messageId?: string }> {
  // TODO: Replace with nodemailer or email service integration
  //
  // import nodemailer from "nodemailer";
  // const transporter = nodemailer.createTransport({ ... });
  // const info = await transporter.sendMail({
  //   from: "dora@example.com",
  //   to: destinatario,
  //   subject: titulo,
  //   html: mensagem,
  // });
  // return { success: true, messageId: info.messageId };

  console.log(`[notification:EMAIL] To: ${destinatario} Subject: ${titulo}`);
  return { success: true, messageId: `email-stub-${Date.now()}` };
}

/**
 * Send notification via WEBHOOK.
 * Placeholder — real implementation would use axios or fetch to POST
 * the payload to the webhook URL.
 */
async function sendWebhook(
  url: string,
  titulo: string,
  mensagem: string,
  metadata?: Record<string, unknown>,
): Promise<{ success: boolean; statusCode?: number }> {
  // TODO: Replace with HTTP POST
  //
  // import axios from "axios";
  // const response = await axios.post(url, {
  //   title: titulo,
  //   message: mensagem,
  //   ...metadata,
  // }, { timeout: 10_000 });
  // return { success: response.status < 400, statusCode: response.status };

  console.log(`[notification:WEBHOOK] URL: ${url} Title: ${titulo}`);
  return { success: true, statusCode: 200 };
}

/**
 * Send PUSH notification.
 * Placeholder — real implementation would use Firebase Cloud Messaging (FCM),
 * Apple Push Notification Service (APNs), or web-push.
 */
async function sendPush(
  deviceToken: string,
  titulo: string,
  mensagem: string,
  _metadata?: Record<string, unknown>,
): Promise<{ success: boolean }> {
  // TODO: Replace with FCM / APNs / web-push integration

  console.log(`[notification:PUSH] Token: ${deviceToken.slice(0, 12)}… Title: ${titulo}`);
  return { success: true };
}

/**
 * Send notification to a SLACK channel or user.
 * Placeholder — real implementation would use the Slack Web API
 * or an incoming webhook.
 */
async function sendSlack(
  channelOrWebhook: string,
  titulo: string,
  mensagem: string,
  _metadata?: Record<string, unknown>,
): Promise<{ success: boolean }> {
  // TODO: Replace with Slack API integration
  //
  // import { WebClient } from "@slack/web-api";
  // const client = new WebClient(process.env.SLACK_TOKEN);
  // await client.chat.postMessage({
  //   channel: channelOrWebhook,
  //   text: `*${titulo}*\n${mensagem}`,
  // });

  console.log(`[notification:SLACK] Channel: ${channelOrWebhook} Title: ${titulo}`);
  return { success: true };
}

/**
 * Send notification via WHATSAPP.
 * Placeholder — real implementation would use the WhatsApp Business API
 * (e.g., via Twilio, MessageBird, or Meta's Cloud API).
 */
async function sendWhatsApp(
  phoneNumber: string,
  titulo: string,
  mensagem: string,
  _metadata?: Record<string, unknown>,
): Promise<{ success: boolean }> {
  // TODO: Replace with WhatsApp Business API integration
  //
  // import twilio from "twilio";
  // const client = twilio(accountSid, authToken);
  // await client.messages.create({
  //   from: "whatsapp:+14155238886",
  //   to: `whatsapp:${phoneNumber}`,
  //   body: `${titulo}\n\n${mensagem}`,
  // });

  console.log(`[notification:WHATSAPP] Phone: ${phoneNumber} Title: ${titulo}`);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

/**
 * Route a notification to the appropriate channel handler.
 */
async function dispatchNotification(
  data: NotificationJobData,
): Promise<{ success: boolean; details?: Record<string, unknown> }> {
  const { canal, conteudo } = data;
  const { destinatario, titulo, mensagem, metadata } = conteudo;

  switch (canal) {
    case "EMAIL":
      return sendEmail(destinatario, titulo, mensagem, metadata);

    case "WEBHOOK":
      return sendWebhook(destinatario, titulo, mensagem, metadata);

    case "PUSH":
      return sendPush(destinatario, titulo, mensagem, metadata);

    case "SLACK":
      return sendSlack(destinatario, titulo, mensagem, metadata);

    case "WHATSAPP":
      return sendWhatsApp(destinatario, titulo, mensagem, metadata);

    default: {
      const _exhaustive: never = canal;
      throw new Error(`Unknown notification channel: ${_exhaustive}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates a BullMQ worker that dispatches notifications across
 * multiple channels and records delivery results in the database.
 *
 * @param options - Worker configuration and injected dependencies
 * @returns The BullMQ Worker instance (call .close() to shut down)
 */
export function createNotificationWorker(
  options: NotificationWorkerOptions,
): Worker {
  const {
    connection,
    concurrency = 5,
    prisma,
    logger = console,
  } = options;

  const worker = new Worker<NotificationJobData>(
    "notification",
    async (job: Job<NotificationJobData>) => {
      const { alertaId, atoId, canal } = job.data;

      logger.info(
        `[notification-worker] Starting job ${job.id} — alerta=${alertaId} ato=${atoId} canal=${canal}`,
      );

      await job.updateProgress(0);

      try {
        // Dispatch to the appropriate channel
        const result = await dispatchNotification(job.data);

        await job.updateProgress(80);

        // Record notification in the database
        await prisma.notificacao.create({
          data: {
            alertaId,
            atoId,
            canal,
            destinatario: job.data.conteudo.destinatario,
            titulo: job.data.conteudo.titulo,
            conteudo: job.data.conteudo.mensagem,
            status: result.success ? "ENVIADO" : "FALHA",
            enviadoEm: result.success ? new Date() : null,
            metadados: result.details ?? {},
          },
        });

        await job.updateProgress(100);

        logger.info(
          `[notification-worker] Completed job ${job.id} — canal=${canal} success=${result.success}`,
        );

        return {
          alertaId,
          atoId,
          canal,
          success: result.success,
          completedAt: new Date().toISOString(),
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);

        logger.error(
          `[notification-worker] Failed job ${job.id} — canal=${canal}: ${message}`,
        );

        // Record the failure in the database (best effort)
        try {
          await prisma.notificacao.create({
            data: {
              alertaId,
              atoId,
              canal,
              destinatario: job.data.conteudo.destinatario,
              titulo: job.data.conteudo.titulo,
              conteudo: job.data.conteudo.mensagem,
              status: "FALHA",
              erro: message,
              metadados: {},
            },
          });
        } catch {
          logger.error(
            `[notification-worker] Failed to record notification failure in database`,
          );
        }

        throw err;
      }
    },
    {
      connection,
      concurrency,
      lockDuration: 30_000, // 30 seconds — notifications should be fast
      stalledInterval: 15_000,
    },
  );

  // -----------------------------------------------------------------------
  // Event handlers
  // -----------------------------------------------------------------------

  worker.on("completed", (job: Job<NotificationJobData>) => {
    logger.info(
      `[notification-worker] Job ${job.id} completed — canal=${job.data.canal}`,
    );
  });

  worker.on("failed", (job: Job<NotificationJobData> | undefined, err: Error) => {
    logger.error(
      `[notification-worker] Job ${job?.id ?? "unknown"} failed: ${err.message}`,
    );
  });

  worker.on("error", (err: Error) => {
    logger.error(`[notification-worker] Worker error: ${err.message}`);
  });

  return worker;
}
