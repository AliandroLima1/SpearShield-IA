import { GoogleGenAI } from '@google/genai';

// Lista de modelos em ordem de preferência.
// GEMINI_MODEL e GEMINI_MODEL_FALLBACK vêm do .env (fallback aceita vários, separados por vírgula)
export const MODELOS = [
  process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  ...(process.env.GEMINI_MODEL_FALLBACK || 'gemini-3.5-flash-lite').split(',')
]
  .map((m) => m.trim())
  .filter(Boolean)
  .filter((m, i, arr) => arr.indexOf(m) === i);

export const TEMAS = [
  'urgencia',
  'dominio_parecido',
  'anexo_inesperado',
  'pedido_credencial',
  'qr_code'
];

let _ai;
function cliente() {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY ausente no .env');
  _ai ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return _ai;
}

const schema = {
  type: 'object',
  properties: {
    remetente_nome:  { type: 'string' },
    remetente_email: { type: 'string', description: 'Dominio .example' },
    assunto:         { type: 'string' },
    corpo:           { type: 'string' },
    link_texto:      { type: 'string' },
    link_url:        { type: 'string', description: 'URL .example ou vazio' },
    classificacao:   { type: 'string', enum: ['phishing', 'legitimo'] },
    tema_risco:      { type: 'string', enum: TEMAS },
    sinais:          { type: 'array', items: { type: 'string' } },
    dica:            { type: 'string' },
    feedback_acerto: { type: 'string' },
    feedback_erro:   { type: 'string' }
  },
  required: ['remetente_nome','remetente_email','assunto','corpo',
             'classificacao','tema_risco','sinais','dica',
             'feedback_acerto','feedback_erro']
};

function prompt(tema) {
  return `Você cria cenários de treinamento antiphishing para uma empresa fictícia.
Gere UMA mensagem corporativa simulada em português do Brasil.
${tema ? `Tema de risco obrigatório: ${tema}.` : `Escolha um tema entre: ${TEMAS.join(', ')}.`}
Regras absolutas:
- Escreva em português do Brasil com acentuação correta
- Todo domínio de e-mail e de link DEVE terminar em .example
- Nunca cite empresa, pessoa, marca ou órgão real
- Se for phishing, liste de 3 a 5 sinais de alerta objetivos
- Se for legítimo, liste no campo sinais o que comprova a legitimidade
- Tom profissional, corpo entre 80 e 200 palavras
- O campo dica orienta o colaborador SEM entregar a resposta correta
- feedback_acerto e feedback_erro explicam o resultado em 2 ou 3 frases`;
}

function dominioFicticio(valor) {
  if (!valor) return true;
  const limpo = String(valor).replace(/^https?:\/\//i, '').split('/')[0];
  const host = limpo.includes('@') ? limpo.split('@').pop() : limpo;
  return /\.example$/i.test(host);
}

export function validar(c) {
  const erros = [];
  if (!['phishing','legitimo'].includes(c.classificacao)) erros.push('classificacao invalida');
  if (!TEMAS.includes(c.tema_risco)) erros.push('tema_risco invalido');
  if (!dominioFicticio(c.remetente_email)) erros.push('email fora de .example');
  if (c.link_url && !dominioFicticio(c.link_url)) erros.push('link fora de .example');
  if (!Array.isArray(c.sinais) || c.sinais.length < 2) erros.push('sinais insuficientes');
  if (!c.corpo || c.corpo.trim().length < 80) erros.push('corpo curto');
  if (/https?:\/\/(?![\w.-]+\.example)/i.test(c.corpo)) erros.push('link real no corpo');
  return erros;
}

// Erros que valem nova tentativa (congestionamento, cota, instabilidade)
export function ehTransitorio(e) {
  const txt = `${e?.status ?? ''} ${e?.code ?? ''} ${e?.message ?? ''}`;
  return /503|429|500|502|504|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded|temporar/i.test(txt);
}

// Modelo inexistente: não adianta insistir, troca de modelo
export function modeloInvalido(e) {
  const txt = `${e?.status ?? ''} ${e?.message ?? ''}`;
  return /404|NOT_FOUND|not found|is not supported|unsupported model/i.test(txt);
}

export function resumoErro(e) {
  const bruto = String(e?.message || e);
  try {
    const j = JSON.parse(bruto);
    return `${j?.error?.code ?? '??'} ${j?.error?.status ?? ''} — ${j?.error?.message ?? ''}`.trim();
  } catch {
    return bruto.slice(0, 160);
  }
}

export async function gerarCenario(tema, modelo = MODELOS[0]) {
  const r = await cliente().models.generateContent({
    model: modelo,
    contents: prompt(tema),
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: schema,
      temperature: 0.9
    }
  });

  const cenario = JSON.parse(r.text);
  const erros = validar(cenario);
  if (erros.length) throw new Error(`validacao: ${erros.join('; ')}`);
  return cenario;
}