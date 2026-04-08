import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import { verifyToken, requireRole } from '../middleware/auth.js';

const ALLOWED_MIME_TYPES = ['application/pdf'];

const ANALYSIS_PROMPT = `Você é um especialista em análise de Diários Oficiais brasileiros.

Analise este PDF de Diário Oficial e extraia TODOS os atos normativos contidos nele.

Para cada ato encontrado, retorne um objeto com os seguintes campos:
- tipo_ato: O tipo (DECRETO, PORTARIA, EDITAL, RESOLUCAO, INSTRUCAO_NORMATIVA, LEI, MEDIDA_PROVISORIA, ATA, CONTRATO, CONVENIO, AVISO, DESPACHO, PARECER, EXTRATO, OUTRO)
- orgao_emissor: O órgão responsável
- titulo: Título ou ementa do ato
- conteudo_texto: Texto integral do ato
- resumo: Resumo executivo em 2-3 frases
- pagina_inicio: Página onde inicia (estimativa)
- pagina_fim: Página onde termina (estimativa)
- temas: Array de objetos {area, subarea, tema, score} classificando o ato tematicamente
- entidades: Objeto com {pessoas: [{nome, papel}], orgaos: [{nome, tipo}], valores: [{valor, natureza}], datas: [{data, natureza}]}

FORMATO DE SAÍDA (JSON array estrito):
\`\`\`json
[
  {
    "tipo_ato": "PORTARIA",
    "orgao_emissor": "Secretaria de Educação",
    "titulo": "Portaria nº 123 - Nomeia servidor...",
    "conteudo_texto": "texto completo...",
    "resumo": "resumo executivo...",
    "pagina_inicio": 1,
    "pagina_fim": 1,
    "temas": [{"area": "ADMINISTRAÇÃO PÚBLICA", "subarea": "Pessoal", "tema": "Nomeação", "score": 0.95}],
    "entidades": {"pessoas": [], "orgaos": [], "valores": [], "datas": []}
  }
]
\`\`\`

Responda APENAS com o JSON array válido dentro de um bloco \`\`\`json. Extraia TODOS os atos, não omita nenhum.`;

/**
 * Simplified upload route.
 * Sends PDF directly to Claude API for analysis, no MinIO/queue needed.
 */
