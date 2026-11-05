// Conteúdo extraído do repositório original (AliandroLima1/SpearShield-IA, app.js).
export const videos = [
  {
    id: 1,
    title: 'O que é Spearphishing?',
    description: 'Entenda como funcionam os ataques direcionados e como eles diferem do phishing comum.',
    file: 'Explicando sobre Spearphishing 1.mp4',
    pointsTitle: 'Conceitos de Spearphishing',
    keyPoints: [
      'Entenda a diferença entre Phishing comum e Spearphishing.',
      'Ataques direcionados usam engenharia social avançada.',
      'Os cibercriminosos estudam o alvo antes de atacar.'
    ]
  },
  {
    id: 2,
    title: 'Controle Administrativo',
    description: 'O papel das políticas e dos controles administrativos na segurança da informação.',
    file: 'Controle Administrativo 2.mp4',
    pointsTitle: 'Controles de Segurança',
    keyPoints: [
      'A importância das políticas de segurança da informação.',
      'Como os controles administrativos mitigam riscos.',
      'A responsabilidade de cada colaborador na cadeia de segurança.'
    ]
  },
  {
    id: 3,
    title: 'Conhecendo a SpearShield IA',
    description: 'Apresentação da plataforma, dos cenários de simulação e dos relatórios de evolução.',
    file: 'Explicando a SpearShield IA 3.mp4',
    pointsTitle: 'Objetivo da plataforma',
    keyPoints: [
      'Apresentar a interface e os principais recursos de simulação.',
      'Explicar a dinâmica de aprendizado através de cenários reais.',
      'Mostrar como acompanhar sua evolução através dos relatórios.'
    ]
  }
];

export const scenarios = [
  {
    id: 1,
    kind: 'phishing',
    senderName: 'Benefícios Corporativos',
    senderEmail: 'beneficios@portal-rh-seguro.com',
    subject: 'Ação necessária: atualização cadastral',
    time: '10:42',
    body:
      'Olá, Lucas.\n\nIdentificamos uma atualização obrigatória no seu cadastro de benefícios. Para evitar a suspensão temporária, confirme seus dados até hoje às 17h.\n\nAtenciosamente,\nCentral de Benefícios',
    linkLabel: 'Atualizar cadastro agora',
    linkUrl: 'https://portal-beneficios-verifica.example/atualizar',
    hint: 'Compare o domínio do remetente e o destino do link com os endereços oficiais usados pela sua empresa.',
    successText:
      'Correto. Há pressão por urgência e o domínio não corresponde ao portal corporativo oficial. O caminho mais seguro é confirmar pelo canal oficial antes de qualquer ação.',
    errorText:
      'Essa mensagem foi criada para simular phishing. A urgência e o domínio externo são sinais relevantes. Em situação real, confirme a solicitação por um canal oficial.',
    redFlags: [
      'Urgência: prazo até hoje às 17h',
      'Domínio do remetente não corresponde ao portal corporativo',
      'Link leva a domínio externo',
      'Ameaça de suspensão de benefícios'
    ]
  },
  {
    id: 2,
    kind: 'legit',
    senderName: 'Equipe de Projetos',
    senderEmail: 'projetos@empresa.exemplo',
    subject: 'Ata da reunião semanal',
    time: '09:18',
    body:
      'Bom dia, equipe.\n\nSegue o resumo da reunião de ontem. Não há anexos nem links externos. Os próximos passos também estão registrados no repositório interno já utilizado pelo time.\n\nObrigado,\nEquipe de Projetos',
    linkLabel: null,
    linkUrl: 'Nenhum link externo nesta mensagem',
    hint: 'Procure por pedidos incomuns, urgência, mudança de canal, anexos inesperados ou domínios divergentes.',
    successText:
      'Boa análise. O cenário não apresenta os sinais de risco usados nesta simulação. Mesmo assim, manter atenção ao contexto continua sendo importante.',
    errorText:
      'Neste cenário, a mensagem foi construída como legítima. Ela não pede credenciais, não cria urgência e não direciona para domínio externo.',
    redFlags: [
      'Nenhum sinal de alerta: sem pedido de dados, sem urgência e sem link externo'
    ]
  },
  {
    id: 3,
    kind: 'phishing',
    senderName: 'Suporte TI',
    senderEmail: 'suporte-ti@acesso-seguro.example',
    subject: 'Sua senha expira hoje',
    time: '08:04',
    body:
      'Olá.\n\nSua conta será bloqueada em 30 minutos. Para impedir a interrupção dos serviços, use o link abaixo e confirme sua senha corporativa.\n\nSuporte Técnico',
    linkLabel: 'Manter minha conta ativa',
    linkUrl: 'https://acesso-seguro.example/confirmar',
    hint: 'Solicitar senha por link e impor um prazo muito curto são sinais de alerta importantes.',
    successText:
      'Correto. O cenário combina urgência intensa com solicitação de credencial. Nunca informe senha por um link recebido em mensagem.',
    errorText:
      'Esta mensagem simula phishing. Um suporte legítimo não deve pedir sua senha por link. Procure o portal oficial ou acione o canal de suporte conhecido.',
    redFlags: [
      'Prazo de 30 minutos para bloqueio da conta',
      'Pedido de senha corporativa por link',
      'Domínio do remetente genérico e externo'
    ]
  }
];
