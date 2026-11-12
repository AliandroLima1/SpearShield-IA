// Conteúdo extraído do protótipo original (AliandroLima1/SpearShield-IA, branch main).

// Temas de risco usados para classificar os cenários e montar os painéis.
export const themes = [
  {
    key: 'urgencia',
    label: 'Urgência',
    advice: 'Quando a mensagem impõe prazo curto, pare e confirme por um canal oficial antes de agir.'
  },
  {
    key: 'dominio',
    label: 'Domínio parecido',
    advice: 'Compare o domínio do remetente e do link, letra por letra, com o endereço oficial da empresa.'
  },
  {
    key: 'anexo',
    label: 'Anexo inesperado',
    advice: 'Não abra anexos que você não esperava. Confirme com o remetente por outro canal.'
  },
  {
    key: 'credencial',
    label: 'Pedido de credencial',
    advice: 'Nenhuma equipe legítima pede sua senha por link ou e-mail. Acesse o portal oficial digitando o endereço.'
  },
  {
    key: 'qrcode',
    label: 'QR Code',
    advice: 'QR Codes escondem o destino do link. Desconfie quando aparecem em mensagens inesperadas.'
  }
];

export const videos = [
  {
    id: 1,
    title: 'O que é Spearphishing?',
    description: 'Entenda o conceito de ataques direcionados e como os criminosos escolhem seus alvos.',
    level: 'Introdutório',
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
    description: 'Saiba como as políticas e os processos internos protegem a organização.',
    level: 'Intermediário',
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
    description: 'Visão geral da plataforma, funcionamento dos recursos e cenários simulados.',
    level: 'Prático',
    file: 'Explicando a SpearShield IA 3.mp4',
    pointsTitle: 'Objetivo da plataforma',
    keyPoints: [
      'Apresentar a interface e os principais recursos de simulação.',
      'Explicar a dinâmica de aprendizado através de cenários reais.',
      'Mostrar como acompanhar sua evolução através dos relatórios.'
    ]
  }
];

// No corpo do e-mail: parágrafos separados por linha em branco, **texto** em negrito
// e a linha {link} marca onde o link ilustrativo aparece.
export const scenarios = [
  {
    id: 1,
    kind: 'phishing',
    level: 'Intermediário',
    themes: ['urgencia', 'dominio'],
    senderName: 'Benefícios Corporativos',
    senderEmail: 'beneficios@portal-rh-seguro.com',
    subject: 'Ação necessária: atualização cadastral',
    preview: 'Para manter seus benefícios ativos, valide...',
    time: '10:42',
    body:
      'Olá, Lucas.\n\nIdentificamos uma atualização obrigatória no seu cadastro de benefícios. Para evitar a suspensão temporária, confirme seus dados até **hoje às 17h**.\n\n{link}\n\nAtenciosamente,\nCentral de Benefícios',
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
    level: 'Básico',
    themes: [],
    senderName: 'Equipe de Projetos',
    senderEmail: 'projetos@empresa.exemplo',
    subject: 'Ata da reunião semanal',
    preview: 'Segue o resumo e os próximos passos...',
    time: '09:18',
    body:
      'Bom dia, equipe.\n\nSegue o resumo da reunião de ontem. Não há anexos nem links externos. Os próximos passos também estão registrados no repositório interno já utilizado pelo time.\n\nObrigado,\nEquipe de Projetos',
    linkLabel: null,
    linkUrl: null,
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
    level: 'Intermediário',
    themes: ['urgencia', 'credencial'],
    senderName: 'Suporte TI',
    senderEmail: 'suporte-ti@acesso-seguro.example',
    subject: 'Sua senha expira hoje',
    preview: 'Evite bloqueio. Confirme o acesso agora...',
    time: '08:04',
    body:
      'Olá.\n\nSua conta será bloqueada em **30 minutos**. Para impedir a interrupção dos serviços, use o link abaixo e confirme sua senha corporativa.\n\n{link}\n\nSuporte Técnico',
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

// ---------- Dados de demonstração (somente fora de produção) ----------

// Logins de teste (senha 123).
export const testUsers = [
  { name: 'Lucas Colaborador', email: 'colab@empresa.com', role: 'colaborador', department: 'Operações', title: 'Operações • Nível 2' },
  { name: 'Ana Gestora', email: 'gestor@empresa.com', role: 'gestor', department: 'Administração', title: 'Administração • Nível 4' }
];

// Colaboradores fictícios que aparecem no protótipo. Recebem senha aleatória:
// existem só para popular os painéis do gestor, não para fazer login.
export const demoEmployees = [
  { name: 'Mariana Silva', email: 'mariana.silva@empresa.com', department: 'Logística', title: 'Logística • Nível 1' },
  { name: 'Carlos Souza', email: 'carlos.souza@empresa.com', department: 'Financeiro', title: 'Financeiro • Nível 2' },
  { name: 'Ricardo Reis', email: 'ricardo.reis@empresa.com', department: 'Recursos Humanos (RH)', title: 'RH • Nível 2' },
  { name: 'Beatriz Lima', email: 'beatriz.lima@empresa.com', department: 'Tecnologia (TI)', title: 'TI • Nível 3' }
];

// [e-mail, cenário, resposta, tempo em segundos, usou dica, dias atrás]
export const demoAttempts = [
  ['mariana.silva@empresa.com', 1, 'legit', 7, 0, 12],
  ['mariana.silva@empresa.com', 2, 'phishing', 9, 0, 11],
  ['mariana.silva@empresa.com', 3, 'legit', 6, 0, 10],
  ['carlos.souza@empresa.com', 1, 'legit', 12, 0, 9],
  ['carlos.souza@empresa.com', 2, 'legit', 20, 0, 9],
  ['carlos.souza@empresa.com', 3, 'phishing', 15, 0, 8],
  ['ricardo.reis@empresa.com', 1, 'phishing', 25, 1, 7],
  ['ricardo.reis@empresa.com', 2, 'unknown', 30, 1, 6],
  ['ricardo.reis@empresa.com', 3, 'phishing', 18, 1, 6],
  ['beatriz.lima@empresa.com', 1, 'phishing', 14, 0, 5],
  ['beatriz.lima@empresa.com', 2, 'legit', 16, 0, 5],
  ['beatriz.lima@empresa.com', 3, 'phishing', 11, 0, 4]
];

// [e-mail, ids dos vídeos assistidos]
export const demoVideoProgress = [
  ['mariana.silva@empresa.com', [1]],
  ['carlos.souza@empresa.com', [1, 2]],
  ['ricardo.reis@empresa.com', [1, 2, 3]],
  ['beatriz.lima@empresa.com', [1, 2, 3]]
];

export const demoCampaigns = [
  {
    name: 'Atualização de benefícios',
    description: 'Treinar validação de domínio, análise de urgência e confirmação por canal oficial.',
    department: 'Recursos Humanos (RH)',
    level: 'Intermediário',
    scenarioIds: [1],
    // [e-mail, cenário, resposta, segundos]
    attempts: [['ricardo.reis@empresa.com', 1, 'phishing', 21]]
  },
  {
    name: 'Troca urgente de senha',
    description: 'Reconhecer pedidos de credencial com prazo curto.',
    department: null,
    level: 'Intermediário',
    scenarioIds: [3],
    attempts: [
      ['mariana.silva@empresa.com', 3, 'legit', 5],
      ['carlos.souza@empresa.com', 3, 'phishing', 17]
    ]
  }
];
