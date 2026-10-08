Trabalho de Tópicos Integradores


# 🛡️ SpearShield IA

Protótipo funcional de uma plataforma corporativa de educação em cibersegurança, com foco em **spear phishing** e uso de **IA Generativa** na simulação de ataques direcionados.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Git](https://img.shields.io/badge/Git-F05032?style=flat&logo=git&logoColor=white)

---

## 📋 Sobre o projeto

O SpearShield IA treina colaboradores para identificar e-mails de phishing direcionado. O usuário aprende com vídeos, pratica em um simulador de caixa de entrada com cenários realistas e recebe feedback educativo imediato. O gestor acompanha campanhas e desempenho em um painel exclusivo.

> ⚠️ **Ambiente seguro:** o protótipo não envia e-mails, não coleta senhas e não executa código malicioso. Todos os cenários são simulados.

---

## ✨ Funcionalidades

### 🔐 Login com perfis
- Acesso de **colaborador** e **gestor**, com áreas exclusivas para cada perfil

### 📊 Dashboard de aprendizagem
- Visão geral do progresso e indicadores de risco

### 🎬 Módulo de vídeos
- Aulas em vídeo organizadas em grade, com pontos-chave de cada lição
- **Acompanhamento de progresso com persistência**: etiqueta "Assistido" e barra de progresso que sobrevivem ao recarregamento da página

### 🎣 Simulador de phishing
- Caixa de entrada fictícia com 3 cenários (2 phishing + 1 legítimo)
- Opções de resposta: **Phishing**, **Legítimo** e **"Não sei"** — a dúvida vira aprendizado, com explicação do sinal de alerta
- **Dica da IA** que orienta sem entregar a resposta
- Feedback imediato com tom educativo em todos os caminhos

### 👔 Área do gestor
- Criação de campanhas de simulação
- Painéis de acompanhamento exclusivos do perfil gestor

---

## 🚀 Como executar

Não há dependências nem instalação:

1. Clone o repositório ou baixe os arquivos
2. Dê dois cliques no `index.html` — abre direto no navegador

**Credenciais de teste:**
| Perfil | E-mail | Senha |
|---|---|---|
| Colaborador | `colab@empresa.com` | `123` |
| Gestor | `gestor@empresa.com` | `123` |

---

## 🛠️ Tecnologias

- **HTML5** — estrutura das telas
- **CSS3** — estilização, responsividade (desktop, tablet e celular)
- **JavaScript (vanilla)** — navegação, login simulado, simulador e persistência via `localStorage`
- **Git + GitHub** — versionamento com branches, Pull Requests e merge na `develop`

---

## 📁 Estrutura
