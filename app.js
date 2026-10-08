const pages = document.querySelectorAll('.page');
const navItems = document.querySelectorAll('.nav-item');
const pageTitle = document.getElementById('pageTitle');
const breadcrumb = document.getElementById('breadcrumb');
const sidebar = document.getElementById('sidebar');

// --- SISTEMA DE NAVEGAÇÃO ---
function showPage(pageName) {
  pages.forEach(p => p.classList.toggle('active', p.id === `page-${pageName}`));
  navItems.forEach(n => {
    const active = n.dataset.page === pageName;
    n.classList.toggle('active', active);
    if (active) n.setAttribute('aria-current', 'page');
    else n.removeAttribute('aria-current');
  });
  const page = document.getElementById(`page-${pageName}`);
  if (page) {
    pageTitle.textContent = page.dataset.title || 'CyberAware IA';
    breadcrumb.textContent = pageName === 'dashboard' ? 'Início' : 'Início / Plataforma';
  }
  sidebar.classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

navItems.forEach(item => item.addEventListener('click', () => showPage(item.dataset.page)));
document.querySelectorAll('[data-go]').forEach(btn => btn.addEventListener('click', () => showPage(btn.dataset.go)));
document.getElementById('mobileMenu').addEventListener('click', () => sidebar.classList.toggle('open'));

// --- SISTEMA DE LOGIN SIMULADO ---
const loginScreen = document.getElementById('loginScreen');
const appShell = document.getElementById('appShell');
const userNameDisplay = document.getElementById('userNameDisplay');
const userRoleDisplay = document.getElementById('userRoleDisplay');
const userAvatarDisplay = document.getElementById('userAvatarDisplay');

const loginForm = document.getElementById('loginForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginError = document.getElementById('loginError');

function performLogin(role) {
  loginScreen.classList.add('hidden');
  appShell.classList.remove('hidden');
  
  const isManager = role === 'gestor';
  
  // Mostra ou esconde as abas e painéis exclusivos de gestor
  document.querySelectorAll('.manager-only').forEach(el => {
    el.classList.toggle('hidden', !isManager);
  });
  
  // Atualiza os dados do usuário logado
  if (isManager) {
    userAvatarDisplay.textContent = 'AG';
    userNameDisplay.textContent = 'Ana Gestora';
    userRoleDisplay.textContent = 'Administração • Nível 4';
  } else {
    userAvatarDisplay.textContent = 'LC';
    userNameDisplay.textContent = 'Lucas Colaborador';
    userRoleDisplay.textContent = 'Operações • Nível 2';
  }
  
  showPage('dashboard');
}

// Evento de submissão do formulário (quando clica em "Entrar")
loginForm.addEventListener('submit', (e) => {
  e.preventDefault(); // Impede a página de recarregar
  
  const email = loginEmail.value.trim().toLowerCase();
  const senha = loginPassword.value;
  
  loginError.classList.add('hidden'); // Esconde o erro antes de checar

  // Validação das credenciais simuladas
  if (email === 'colab@empresa.com' && senha === '123') {
    performLogin('colaborador');
    loginForm.reset(); 
  } else if (email === 'gestor@empresa.com' && senha === '123') {
    performLogin('gestor');
    loginForm.reset();
  } else {
    loginError.classList.remove('hidden');
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  appShell.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  loginError.classList.add('hidden');
});

// --- SISTEMA DE MODAIS E VÍDEOS ---
const lessonModal = document.getElementById('lessonModal');
const lessonTitle = document.getElementById('lessonModalTitle');
const realVideoPlayer = document.getElementById('realVideoPlayer');
const videoLoadingOverlay = document.getElementById('videoLoadingOverlay');

const modalPointsTitle = document.getElementById('modalPointsTitle');
const modalPointsList = document.getElementById('modalPointsList');
const modalQuizCard = document.getElementById('modalQuizCard');

let bufferingTimeout;

// Dicionário com os nomes exatos dos seus arquivos de vídeo
const lessonData = {
  "O que é Spearphishing?": {
    video: "videos/Explicando sobre Spearphishing 1.mp4",
    pointsTitle: "Conceitos de Spearphishing",
    points: [
      "Entenda a diferença entre Phishing comum e Spearphishing.",
      "Ataques direcionados usam engenharia social avançada.",
      "Os cibercriminosos estudam o alvo antes de atacar."
    ],
    hasQuiz: false 
  },
  "Controle Administrativo": {
    video: "videos/Controle Administrativo 2.mp4",
    pointsTitle: "Controles de Segurança",
    points: [
      "A importância das políticas de segurança da informação.",
      "Como os controles administrativos mitigam riscos.",
      "A responsabilidade de cada colaborador na cadeia de segurança."
    ],
    hasQuiz: false 
  },
  "Conhecendo a SpearShield IA": {
    video: "videos/Explicando a SpearShield IA 3.mp4",
    pointsTitle: "Objetivo da plataforma",
    points: [
      "Apresentar a interface e os principais recursos de simulação.",
      "Explicar a dinâmica de aprendizado através de cenários reais.",
      "Mostrar como acompanhar sua evolução através dos relatórios."
    ],
    hasQuiz: false
  }
};

// --- PROGRESSO DAS AULAS ---
const PROGRESS_KEY = 'spearsield_progress';

function getWatchedLessons() {
  return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '[]');
}

function markLessonWatched(lessonName) {
  const watched = getWatchedLessons();
  if (!watched.includes(lessonName)) {
    watched.push(lessonName);
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(watched));
  }
  updateProgressUI();
}

function updateProgressUI() {
  const watched = getWatchedLessons();
  const total = Object.keys(lessonData).length;
  const pct = Math.round((watched.length / total) * 100);

  // Restaura as etiquetas "Assistido" dos cards
  document.querySelectorAll('[data-lesson]').forEach(btn => {
    const card = btn.closest('.course-card');
    if (!card) return;
    const badge = card.querySelector('.badge');
    if (!badge) return;
    if (watched.includes(btn.dataset.lesson)) {
      badge.className = 'badge success';
      badge.textContent = 'Assistido';
    }
  });

  // Atualiza a barra de progresso
  const bar = document.getElementById('progressBar');
  const label = document.getElementById('progressLabel');
  if (bar) bar.style.width = pct + '%';
  if (label) label.textContent = `${watched.length} de ${total} aulas concluídas (${pct}%)`;
}

document.querySelectorAll('[data-lesson]').forEach(btn => btn.addEventListener('click', (e) => {
  const lessonName = btn.dataset.lesson;
  lessonTitle.textContent = lessonName;
  lessonModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  
  // Registra a aula como assistida (salva no navegador e atualiza a barra)
  markLessonWatched(lessonName);

  const data = lessonData[lessonName];
  
  if (data) {
    modalPointsTitle.textContent = data.pointsTitle;
    modalPointsList.innerHTML = data.points.map(p => `<li>${p}</li>`).join('');
    
    if (data.hasQuiz) {
      modalQuizCard.classList.remove('hidden');
    } else {
      modalQuizCard.classList.add('hidden');
    }

    videoLoadingOverlay.classList.remove('hidden');
    realVideoPlayer.removeAttribute('controls'); 
    realVideoPlayer.src = data.video; 
    
    bufferingTimeout = setTimeout(() => {
      videoLoadingOverlay.classList.add('hidden');
      realVideoPlayer.setAttribute('controls', 'controls'); 
      realVideoPlayer.play(); 
    }, 2500); 
  }
}));

function closeLesson() {
  lessonModal.classList.add('hidden');
  document.body.style.overflow = '';
  
  clearTimeout(bufferingTimeout);
  realVideoPlayer.pause();
  realVideoPlayer.currentTime = 0;
}

document.getElementById('closeLesson').addEventListener('click', closeLesson);
lessonModal.addEventListener('click', e => { if (e.target === lessonModal) closeLesson(); });

// Modais da Área do Gestor
const campaignModal = document.getElementById('campaignModal');
document.getElementById('newCampaignBtn').addEventListener('click', () => {
  campaignModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
});

function closeCampaign() {
  campaignModal.classList.add('hidden');
  document.body.style.overflow = '';
}
document.getElementById('closeCampaign').addEventListener('click', closeCampaign);
campaignModal.addEventListener('click', e => { if (e.target === campaignModal) closeCampaign(); });
document.getElementById('saveCampaign').addEventListener('click', () => {
  closeCampaign();
  const toast = document.getElementById('toast');
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2600);
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeLesson();
    closeCampaign();
    sidebar.classList.remove('open');
  }
});


