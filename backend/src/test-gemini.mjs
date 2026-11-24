import { gerarCenario } from './ai.mjs';

console.log('modelo:', process.env.GEMINI_MODEL || 'gemini-3.8-flash');

try {
  const c = await gerarCenario();
  console.log('\n--- CENARIO GERADO ---');
  console.log('tema:', c.tema_risco);
  console.log('classificacao:', c.classificacao);
  console.log('assunto:', c.assunto);
  console.log('de:', c.remetente_nome, '<' + c.remetente_email + '>');
  console.log('\n' + c.corpo);
  console.log('\nsinais:');
  c.sinais.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  console.log('\ndica:', c.dica);
} catch (e) {
  console.error('FALHOU:', e.message);
  process.exit(1);
}