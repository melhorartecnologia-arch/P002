import type { FastifyRequest, FastifyReply } from 'fastify';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload;
    user: JwtPayload;
  }
}

/**
 * Fastify onRequest hook that verifies the JWT token from the Authorization header.
 * Populates request.user with the decoded token payload.
 */
export async function verifyToken(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Token inválido ou expirado',
    });
  }
}

/**
 * Returns an onRequest hook that checks whether the authenticated user
 * has the required role. Must be used after verifyToken.
 *
 * @param roles - One or more allowed roles (ADMIN, EDITOR, VIEWER)
 */
export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user as JwtPayload;

    if (!user) {
      reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Autenticação necessária',
      });
      return;
    }

    if (!roles.includes(user.role)) {
      reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: `Acesso restrito. Roles necessárias: ${roles.join(', ')}`,
      });
    }
  };
}
