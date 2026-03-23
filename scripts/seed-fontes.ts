import { Pool } from "pg";

interface Fonte {
  sigla: string;
  nome: string;
  esfera: "FEDERAL" | "ESTADUAL";
  uf: string | null;
  tipo_spider: "CHEERIO" | "PLAYWRIGHT";
  url_portal: string;
  cron_expression: string;
  ativo: boolean;
}

const fontes: Fonte[] = [
  // Federal
  {
    sigla: "DOU",
    nome: "Diário Oficial da União",
    esfera: "FEDERAL",
    uf: null,
    tipo_spider: "CHEERIO",
    url_portal: "https://www.in.gov.br/leiturajornal",
    cron_expression: "0 5 30 * * 1-5",
    ativo: true,
  },

  // Region: Norte
  {
    sigla: "DOAC",
    nome: "Diário Oficial do Estado do Acre",
    esfera: "ESTADUAL",
    uf: "AC",
    tipo_spider: "CHEERIO",
    url_portal: "https://www.diario.ac.gov.br",
    cron_expression: "0 6 0 * * 1-5",
    ativo: true,
  },
  {
    sigla: "DOAL",
    nome: "Diário Oficial do Estado de Alagoas",
    esfera: "ESTADUAL",
    uf: "AL",
    tipo_spider: "PLAYWRIGHT",
    url_portal: "https://www.imprensaoficialal.com.br",
    cron_expression: "0 6 5 * * 1-5",
    ativo: true,
  },
  {
    sigla: "DOAP",
    nome: "Diário Oficial do Estado do Amapá",
    esfera: "ESTADUAL",
    uf: "AP",
    tipo_spider: "CHEERIO",
    url_portal: "https://www.diariooficial.ap.gov.br",
    cron_expression: "0 6 10 * * 1-5",
    ativo: true,
  },
  {
    sigla: "DOAM",
    nome: "Diário Oficial do Estado do Amazonas",
    esfera: "ESTADUAL",
    uf: "AM",
    tipo_spider: "PLAYWRIGHT",
    url_portal: "https://www.imprensaoficial.am.gov.br",
    cron_expression: "0 6 15 * * 1-5",
    ativo: true,
  },
  {
    sigla: "DOBA",
    nome: "Diário Oficial do Estado da Bahia",
    esfera: "ESTADUAL",
    uf: "BA",
    tipo_spider: "PLAYWRIGHT",
    url_portal: "https://dool.egba.ba.gov.br",
    cron_expression: "0 6 20 * * 1-5",
    ativo: true,
  },
  {
    sigla: "DOCE",
    nome: "Diário Oficial do Estado do Ceará",
    esfera: "ESTADUAL",
    uf: "CE",
    tipo_spider: "CHEERIO",
    url_portal: "https://pesquisa.doe.seplag.ce.gov.br",
    cron_expression: "0 6 25 * * 1-5",
    ativo: true,
  },
  {
    sigla: "DODF",
    nome: "Diário Oficial do Distrito Federal",
    esfera: "ESTADUAL",
    uf: "DF",
    tipo_spider: "CHEERIO",
    url_portal: "https://www.dodf.df.gov.br",
    cron_expression: "0 6 30 * * 1-5",
    ativo: true,
  },
  {
    sigla: "DOES",
    nome: "Diário Oficial do Estado do Espírito Santo",
    esfera: "ESTADUAL",
    uf: "ES",
    tipo_spider: "PLAYWRIGHT",
    url_portal: "https://ioes.dio.es.gov.br",
    cron_expression: "0 6 35 * * 1-5",
    ativo: true,
  },
  {
    sigla: "DOGO",
    nome: "Diário Oficial do Estado de Goiás",
    esfera: "ESTADUAL",
    uf: "GO",
    tipo_spider: "CHEERIO",
    url_portal: "https://diariooficial.abc.go.gov.br",
    cron_expression: "0 6 40 * * 1-5",
    ativo: true,
  },
  {
    sigla: "DOMA",
    nome: "Diário Oficial do Estado do Maranhão",
    esfera: "ESTADUAL",
    uf: "MA",
    tipo_spider: "PLAYWRIGHT",
    url_portal: "https://www.diariooficial.ma.gov.br",
    cron_expression: "0 6 45 * * 1-5",
    ativo: true,
  },
  {
    sigla: "DOMT",
    nome: "Diário Oficial do Estado de Mato Grosso",
    esfera: "ESTADUAL",
    uf: "MT",
    tipo_spider: "PLAYWRIGHT",
    url_portal: "https://www.iomat.mt.gov.br",
    cron_expression: "0 6 50 * * 1-5",
    ativo: true,
  },
  {
    sigla: "DOMS",
    nome: "Diário Oficial do Estado de Mato Grosso do Sul",
    esfera: "ESTADUAL",
    uf: "MS",
    tipo_spider: "CHEERIO",
    url_portal: "https://www.spdo.ms.gov.br/diariodoe",
    cron_expression: "0 6 55 * * 1-5",
    ativo: true,
  },
  {
    sigla: "DOMG",
    nome: "Diário Oficial do Estado de Minas Gerais",
    esfera: "ESTADUAL",
    uf: "MG",
    tipo_spider: "PLAYWRIGHT",
    url_portal: "https://www.jornalminasgerais.mg.gov.br",
    cron_expression: "0 7 0 * * 1-5",
    ativo: true,
  },
  {
    sigla: "DOPA",
    nome: "Diário Oficial do Estado do Pará",
    esfera: "ESTADUAL",
    uf: "PA",
    tipo_spider: "PLAYWRIGHT",
    url_portal: "https://www.ioepa.com.br",
    cron_expression: "0 7 5 * * 1-5",
    ativo: true,
  },
  {
    sigla: "DOPB",
    nome: "Diário Oficial do Estado da Paraíba",
    esfera: "ESTADUAL",
    uf: "PB",
    tipo_spider: "CHEERIO",
    url_portal: "https://auniao.pb.gov.br/doe",
    cron_expression: "0 7 10 * * 1-5",
    ativo: true,
  },
  {
    sigla: "DOPR",
    nome: "Diário Oficial do Estado do Paraná",
    esfera: "ESTADUAL",
    uf: "PR",
    tipo_spider: "CHEERIO",
    url_portal: "https://www.dioe.pr.gov.br",
    cron_expression: "0 7 15 * * 1-5",
    ativo: true,
  },
  {
    sigla: "DOPE",
    nome: "Diário Oficial do Estado de Pernambuco",
    esfera: "ESTADUAL",
    uf: "PE",
    tipo_spider: "PLAYWRIGHT",
    url_portal: "https://www.cepe.com.br/diariooficial",
    cron_expression: "0 7 20 * * 1-5",
    ativo: true,
  },
  {
    sigla: "DOPI",
    nome: "Diário Oficial do Estado do Piauí",
    esfera: "ESTADUAL",
    uf: "PI",
    tipo_spider: "CHEERIO",
    url_portal: "https://www.diariooficial.pi.gov.br",
    cron_expression: "0 7 25 * * 1-5",
    ativo: true,
  },
  {
    sigla: "DORJ",
    nome: "Diário Oficial do Estado do Rio de Janeiro",
    esfera: "ESTADUAL",
    uf: "RJ",
    tipo_spider: "PLAYWRIGHT",
    url_portal: "https://www.ioerj.com.br",
    cron_expression: "0 7 30 * * 1-5",
    ativo: true,
  },
  {
    sigla: "DORN",
    nome: "Diário Oficial do Estado do Rio Grande do Norte",
    esfera: "ESTADUAL",
    uf: "RN",
    tipo_spider: "CHEERIO",
    url_portal: "http://www.diariooficial.rn.gov.br",
    cron_expression: "0 7 35 * * 1-5",
    ativo: true,
  },
  {
    sigla: "DORS",
    nome: "Diário Oficial do Estado do Rio Grande do Sul",
    esfera: "ESTADUAL",
    uf: "RS",
    tipo_spider: "CHEERIO",
    url_portal: "https://www.diariooficial.rs.gov.br",
    cron_expression: "0 7 40 * * 1-5",
    ativo: true,
  },
  {
    sigla: "DORO",
    nome: "Diário Oficial do Estado de Rondônia",
    esfera: "ESTADUAL",
    uf: "RO",
    tipo_spider: "CHEERIO",
    url_portal: "https://diof.ro.gov.br",
    cron_expression: "0 7 45 * * 1-5",
    ativo: true,
  },
  {
    sigla: "DORR",
    nome: "Diário Oficial do Estado de Roraima",
    esfera: "ESTADUAL",
    uf: "RR",
    tipo_spider: "CHEERIO",
    url_portal: "https://www.imprensaoficial.rr.gov.br",
    cron_expression: "0 7 50 * * 1-5",
    ativo: true,
  },
  {
    sigla: "DOSC",
    nome: "Diário Oficial do Estado de Santa Catarina",
    esfera: "ESTADUAL",
    uf: "SC",
    tipo_spider: "CHEERIO",
    url_portal: "https://www.doe.sea.sc.gov.br",
    cron_expression: "0 7 55 * * 1-5",
    ativo: true,
  },
  {
    sigla: "DOSP",
    nome: "Diário Oficial do Estado de São Paulo",
    esfera: "ESTADUAL",
    uf: "SP",
    tipo_spider: "PLAYWRIGHT",
    url_portal: "https://www.imprensaoficial.com.br",
    cron_expression: "0 8 0 * * 1-5",
    ativo: true,
  },
  {
    sigla: "DOSE",
    nome: "Diário Oficial do Estado de Sergipe",
    esfera: "ESTADUAL",
    uf: "SE",
    tipo_spider: "CHEERIO",
    url_portal: "https://www.diariooficial.se.gov.br",
    cron_expression: "0 8 5 * * 1-5",
    ativo: true,
  },
  {
    sigla: "DOTO",
    nome: "Diário Oficial do Estado do Tocantins",
    esfera: "ESTADUAL",
    uf: "TO",
    tipo_spider: "CHEERIO",
    url_portal: "https://diariooficial.to.gov.br",
    cron_expression: "0 8 10 * * 1-5",
    ativo: true,
  },
];

async function seed() {
  const pool = new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      "postgresql://dora:dora_secret@localhost:5432/dora",
  });

  const client = await pool.connect();

  try {
    console.log("Seeding fontes table...");

    await client.query("BEGIN");

    for (const fonte of fontes) {
      await client.query(
        `INSERT INTO fontes (sigla, nome, esfera, uf, tipo_spider, url_portal, cron_expression, ativo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (sigla) DO UPDATE SET
           nome = EXCLUDED.nome,
           esfera = EXCLUDED.esfera,
           uf = EXCLUDED.uf,
           tipo_spider = EXCLUDED.tipo_spider,
           url_portal = EXCLUDED.url_portal,
           cron_expression = EXCLUDED.cron_expression,
           ativo = EXCLUDED.ativo`,
        [
          fonte.sigla,
          fonte.nome,
          fonte.esfera,
          fonte.uf,
          fonte.tipo_spider,
          fonte.url_portal,
          fonte.cron_expression,
          fonte.ativo,
        ]
      );
      console.log(`  Seeded: ${fonte.sigla} - ${fonte.nome}`);
    }

    await client.query("COMMIT");
    console.log(`\nSuccessfully seeded ${fontes.length} fontes.`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error seeding fontes:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
