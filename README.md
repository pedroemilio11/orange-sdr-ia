# 🤖 Orange SDR IA

![Status](https://img.shields.io/badge/status-em_desenvolvimento-yellow)
![License](https://img.shields.io/badge/license-proprietary-red)
![N8N](https://img.shields.io/badge/n8n-latest-orange)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-green)

Sistema de SDR (Sales Development Representative) com Inteligência Artificial para qualificação automática de leads imobiliários da Orange Incorporadora.

## 📋 Sobre o Projeto

O Orange SDR IA é um sistema conversacional inteligente que:
- 💬 Atende leads automaticamente via WhatsApp/Chat
- 🧠 Usa IA para manter conversas naturais e contextualizadas
- 📊 Extrai dados automaticamente (nome, CPF, telefone, renda, entrada)
- 🏢 Integra com CV CRM para cadastro automático
- 📱 Notifica equipe comercial em tempo real
- 🎯 Qualifica leads com scoring inteligente

## 🏠 Empreendimentos

### CasasMar Farol
- 💰 **Valor**: R$ 179.900
- 📍 **Localização**: Bairro Farol, Parnaíba-PI
- 📅 **Entrega**: Dezembro/2026

### CasasMar Coral
- 💰 **Valor**: R$ 149.900
- 📍 **Localização**: Bairro Coral, Parnaíba-PI
- 📅 **Entrega**: Dezembro/2026

## 🚀 Quick Start

### Pré-requisitos
- Docker & Docker Compose
- N8N (v1.0+)
- Redis
- Node.js 18+

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/pedroemilio11/orange-sdr-ia.git
cd orange-sdr-ia
```

2. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite o arquivo .env com suas credenciais
```

3. Inicie os serviços:
```bash
docker-compose up -d
```

4. Importe o workflow no N8N:
```bash
./scripts/import-workflow.sh
```

5. Configure o webhook no Chatwoot:
```bash
./scripts/setup-webhook.sh
```

## 🏗️ Arquitetura

```
┌─────────────┐     ┌──────────┐     ┌─────────┐
│  WhatsApp   │────▶│ Chatwoot │────▶│   N8N   │
└─────────────┘     └──────────┘     └────┬────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
              ┌─────▼─────┐        ┌──────▼──────┐        ┌──────▼──────┐
              │  OpenAI   │        │    Redis    │        │   CV CRM    │
              │  GPT-4o   │        │  (Context)  │        │   (Leads)   │
              └───────────┘        └─────────────┘        └─────────────┘
```

## 📊 Fluxo de Dados

1. **Recepção**: Webhook recebe mensagem do Chatwoot
2. **Processamento**: N8N valida e processa mensagem
3. **Contexto**: Redis mantém histórico da conversa
4. **IA**: OpenAI gera resposta contextualizada
5. **Extração**: Sistema extrai dados automaticamente
6. **Resposta**: Envia resposta para o cliente
7. **Integração**: Cadastra lead qualificado no CRM
8. **Notificação**: Envia resumo via WhatsApp

## 🔧 Configuração

### Variáveis de Ambiente

```env
# N8N
N8N_HOST=https://n8n.construtoraorange.com.br
N8N_WEBHOOK_URL=https://n8n.construtoraorange.com.br/webhook

# OpenAI
OPENAI_API_KEY=your_api_key

# Chatwoot
CHATWOOT_URL=https://chatwoot.construtoraorange.com.br
CHATWOOT_TOKEN=your_token
CHATWOOT_ACCOUNT_ID=2

# CV CRM
CVCRM_URL=https://orange.cvcrm.com.br/api/cvio/lead
CVCRM_TOKEN=your_token
CVCRM_EMAIL=pedroemilio@orange.cnt.br

# WhatsApp
EVOLUTION_URL=https://evolution.construtoraorange.com.br
EVOLUTION_INSTANCE=orange-ia
EVOLUTION_API_KEY=your_key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

## 📈 Métricas e KPIs

- **Taxa de Resposta**: > 95%
- **Tempo de Resposta**: < 3 segundos
- **Taxa de Coleta de Dados**: > 70%
- **Conversão para CRM**: > 60%
- **Lead Score Médio**: > 65/100
- **Uptime**: > 99.5%

## 🧪 Testes

```bash
# Testes unitários
npm run test:unit

# Testes de integração
npm run test:integration

# Testes end-to-end
npm run test:e2e

# Todos os testes
npm test
```

## 📦 Deploy

### Produção

```bash
# Deploy com Docker
./scripts/deploy.sh production

# Deploy manual
docker-compose -f docker-compose.prod.yml up -d
```

### Monitoramento

- **Logs**: `docker logs orange-sdr-ia`
- **Métricas**: Dashboard Grafana em `/metrics`
- **Health Check**: `curl https://api.orange.com/health`

## 🤝 Contribuindo

1. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
2. Commit: `git commit -m 'feat: adiciona nova funcionalidade'`
3. Push: `git push origin feature/nova-funcionalidade`
4. Abra um Pull Request

## 📝 Documentação

- [Arquitetura Detalhada](docs/ARCHITECTURE.md)
- [Guia de Instalação](docs/SETUP.md)
- [API Reference](docs/API.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)

## 🔒 Segurança

- Todas as credenciais em variáveis de ambiente
- Comunicação HTTPS/WSS
- Tokens com rotação periódica
- Logs sem dados sensíveis
- Backup automático diário

## 📞 Suporte

- **Email**: pedroemilio@orange.cnt.br
- **WhatsApp**: (86) 99984-6223
- **Issues**: [GitHub Issues](https://github.com/pedroemilio11/orange-sdr-ia/issues)

## 📄 Licença

Proprietary - Orange Incorporadora © 2025

---

<div align="center">
  <strong>Desenvolvido com ❤️ pela Orange Incorporadora</strong><br>
  <sub>Transformando o atendimento imobiliário com Inteligência Artificial</sub>
</div>