// --- SIMULADOR DE PHISHING E CARREGAMENTO DA IA ---
const scenarios = [
  {
    sender:'Benefícios Corporativos',
    address:'beneficios@portal-rh-seguro.com',
    subject:'Ação necessária: atualização cadastral',
    time:'10:42',
    content:`<p>Olá, Lucas.</p><p>Identificamos uma atualização obrigatória no seu cadastro de benefícios. Para evitar a suspensão temporária, confirme seus dados até <strong>hoje às 17h</strong>.</p><p><a href="#" class="fake-link" onclick="return false;">Atualizar cadastro agora</a></p><p>Atenciosamente,<br>Central de Benefícios</p>`,
    link:'https://portal-beneficios-verifica.example/atualizar',
    answer:'phishing',
    hint:'Compare o domínio do remetente e o destino do link com os endereços oficiais usados pela sua empresa.',
    success:'Correto. Há pressão por urgência e o domínio não corresponde ao portal corporativo oficial. O caminho mais seguro é confirmar pelo canal oficial antes de qualquer ação.',
    error:'Essa mensagem foi criada para simular phishing. A urgência e o domínio externo são sinais relevantes. Em situação real, confirme a solicitação por um canal oficial.'
  },
  {
    sender:'Equipe de Projetos',
    address:'projetos@empresa.exemplo',
    subject:'Ata da reunião semanal',
    time:'09:18',
    content:`<p>Bom dia, equipe.</p><p>Segue o resumo da reunião de ontem. Não há anexos nem links externos. Os próximos passos também estão registrados no repositório interno já utilizado pelo time.</p><p>Obrigado,<br>Equipe de Projetos</p>`,
    link:'Nenhum link externo nesta mensagem',
    answer:'legit',
    hint:'Procure por pedidos incomuns, urgência, mudança de canal, anexos inesperados ou domínios divergentes.',
    success:'Boa análise. O cenário não apresenta os sinais de risco usados nesta simulação. Mesmo assim, manter atenção ao contexto continua sendo importante.',
    error:'Neste cenário, a mensagem foi construída como legítima. Ela não pede credenciais, não cria urgência e não direciona para domínio externo.'
  },
  {
    sender:'Suporte TI',
    address:'suporte-ti@acesso-seguro.example',
    subject:'Sua senha expira hoje',
    time:'08:04',
    content:`<p>Olá.</p><p>Sua conta será bloqueada em 30 minutos. Para impedir a interrupção dos serviços, use o link abaixo e confirme sua senha corporativa.</p><p><a href="#" class="fake-link" onclick="return false;">Manter minha conta ativa</a></p><p>Suporte Técnico</p>`,
    link:'https://acesso-seguro.example/confirmar',
    answer:'phishing',
    hint:'Solicitar senha por link e impor um prazo muito curto são sinais de alerta importantes.',
    success:'Correto. O cenário combina urgência intensa com solicitação de credencial. Nunca informe senha por um link recebido em mensagem.',
    error:'Esta mensagem simula phishing. Um suporte legítimo não deve pedir sua senha por link. Procure o portal oficial ou acione o canal de suporte conhecido.'
  }
];

