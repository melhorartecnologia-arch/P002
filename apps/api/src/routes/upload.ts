import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'node:crypto';
import { createMinioClient, MinioStorage } from '@dora/storage';
import { processingQueue } from '@dora/queue';
import { MINIO_PATHS } from '@dora/shared';
import { verifyToken, requireRole } from '../middleware/auth.js';

const ALLOWED_MIME_TYPES = ['application/pdf'];

/**
 * Upload route plugin.
 * Provides endpoints for uploading PDF files and checking processing status.
 */
export async function uploadRoutes(app: FastifyInstance): Promise<void> {
  const minioClient = createMinioClient();
  const storage = new MinioStorage(minioClient, process.env.MINIO_BUCKET ?? 'dora');

  // Ensure bucket exists on startup
  await storage.ensureBucket();

  /**
   * POST /api/v1/upload
   * Multipart file upload endpoint.
   * Validates that the file is a PDF, computes its SHA-256 hash, stores in MinIO,
   * creates an edicao record, and enqueues a processing job.
   */
  app.post(
    '/',
    { onRequest: [verifyToken, requireRole('ADMIN', 'EDITOR')] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const file = await request.file();

      if (!file) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Nenhum arquivo enviado',
        });
      }

      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: `Tipo de arquivo não suportado: ${file.mimetype}. Apenas PDF é aceito.`,
        });
      }

      // Read file into buffer
      const chunks: Buffer[] = [];
      for await (const chunk of file.file) {
        chunks.push(Buffer.from(chunk));
      }
      const buffer = Buffer.concat(chunks);

      if (buffer.length === 0) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Arquivo vazio',
        });
      }

      // Compute SHA-256 hash
      const hashConteudo = createHash('sha256').update(buffer).digest('hex');

      // Check for duplicate
      const existing = await app.prisma.edicao.findUnique({
        where: { hashConteudo },
      });

      if (existing) {
        return reply.status(409).send({
          statusCode: 409,
          error: 'Conflict',
          message: 'Este arquivo já foi processado anteriormente',
          edicaoId: existing.id,
        });
      }

      // Store in MinIO
      const minioPath = `${MINIO_PATHS.originals}${hashConteudo}.pdf`;
      await storage.upload(minioPath, buffer, {
        'Content-Type': 'application/pdf',
        'X-Original-Filename': file.filename,
      });

      // Parse form fields (fonteId, numero, dataPublicacao, tipo)
      const fields = file.fields as Record<string, { value?: string }>;
      const fonteId = fields['fonteId']?.value;
      const numero = fields['numero']?.value ?? 'MANUAL';
      const dataPublicacao = fields['dataPublicacao']?.value ?? new Date().toISOString();
      const tipo = (fields['tipo']?.value as 'ORDINARIA' | 'EXTRA' | 'SUPLEMENTAR') ?? 'ORDINARIA';

      if (!fonteId) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: 'Campo fonteId é obrigatório',
        });
      }

      // Create edicao record
      const edicao = await app.prisma.edicao.create({
        data: {
          fonteId,
          numero,
          dataPublicacao: new Date(dataPublicacao),
          tipo,
          hashConteudo,
          urlOriginal: `upload://${file.filename}`,
          minioPath,
          totalPaginas: 0, // Will be determined during processing
          status: 'PENDENTE',
        },
      });

      // Enqueue processing job
      await processingQueue.add(
        'process-edicao',
        {
          edicaoId: edicao.id,
          etapa: 'TRANSCRICAO',
          tentativa: 0,
        },
        { priority: 1 },
      );

      return reply.status(201).send({
        message: 'Upload realizado com sucesso. Processamento enfileirado.',
        data: {
          edicaoId: edicao.id,
          hashConteudo,
          minioPath,
          status: 'PENDENTE',
        },
      });
    },
  );

  /**
   * GET /api/v1/upload/:id/status
   * Check the upload/processing status for a given edition.
   * Supports WebSocket upgrade for real-time status updates, or standard polling.
   */
  app.get(
    '/:id/status',
    { websocket: true },
    async (socket, request: FastifyRequest<{ Params: { id: string } }>) => {
      const { id } = request.params;

      const sendStatus = async () => {
        const edicao = await app.prisma.edicao.findUnique({
          where: { id },
          include: { processingJob: true },
        });

        if (!edicao) {
          socket.send(
            JSON.stringify({
              error: 'Not Found',
              message: `Edição com ID ${id} não encontrada`,
            }),
          );
          socket.close();
          return null;
        }

        const statusPayload = {
          edicaoId: edicao.id,
          status: edicao.status,
          etapa: edicao.processingJob?.etapa ?? null,
          tentativas: edicao.processingJob?.tentativas ?? 0,
          erro: edicao.processingJob?.erro ?? null,
          processadoEm: edicao.processadoEm,
        };

        socket.send(JSON.stringify(statusPayload));
        return edicao.status;
      };

      // Send initial status
      const initialStatus = await sendStatus();
      if (!initialStatus) return;

      // Poll every 3 seconds until completed or errored
      const interval = setInterval(async () => {
        try {
          const status = await sendStatus();
          if (status === 'CONCLUIDO' || status === 'ERRO' || status === null) {
            clearInterval(interval);
            socket.close();
          }
        } catch {
          clearInterval(interval);
          socket.close();
        }
      }, 3000);

      socket.on('close', () => {
        clearInterval(interval);
      });
    },
  );

  /**
   * GET /api/v1/upload/:id/status (HTTP polling fallback)
   * Returns current processing status as JSON.
   */
  app.get(
    '/:id/status-poll',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      const edicao = await app.prisma.edicao.findUnique({
        where: { id },
        include: { processingJob: true },
      });

      if (!edicao) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: `Edição com ID ${id} não encontrada`,
        });
      }

      return reply.send({
        data: {
          edicaoId: edicao.id,
          status: edicao.status,
          etapa: edicao.processingJob?.etapa ?? null,
          tentativas: edicao.processingJob?.tentativas ?? 0,
          erro: edicao.processingJob?.erro ?? null,
          processadoEm: edicao.processadoEm,
        },
      });
    },
  );
}
