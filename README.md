# SpearShield IA

**Alunos:** Aliandro Lima, Paloma Santana, Sandro Militão e Lucas Coelho

Protótipo funcional de uma plataforma corporativa de educação em cibersegurança, com foco em spear phishing e uso de IA Generativa na simulação de ataques direcionados.

## Sobre o projeto

O SpearShield IA treina colaboradores para identificar e-mails de phishing direcionado. O usuário aprende com vídeos, pratica em um simulador de caixa de entrada com cenários realistas e recebe feedback educativo imediato. O gestor acompanha campanhas e desempenho em um painel exclusivo.

> **Ambiente seguro:** o sistema não envia e-mails, não coleta senhas reais e não executa código malicioso. Todos os cenários são estritamente simulados. Os links dos e-mails fictícios nunca navegam.

## Funcionalidades

### Login com perfis
Acesso de colaborador e gestor, com autenticação no servidor e áreas exclusivas para cada perfil. As rotas são protegidas no frontend e na API.

### Dashboard de aprendizagem
- Índice de resiliência (70% acerto nas simulações + 30% progresso nas aulas), progresso da trilha, simulações concluídas e pontos de atenção por tema.
- Simulação recomendada (o próximo cenário ainda não respondido) e dica de segurança do dia.

### Meu desempenho
- Taxa de acerto, tempo médio de análise, nível atual (Iniciante, Praticante, Guardião).
- Acertos por tipo de ameaça, recomendações baseadas no histórico e histórico de simulações.
- Exportação do resumo em CSV, gerada no próprio navegador.

> Regra de cálculo: como no protótipo original, a resposta "Não sei" não conta como acerto nem como erro. A taxa de acerto considera só as respostas decididas.

### Módulo de vídeos
- 3 aulas em vídeo organizadas em grade, com player e pontos-chave de cada lição.
- Etiqueta "Assistido" e barra de progresso salvas no banco de dados, por usuário, e mantidas após recarregar a página.
- A aula é marcada como assistida quando o vídeo chega a 90%.

### Simulador de phishing
- Caixa de entrada fictícia com 3 cenários (2 phishing e 1 legítimo).
- Opções de resposta: **Phishing**, **Legítimo** e **Não sei**. A dúvida vira aprendizado, com explicação do sinal de alerta.
- Dica da IA que orienta o usuário sem entregar a resposta final.
- Feedback imediato com tom educativo em todos os caminhos.
- O gabarito fica no servidor e só é revelado após a resposta.
- Cada cenário aceita uma resposta por usuário (no treino livre e em cada campanha). O resultado fica salvo e reaparece ao recarregar a página.

### Área do gestor
- Criação e exclusão de campanhas, com público (todos ou um departamento), cenários, nível e objetivo pedagógico. A campanha aparece no simulador dos colaboradores do público escolhido.
- Indicadores: campanhas ativas, participantes, interações e resiliência média.
- Campanhas recentes com status (Ativa ou Concluída) e taxa de identificação.
- Risco humano por tema (Urgência, Domínio parecido, Anexo inesperado, Pedido de credencial, QR Code).
- Filtros por departamento e por colaborador, dificuldade por departamento, colaboradores em risco e perfil individual.
- "Notificar" envia uma notificação dentro da plataforma (sino no topo). Nenhum e-mail é enviado.
- O gestor pode abrir os vídeos e o simulador em modo prévia: as respostas dele não são registradas.

### Dados de demonstração
Fora de produção, o banco é criado com os colaboradores fictícios do protótipo (Mariana Silva, Carlos Souza, Ricardo Reis e Beatriz Lima), algumas respostas e duas campanhas, para os painéis do gestor não começarem vazios. Esses colaboradores recebem senha aleatória e não fazem login. O usuário de teste `colab@empresa.com` começa sem respostas. Para recomeçar do zero, apague `backend/data/spearshield.db`.

## Arquitetura

O projeto é uma aplicação em três camadas: SPA no navegador, API REST e banco de dados relacional.

```
┌────────────────────┐   HTTP/JSON    ┌────────────────────┐   SQL   ┌──────────────┐
│  Frontend (Vue 3)  │ ─────────────► │ Backend (Node.js)  │ ──────► │   SQLite     │
│  Vite + Router     │ ◄───────────── │ Express + sessões  │ ◄────── │ spearshield  │
└────────────────────┘   /api, /videos└────────────────────┘         └──────────────┘
```

| Camada | Tecnologia |
| --- | --- |
| Frontend | Vue 3, Vue Router, Vite |
| Backend | Node.js (LTS), Express |
| Banco de dados | SQLite (módulo nativo `node:sqlite`) |

### Estrutura de pastas