export async function uploadRoutes(app: FastifyInstance): Promise<void> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  /**
   * POST /api/v1/upload
   * Upload a PDF and process it directly via Claude API.
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

      // Compute SHA-256 hash for deduplication
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

      // Parse form fields
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

      // Create edicao record as PROCESSANDO
      const edicao = await app.prisma.edicao.create({
        data: {
          fonteId,
          numero,
          dataPublicacao: new Date(dataPublicacao),
          tipo,
          hashConteudo,
          urlOriginal: `upload://${file.filename}`,
          minioPath: `direct-upload/${hashConteudo}.pdf`,
          totalPaginas: 0,
          status: 'PROCESSANDO',
        },
      });

      try {
        // Send PDF directly to Claude API
        app.log.info(`Processing PDF ${file.filename} (${(buffer.length / 1024 / 1024).toFixed(1)}MB) via Claude API...`);

        const pdfBase64 = buffer.toString('base64');

        const response = await anthropic.messages.create({
          model: process.env.CLAUDE_MODEL_EXTRACTION ?? 'claude-sonnet-4-20250514',
          max_tokens: 16384,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'document',
                  source: {
                    type: 'base64',
                    media_type: 'application/pdf',
                    data: pdfBase64,
                  },
                },
                {
                  type: 'text',
                  text: ANALYSIS_PROMPT,
                },
              ],
            },
          ],
        });

        // Parse Claude's response
        const textBlock = response.content.find(
          (block): block is Anthropic.TextBlock => block.type === 'text',
        );
        const responseText = textBlock?.text ?? '';

        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr = jsonMatch ? jsonMatch[1].trim() : responseText.trim();

        const atos: Array<{
          tipo_ato: string;
          orgao_emissor: string;
          titulo: string;
          conteudo_texto: string;
          resumo: string;
          pagina_inicio: number;
          pagina_fim: number;
          temas: Array<{ area: string; subarea: string; tema: string; score: number }>;
          entidades: Record<string, unknown>;
        }> = JSON.parse(jsonStr);

        // Map tipo_ato strings to valid TipoAto enum values
        const TIPO_ATO_MAP: Record<string, string> = {
          DECRETO: 'DECRETO',
          PORTARIA: 'PORTARIA',
          EDITAL: 'EDITAL',
          RESOLUCAO: 'RESOLUCAO',
          'RESOLUÇÃO': 'RESOLUCAO',
          INSTRUCAO_NORMATIVA: 'INSTRUCAO_NORMATIVA',
          'INSTRUÇÃO NORMATIVA': 'INSTRUCAO_NORMATIVA',
          LEI: 'LEI',
          MEDIDA_PROVISORIA: 'MEDIDA_PROVISORIA',
          'MEDIDA PROVISÓRIA': 'MEDIDA_PROVISORIA',
          ATA: 'ATA',
          CONTRATO: 'CONTRATO',
          CONVENIO: 'CONVENIO',
          'CONVÊNIO': 'CONVENIO',
          AVISO: 'AVISO',
          DESPACHO: 'DESPACHO',
          PARECER: 'PARECER',
          EXTRATO: 'EXTRATO',
          OUTRO: 'OUTRO',
        };

        const modelUsed = response.model ?? process.env.CLAUDE_MODEL_EXTRACTION ?? 'claude-sonnet-4-20250514';
        const tokensUsed = (response.usage?.input_tokens ?? 0) + (response.usage?.output_tokens ?? 0);

        // Save atos to database
        const createdAtos = [];
        for (const ato of atos) {
          const tipoAto = TIPO_ATO_MAP[ato.tipo_ato?.toUpperCase()] ?? 'OUTRO';

          const created = await app.prisma.ato.create({
            data: {
              edicaoId: edicao.id,
              tipoAto: tipoAto as any,
              orgaoEmissor: ato.orgao_emissor ?? 'Não identificado',
              titulo: ato.titulo ?? 'Sem título',
              conteudoTexto: ato.conteudo_texto ?? '',
              resumo: ato.resumo ?? null,
              paginaInicio: ato.pagina_inicio ?? 1,
              paginaFim: ato.pagina_fim ?? 1,
              temas: ato.temas ?? [],
              entidades: ato.entidades ?? {},
              claudeModel: modelUsed,
            },
          });
          createdAtos.push(created);
        }

        // Update edicao as completed
        await app.prisma.edicao.update({
          where: { id: edicao.id },
          data: {
            status: 'CONCLUIDO',
            totalPaginas: Math.max(...atos.map((a) => a.pagina_fim ?? 1), 1),
            claudeTokensUsed: tokensUsed,
            processadoEm: new Date(),
          },
        });

        app.log.info(`PDF processed: ${createdAtos.length} atos extracted, ${tokensUsed} tokens used`);

        return reply.status(201).send({
          message: 'Upload e processamento concluídos com sucesso.',
          data: {
            edicaoId: edicao.id,
            status: 'CONCLUIDO',
            totalAtos: createdAtos.length,
            tokensUsed,
            atos: createdAtos.map((a) => ({
              id: a.id,
              tipo: a.tipoAto,
              orgao: a.orgaoEmissor,
              titulo: a.titulo,
              resumo: a.resumo,
            })),
          },
        });
      } catch (err) {
        // Mark as error
        app.log.error(err, 'Error processing PDF via Claude API');

        await app.prisma.edicao.update({
          where: { id: edicao.id },
          data: { status: 'ERRO' },
        });

        const message = err instanceof Error ? err.message : 'Erro desconhecido';
        return reply.status(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: `Erro ao processar PDF: ${message}`,
          edicaoId: edicao.id,
        });
      }
    },
  );

  /**
   * GET /api/v1/upload/:id/status-poll
   * Returns current processing status as JSON.
   */
  app.get(
    '/:id/status-poll',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      const edicao = await app.prisma.edicao.findUnique({
        where: { id },
        include: {
          atos: {
            select: { id: true, tipoAto: true, titulo: true, resumo: true },
          },
        },
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
          totalAtos: edicao.atos.length,
          processadoEm: edicao.processadoEm,
          atos: edicao.atos,
        },
      });
    },
  );
}
