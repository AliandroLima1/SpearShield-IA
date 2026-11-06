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
Visão geral do progresso, taxa de acerto e indicadores de risco. O gestor vê os indicadores consolidados da equipe.

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
- Criação e exclusão de campanhas de simulação, escolhendo os cenários.
- Painéis de acompanhamento por campanha e por colaborador (vídeos, simulações, respostas "Não sei", taxa de acerto e nível de risco).

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
│   │   ├── server.js     # API REST (auth, vídeos, simulador, campanhas, painel)
│   │   ├── db.js         # Schema SQLite, conexão e seed
│   │   └── seed.js       # Conteúdo: vídeos e cenários
│   ├── videos/           # Arquivos MP4 das aulas (servidos em /videos)
│   └── data/             # Banco spearshield.db (criado automaticamente)
├── frontend/
│   ├── src/
│   │   ├── views/        # Login, Dashboard, Vídeos, Simulador, Gestor
│   │   ├── api.js        # Cliente HTTP e sessão
│   │   └── router.js     # Rotas e guardas por perfil
│   └── vite.config.js    # Proxy de /api e /videos para o backend
└── package.json          # Scripts de conveniência
```

### Banco de dados

O arquivo `backend/data/spearshield.db` é criado e populado automaticamente na primeira execução. Vídeos e cenários são sincronizados com o `seed.js` a cada inicialização, sem apagar progresso ou tentativas.

| Tabela | Conteúdo |
| --- | --- |
| `users` | Usuários e perfil (`colaborador` ou `gestor`). Senhas com hash scrypt. |
| `sessions` | Tokens de sessão, válidos por 8 horas. |
| `videos` / `video_progress` | Aulas e quais cada usuário já assistiu. |
| `scenarios` | E-mails simulados, dica, feedbacks e sinais de alerta. |
| `attempts` | Respostas dos usuários no simulador. |
| `campaigns` | Campanhas criadas pelo gestor. |

### API

| Método e rota | Perfil | Descrição |
| --- | --- | --- |
| `POST /api/login`, `POST /api/logout`, `GET /api/me` | todos | Sessão |
| `GET /api/dashboard` | todos | Indicadores do usuário |
| `GET /api/videos`, `POST/DELETE /api/videos/:id/watch` | autenticado | Aulas e progresso |
| `GET /api/scenarios`, `GET /api/scenarios/:id/hint`, `POST /api/scenarios/:id/answer` | autenticado | Simulador |
| `GET /api/campaigns` | autenticado | Lista de campanhas |
| `POST/DELETE /api/campaigns` | gestor | Gestão de campanhas |
| `GET /api/manager/overview` | gestor | Painel da equipe |

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

A primeira versão do projeto foi um protótipo front-end puro (HTML, CSS e JavaScript Vanilla) com dados em `localStorage`. A arquitetura atual substitui essa persistência local por API e banco de dados, mantendo o conteúdo e as funcionalidades do protótipo.