```
.
├── backend/
│   ├── src/
│   │   ├── server.js     # API REST (auth, vídeos, simulador, campanhas, painel, notificações)
│   │   ├── stats.js      # Cálculo dos indicadores
│   │   ├── db.js         # Schema SQLite, migrações e seed
│   │   └── seed.js       # Conteúdo (vídeos, cenários, temas) e dados de demonstração
│   ├── videos/           # Arquivos MP4 das aulas (servidos em /videos)
│   └── data/             # Banco spearshield.db (criado automaticamente)
├── frontend/
│   ├── src/
│   │   ├── views/        # Login, Visão geral, Vídeos, Simulador, Meu desempenho, Gestor
│   │   ├── components/   # Modais, notificações, corpo do e-mail simulado
│   │   ├── style.css     # Identidade visual do protótipo original + responsividade
│   │   ├── api.js        # Cliente HTTP e sessão
│   │   └── router.js     # Rotas e guardas por perfil
│   └── vite.config.js    # Proxy de /api e /videos para o backend
└── package.json          # Scripts de conveniência
```

### Banco de dados

O arquivo `backend/data/spearshield.db` é criado e populado automaticamente na primeira execução. Vídeos e cenários são sincronizados com o `seed.js` a cada inicialização, sem apagar progresso ou tentativas.

| Tabela | Conteúdo |
| --- | --- |
| `users` | Usuários, perfil (`colaborador` ou `gestor`), departamento e cargo. Senhas com hash scrypt. |
| `sessions` | Tokens de sessão, válidos por 8 horas. |
| `videos` / `video_progress` | Aulas e quais cada usuário já assistiu. |
| `scenarios` | E-mails simulados, nível, temas de risco, dica, feedbacks e sinais de alerta. |
| `attempts` | Respostas no simulador, com tempo de análise e uso de dica. |
| `campaigns` | Campanhas criadas pelo gestor, com público e nível. |
| `notifications` | Notificações enviadas pelo gestor aos colaboradores. |

Bancos criados por versões anteriores recebem as colunas novas automaticamente ao iniciar o servidor.

### API

| Método e rota | Perfil | Descrição |
| --- | --- | --- |
| `POST /api/login`, `POST /api/logout`, `GET /api/me` | todos | Sessão |
| `GET /api/dashboard`, `GET /api/me/performance` | colaborador | Visão geral e Meu desempenho |
| `GET /api/videos`, `POST/DELETE /api/videos/:id/watch` | autenticado | Aulas e progresso |
| `GET /api/scenarios`, `GET /api/scenarios/:id/hint`, `POST /api/scenarios/:id/answer` | autenticado | Simulador (gestor em modo prévia) |
| `GET /api/campaigns` | autenticado | Campanhas (colaborador vê só as do seu público) |
| `POST /api/campaigns`, `DELETE /api/campaigns/:id` | gestor | Gestão de campanhas |
| `GET /api/manager/overview?department=&userId=` | gestor | Painel da equipe com filtros |
| `GET /api/notifications`, `POST /api/notifications/read` | autenticado | Notificações do usuário |
| `POST /api/notifications` | gestor | Notificar um colaborador |

## Como executar

Pré-requisito: **Node.js LTS recente** (o módulo `node:sqlite` vem embutido e dispensa flag a partir do Node 22.13; o projeto foi testado no Node 26).

```bash
# 1. Clonar
git clone https://github.com/AliandroLima1/SpearShield-IA.git
cd SpearShield-IA

# 2. Instalar dependências
npm run install:all

# 3. Iniciar o backend (http://localhost:3001)
npm run start:backend

# 4. Em outro terminal, iniciar o frontend (http://localhost:5173)
npm run start:frontend
```

No PowerShell do Windows, se a execução de scripts estiver bloqueada, use `npm.cmd` no lugar de `npm`.

Acesse `http://localhost:5173`.

### Credenciais de teste

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Colaborador | colab@empresa.com | 123 |
| Gestor | gestor@empresa.com | 123 |

São credenciais de demonstração, criadas no seed apenas quando `NODE_ENV` não é `production`. Após 5 senhas erradas seguidas, o login daquele e-mail fica bloqueado por 15 minutos.

## Variáveis de ambiente (backend)

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `PORT` | `3001` | Porta da API |
| `DB_PATH` | `backend/data/spearshield.db` | Caminho do arquivo SQLite |
| `NODE_ENV` | (vazio) | Com `production`, os usuários de demonstração não são criados |

## Versionamento

Git + GitHub, com branches, Pull Requests e merge na `develop`.

## Histórico

A primeira versão do projeto foi um protótipo front-end puro (HTML, CSS e JavaScript Vanilla) com dados em `localStorage`. A arquitetura atual substitui essa persistência local por API e banco de dados, mantendo o conteúdo, a identidade visual e as funcionalidades do protótipo, incluindo as evoluções da `main` (progresso das aulas, vídeo responsivo, área de avaliação do simulador e dashboard do gestor). Os indicadores que no protótipo eram valores fixos agora são calculados a partir das respostas.
