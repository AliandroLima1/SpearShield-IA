import { db } from './db.js';
import { gerarCenario, TEMAS } from './ai.mjs';

const TOTAL = Number(process.env.GEN_TOTAL || 30);
const MAX_TENTATIVAS = 5;
const ESPERA_BASE = 2500;
const ESPERA_MAX = 30000;
const PAUSA_ENTRE = 2000;
const TAMANHO_LOTE = 5;
const PAUSA_LOTE = 15000;

const TEMA_ROTULO = {
  urgencia: 'Urgência',
  dominio_parecido: 'Domínio parecido',
  anexo_inesperado: 'Anexo inesperado',
  pedido_credencial: 'Pedido de credencial',
  qr_code: 'QR Code'
};

const TEMA_NIVEL = {
  urgencia: 'Básico',
  dominio_parecido: 'Intermediário',
  anexo_inesperado: 'Intermediário',
  pedido_credencial: 'Avançado',
  qr_code: 'Avançado'
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const horaAleatoria = () => {
  const h = 8 + Math.floor(Math.random() * 10);
  const m = Math.floor(Math.random() * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const paraPreview = (corpo) => {
  const limpo = String(corpo).replace(/\s+/g, ' ').trim();
  return limpo.length > 110 ? limpo.slice(0, 107).trimEnd() + '...' : limpo;
};

function ehTransitorio(e) {
  const txt = `${e?.status ?? ''} ${e?.code ?? ''} ${e?.message ?? ''}`;
  return /503|429|500|502|504|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded|temporar/i.test(txt);
}

function resumoErro(e) {
  const bruto = String(e?.message || e);
  try {
    const j = JSON.parse(bruto);
    return `${j?.error?.code ?? '??'} ${j?.error?.status ?? ''} — ${j?.error?.message ?? ''}`.trim();
  } catch {
    return bruto.slice(0, 160);
  }
}

function espera(tentativa) {
  const base = Math.min(ESPERA_MAX, ESPERA_BASE * 2 ** (tentativa - 1));
  return Math.round(base * (0.8 + Math.random() * 0.4));
}

const colunas = db.prepare('PRAGMA table_info(scenarios)').all().map((c) => c.name);
if (!colunas.includes('origem') || !colunas.includes('status')) {
  console.error('Faltam as colunas origem/status. Aplique o patch no db.js e rode o backend uma vez.');
  process.exit(1);
}

let ultimoId = Math.max(
  db.prepare('SELECT IFNULL(MAX(id), 0) AS m FROM scenarios WHERE id >= 1000').get().m,
  999
);

const ins = db.prepare(`
  INSERT INTO scenarios
    (id, kind, level, themes, sender_name, sender_email, subject, preview, time, body,
     link_label, link_url, hint, success_text, error_text, red_flags, origem, status)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`);

async function main() {
  console.log(`Gerando ${TOTAL} cenários...\n`);
  let ok = 0, falhou = 0, pulados = 0;

  for (let i = 0; i < TOTAL; i++) {
    const tema = TEMAS[i % TEMAS.length];
    let c = null;
    let desistiu = false;

    for (let t = 1; t <= MAX_TENTATIVAS && !c && !desistiu; t++) {
      try {
        c = await gerarCenario(tema);
      } catch (e) {
        const transitorio = ehTransitorio(e);
        console.log(`  [${i + 1}/${TOTAL}] tentativa ${t}: ${resumoErro(e)}`);
        if (!transitorio) {
          console.log(`  [${i + 1}/${TOTAL}] erro permanente, cenário descartado`);
          desistiu = true;
          break;
        }
        if (t < MAX_TENTATIVAS) {
          const ms = espera(t);
          console.log(`  [${i + 1}/${TOTAL}] aguardando ${(ms / 1000).toFixed(1)}s...`);
          await sleep(ms);
        }
      }
    }

    if (!c) {
      falhou++;
      console.log(`  [${i + 1}/${TOTAL}] descartado\n`);
    } else {
      try {
        ultimoId++;
        ins.run(
          ultimoId,
          c.classificacao === 'legitimo' ? 'legit' : 'phishing',
          TEMA_NIVEL[c.tema_risco] || 'Básico',
          JSON.stringify([TEMA_ROTULO[c.tema_risco] || c.tema_risco]),
          c.remetente_nome, c.remetente_email, c.assunto,
          paraPreview(c.corpo), horaAleatoria(), c.corpo,
          c.link_texto || null, c.link_url || null,
          c.dica, c.feedback_acerto, c.feedback_erro,
          JSON.stringify(c.sinais), 'ai', 'draft'
        );
        ok++;
        console.log(`  [${i + 1}/${TOTAL}] ok  id=${ultimoId}  ${c.classificacao}  ${c.tema_risco}\n`);
      } catch (e) {
        falhou++; ultimoId--;
        console.log(`  [${i + 1}/${TOTAL}] erro ao gravar: ${e.message}\n`);
      }
    }

    if (i < TOTAL - 1) {
      if ((i + 1) % TAMANHO_LOTE === 0) {
        console.log(`  --- lote concluído, pausa de ${PAUSA_LOTE / 1000}s ---\n`);
        await sleep(PAUSA_LOTE);
      } else {
        await sleep(PAUSA_ENTRE);
      }
    }
  }

  console.log(`\nConcluído: ${ok} gravados, ${falhou} descartados.`);
  console.log('Drafts aguardando aprovação:',
    db.prepare("SELECT COUNT(*) AS n FROM scenarios WHERE status = 'draft'").get().n);
}

main().catch((e) => { console.error('Falhou:', resumoErro(e)); process.exit(1); });