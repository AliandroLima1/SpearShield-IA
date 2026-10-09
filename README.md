# 🛡️ SpearShield IA


**Alunos:** Aliandro Lima, Paloma Santana, Sandro Militão e Lucas Coelho

Protótipo funcional de uma plataforma corporativa de educação em cibersegurança, com foco em spear phishing e uso de IA Generativa na simulação de ataques direcionados.

---

## 📋 Sobre o projeto

O SpearShield IA treina colaboradores para identificar e-mails de phishing direcionado. O usuário aprende com vídeos, pratica em um simulador de caixa de entrada com cenários realistas e recebe feedback educativo imediato. O gestor acompanha campanhas e desempenho em um painel exclusivo.

> ⚠️ **Ambiente seguro:** O protótipo não envia e-mails, não coleta senhas e não executa código malicioso. Todos os cenários são estritamente simulados no lado do cliente.

---

## ✨ Funcionalidades

### 🔐 Login com perfis
- Acesso de colaborador e gestor, com áreas exclusivas para cada perfil.

### 📊 Dashboard de aprendizagem
- Visão geral do progresso e indicadores de risco corporativo.

### 🎬 Módulo de vídeos
- Aulas em vídeo organizadas em grade, com pontos-chave de cada lição.
- Acompanhamento de progresso com persistência: etiqueta "Assistido" e barra de progresso que sobrevivem ao recarregamento da página.

### 🎣 Simulador de phishing
- Caixa de entrada fictícia com 3 cenários (2 phishing + 1 legítimo).
- Opções de resposta: Phishing, Legítimo e "Não sei" — a dúvida vira aprendizado, com explicação do sinal de alerta.
- Dica da IA que orienta o usuário sem entregar a resposta final.
- Feedback imediato com tom educativo em todos os caminhos.

### 👔 Área do gestor
- Criação de campanhas de simulação.
- Painéis de acompanhamento exclusivos do perfil gestor.

---

## 🛠️ Tecnologias Utilizadas

- **HTML5:** Estrutura semântica das telas.
- **CSS3:** Estilização e responsividade (desktop, tablet e celular).
- **JavaScript (Vanilla):** Navegação, login simulado, simulador de cenários e persistência de dados via `localStorage`.
- **Git + GitHub:** Versionamento com branches, Pull Requests e merge na *develop*.

---

## 🚀 Como Executar

O projeto foi desenhado para ser acessível e não possui dependências complexas ou necessidade de instalação de pacotes:

1. Clone este repositório (`git clone https://github.com/AliandroLima1/SpearShield-IA.git`) ou baixe os arquivos em ZIP.
2. Dê dois cliques no arquivo `index.html` — o sistema abrirá diretamente no seu navegador.

**Credenciais de teste:**

| Perfil | E-mail | Senha |
| :--- | :--- | :--- |
| **Colaborador** | colab@empresa.com | 123 |
| **Gestor** | gestor@empresa.com | 123 |

---

## 📁 Estrutura e Organização Atual do Sistema

Atualmente, o projeto está estruturado como um **protótipo front-end autônomo (standalone)**. A organização do sistema adota uma abordagem monolítica no lado do cliente (browser), onde não há comunicação ativa com serviços de back-end.

Toda a lógica de roteamento de páginas, verificação de formulários, mecânica do simulador de phishing e persistência temporária de dados (progresso dos vídeos e acesso de perfis) é tratada localmente através de **JavaScript Vanilla** e armazenada no **localStorage** do navegador do usuário.
