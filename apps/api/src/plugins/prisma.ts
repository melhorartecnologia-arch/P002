import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { PrismaClient } from '@dora/database';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

const FONTES_SEED = [
  { nome: 'Diário Oficial da União', esfera: 'FEDERAL' as const, uf: null, spiderType: 'CHEERIO' as const, urlBase: 'https://www.in.gov.br/leiturajornal', cronExpression: '0 5 * * 1-5' },
  { nome: 'Diário Oficial do Estado do Acre', esfera: 'ESTADUAL' as const, uf: 'AC', spiderType: 'CHEERIO' as const, urlBase: 'https://www.diario.ac.gov.br', cronExpression: '0 6 * * 1-5' },
  { nome: 'Diário Oficial do Estado de Alagoas', esfera: 'ESTADUAL' as const, uf: 'AL', spiderType: 'PLAYWRIGHT' as const, urlBase: 'https://www.imprensaoficialal.com.br', cronExpression: '0 6 * * 1-5' },
  { nome: 'Diário Oficial do Estado do Amapá', esfera: 'ESTADUAL' as const, uf: 'AP', spiderType: 'CHEERIO' as const, urlBase: 'https://www.diariooficial.ap.gov.br', cronExpression: '0 6 * * 1-5' },
  { nome: 'Diário Oficial do Estado do Amazonas', esfera: 'ESTADUAL' as const, uf: 'AM', spiderType: 'PLAYWRIGHT' as const, urlBase: 'https://www.imprensaoficial.am.gov.br', cronExpression: '0 6 * * 1-5' },
  { nome: 'Diário Oficial do Estado da Bahia', esfera: 'ESTADUAL' as const, uf: 'BA', spiderType: 'PLAYWRIGHT' as const, urlBase: 'https://dool.egba.ba.gov.br', cronExpression: '0 6 * * 1-5' },
  { nome: 'Diário Oficial do Estado do Ceará', esfera: 'ESTADUAL' as const, uf: 'CE', spiderType: 'CHEERIO' as const, urlBase: 'https://pesquisa.doe.seplag.ce.gov.br', cronExpression: '0 6 * * 1-5' },
  { nome: 'Diário Oficial do Distrito Federal', esfera: 'ESTADUAL' as const, uf: 'DF', spiderType: 'CHEERIO' as const, urlBase: 'https://www.dodf.df.gov.br', cronExpression: '0 6 * * 1-5' },
  { nome: 'Diário Oficial do Estado do Espírito Santo', esfera: 'ESTADUAL' as const, uf: 'ES', spiderType: 'PLAYWRIGHT' as const, urlBase: 'https://ioes.dio.es.gov.br', cronExpression: '0 7 * * 1-5' },
  { nome: 'Diário Oficial do Estado de Goiás', esfera: 'ESTADUAL' as const, uf: 'GO', spiderType: 'CHEERIO' as const, urlBase: 'https://diariooficial.abc.go.gov.br', cronExpression: '0 6 * * 1-5' },
  { nome: 'Diário Oficial do Estado do Maranhão', esfera: 'ESTADUAL' as const, uf: 'MA', spiderType: 'PLAYWRIGHT' as const, urlBase: 'https://www.diariooficial.ma.gov.br', cronExpression: '0 6 * * 1-5' },
  { nome: 'Diário Oficial do Estado de Mato Grosso', esfera: 'ESTADUAL' as const, uf: 'MT', spiderType: 'PLAYWRIGHT' as const, urlBase: 'https://www.iomat.mt.gov.br', cronExpression: '0 6 * * 1-5' },
  { nome: 'Diário Oficial do Estado de Mato Grosso do Sul', esfera: 'ESTADUAL' as const, uf: 'MS', spiderType: 'CHEERIO' as const, urlBase: 'https://www.spdo.ms.gov.br/diariodoe', cronExpression: '0 6 * * 1-5' },
  { nome: 'Diário Oficial do Estado de Minas Gerais', esfera: 'ESTADUAL' as const, uf: 'MG', spiderType: 'PLAYWRIGHT' as const, urlBase: 'https://www.jornalminasgerais.mg.gov.br', cronExpression: '0 7 * * 1-5' },
  { nome: 'Diário Oficial do Estado do Pará', esfera: 'ESTADUAL' as const, uf: 'PA', spiderType: 'PLAYWRIGHT' as const, urlBase: 'https://www.ioepa.com.br', cronExpression: '0 6 * * 1-5' },
  { nome: 'Diário Oficial do Estado da Paraíba', esfera: 'ESTADUAL' as const, uf: 'PB', spiderType: 'CHEERIO' as const, urlBase: 'https://auniao.pb.gov.br/doe', cronExpression: '0 6 * * 1-5' },
  { nome: 'Diário Oficial do Estado do Paraná', esfera: 'ESTADUAL' as const, uf: 'PR', spiderType: 'CHEERIO' as const, urlBase: 'https://www.dioe.pr.gov.br', cronExpression: '0 7 * * 1-5' },
  { nome: 'Diário Oficial do Estado de Pernambuco', esfera: 'ESTADUAL' as const, uf: 'PE', spiderType: 'PLAYWRIGHT' as const, urlBase: 'https://www.cepe.com.br/diariooficial', cronExpression: '0 6 * * 1-5' },
  { nome: 'Diário Oficial do Estado do Piauí', esfera: 'ESTADUAL' as const, uf: 'PI', spiderType: 'CHEERIO' as const, urlBase: 'https://www.diariooficial.pi.gov.br', cronExpression: '0 6 * * 1-5' },
  { nome: 'Diário Oficial do Estado do Rio de Janeiro', esfera: 'ESTADUAL' as const, uf: 'RJ', spiderType: 'PLAYWRIGHT' as const, urlBase: 'https://www.ioerj.com.br', cronExpression: '0 7 * * 1-5' },
  { nome: 'Diário Oficial do Estado do Rio Grande do Norte', esfera: 'ESTADUAL' as const, uf: 'RN', spiderType: 'CHEERIO' as const, urlBase: 'http://www.diariooficial.rn.gov.br', cronExpression: '0 6 * * 1-5' },
  { nome: 'Diário Oficial do Estado do Rio Grande do Sul', esfera: 'ESTADUAL' as const, uf: 'RS', spiderType: 'CHEERIO' as const, urlBase: 'https://www.diariooficial.rs.gov.br', cronExpression: '0 7 * * 1-5' },
  { nome: 'Diário Oficial do Estado de Rondônia', esfera: 'ESTADUAL' as const, uf: 'RO', spiderType: 'CHEERIO' as const, urlBase: 'https://diof.ro.gov.br', cronExpression: '0 6 * * 1-5' },
  { nome: 'Diário Oficial do Estado de Roraima', esfera: 'ESTADUAL' as const, uf: 'RR', spiderType: 'CHEERIO' as const, urlBase: 'https://www.imprensaoficial.rr.gov.br', cronExpression: '0 6 * * 1-5' },
  { nome: 'Diário Oficial do Estado de Santa Catarina', esfera: 'ESTADUAL' as const, uf: 'SC', spiderType: 'CHEERIO' as const, urlBase: 'https://www.doe.sea.sc.gov.br', cronExpression: '0 7 * * 1-5' },
  { nome: 'Diário Oficial do Estado de São Paulo', esfera: 'ESTADUAL' as const, uf: 'SP', spiderType: 'PLAYWRIGHT' as const, urlBase: 'https://www.imprensaoficial.com.br', cronExpression: '0 7 * * 1-5' },
  { nome: 'Diário Oficial do Estado de Sergipe', esfera: 'ESTADUAL' as const, uf: 'SE', spiderType: 'CHEERIO' as const, urlBase: 'https://www.diariooficial.se.gov.br', cronExpression: '0 6 * * 1-5' },
  { nome: 'Diário Oficial do Estado do Tocantins', esfera: 'ESTADUAL' as const, uf: 'TO', spiderType: 'CHEERIO' as const, urlBase: 'https://diariooficial.to.gov.br', cronExpression: '0 6 * * 1-5' },
];

/**
 * Fastify plugin that decorates the app with a shared Prisma client instance.
 * The client is connected on startup and disconnected on close.
 * Auto-seeds Brazilian state gazette sources if the fontes table is empty.
 */
export const prismaPlugin = fp(async (app: FastifyInstance) => {
  const prisma = new PrismaClient();

  await prisma.$connect();

  // Auto-seed fontes if table is empty
  const count = await prisma.fonte.count();
  if (count === 0) {
    app.log.info('No fontes found — seeding Brazilian gazette sources...');
    await prisma.fonte.createMany({ data: FONTES_SEED });
    app.log.info(`Seeded ${FONTES_SEED.length} fontes`);
  }

  app.decorate('prisma', prisma);

  app.addHook('onClose', async () => {
    await prisma.$disconnect();
  });
});
