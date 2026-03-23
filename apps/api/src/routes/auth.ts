import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { verifyToken } from '../middleware/auth.js';

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerBody = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(200),
  password: z.string().min(8).max(128),
});

/**
 * Simple password hashing placeholder.
 * In production, use bcrypt or argon2. This uses SHA-256 as a stand-in
 * to avoid native dependency issues during initial development.
 */
function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

/**
 * Auth route plugin.
 * Provides login, register, and current-user endpoints.
 */
export async function authRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/auth/login
   * Validate email/password and return a JWT token.
   */
  app.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = loginBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Email e senha são obrigatórios',
        details: parsed.error.flatten(),
      });
    }

    const { email, password } = parsed.data;

    const user = await app.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.active) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Credenciais inválidas',
      });
    }

    const valid = verifyPassword(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Credenciais inválidas',
      });
    }

    const token = app.jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      { expiresIn: '24h' },
    );

    return reply.send({
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  });

  /**
   * POST /api/v1/auth/register
   * Create a new user with a hashed password.
   */
  app.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = registerBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Dados de registro inválidos',
        details: parsed.error.flatten(),
      });
    }

    const { email, name, password } = parsed.data;

    const existing = await app.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
        message: 'Email já cadastrado',
      });
    }

    const passwordHash = hashPassword(password);

    const user = await app.prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: 'VIEWER',
        active: true,
      },
    });

    const token = app.jwt.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      { expiresIn: '24h' },
    );

    return reply.status(201).send({
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    });
  });

  /**
   * GET /api/v1/auth/me
   * Return the current authenticated user's profile.
   */
  app.get(
    '/me',
    { onRequest: [verifyToken] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = request.user.sub;

      const user = await app.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          active: true,
          createdAt: true,
          _count: {
            select: { alertas: true },
          },
        },
      });

      if (!user) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Usuário não encontrado',
        });
      }

      return reply.send({
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          active: user.active,
          createdAt: user.createdAt,
          totalAlertas: user._count.alertas,
        },
      });
    },
  );
}