let currentScenario = 0;
let answered = false;

function renderScenario(index) {
  const s = scenarios[index];
  document.getElementById('emailSender').textContent = s.sender;
  document.getElementById('emailAddress').textContent = s.address;
  document.getElementById('emailSubject').textContent = s.subject;
  document.getElementById('emailTime').textContent = s.time;
  document.getElementById('emailContent').innerHTML = s.content;
  document.getElementById('linkDestination').textContent = s.link;
  document.querySelectorAll('.mail-item').forEach((m,i) => m.classList.toggle('selected', i === index));
  document.getElementById('aiHint').textContent = 'Posso dar uma pista sem entregar a resposta.';
  document.getElementById('feedbackCard').className = 'feedback-card hidden';
  document.getElementById('nextScenario').classList.add('hidden');
  document.querySelector('.sim-status strong').textContent = `${index + 1} de ${scenarios.length}`;
  answered = false;
}

document.querySelectorAll('.mail-item').forEach(item => {
  item.addEventListener('click', () => {
    currentScenario = Number(item.dataset.message);
    renderScenario(currentScenario);
  });
});

document.getElementById('hintBtn').addEventListener('click', () => {
  document.getElementById('aiHint').textContent = scenarios[currentScenario].hint;
});

document.querySelectorAll('[data-answer]').forEach(btn => {
  btn.addEventListener('click', () => {
    if (answered) return;
    answered = true;
    const chosen = btn.dataset.answer;
    const s = scenarios[currentScenario];
    const card = document.getElementById('feedbackCard');

    // Opção "Não sei": não conta como acerto nem erro, ensina na hora
    if (chosen === 'unsure') {
      const eraPhishing = s.answer === 'phishing';
      card.classList.remove('hidden');
      card.classList.add('neutral');
      document.getElementById('feedbackIcon').textContent = '?';
      document.getElementById('feedbackTitle').textContent = 'Tudo bem ter dúvida!';
      document.getElementById('feedbackText').textContent =
        (eraPhishing
          ? 'Este cenário era um phishing. '
          : 'Este cenário era uma mensagem legítima. ') + s.hint;
      document.getElementById('nextScenario').classList.remove('hidden');
      return;
    }

    const correct = chosen === s.answer;
    card.classList.remove('hidden');
    card.classList.add(correct ? 'correct' : 'wrong');
    document.getElementById('feedbackIcon').textContent = correct ? '✓' : '!';
    document.getElementById('feedbackTitle').textContent = correct ? 'Boa análise!' : 'Vamos revisar este sinal';
    document.getElementById('feedbackText').textContent = correct ? s.success : s.error;
    document.getElementById('nextScenario').classList.remove('hidden');
  });
});

document.getElementById('nextScenario').addEventListener('click', () => {
  const aiLoading = document.getElementById('aiSimLoadingOverlay');
  
  // 1. Mostra a tela de carregamento da IA
  aiLoading.classList.remove('hidden');
  
  // 2. Esconde o feedback anterior e o botão imediatamente
  document.getElementById('feedbackCard').classList.add('hidden');
  document.getElementById('nextScenario').classList.add('hidden');
  
  // 3. Aguarda 2 segundos simulando a IA e avança de cenário
  setTimeout(() => {
    aiLoading.classList.add('hidden');
    currentScenario = (currentScenario + 1) % scenarios.length;
    renderScenario(currentScenario);
  }, 2000);
});

// Inicializa com o primeiro e-mail do simulador
renderScenario(0);

// Restaura o progresso salvo ao carregar a página
updateProgressUI();