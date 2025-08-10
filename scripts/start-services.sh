#!/bin/bash

# Script de Inicialização - Orange SDR IA
# Inicia todos os serviços necessários

set -e

echo "🚀 Iniciando Orange SDR IA..."
echo "================================"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker não está instalado!${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose não está instalado!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker encontrado${NC}"

# Verificar arquivo .env
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env não encontrado. Copiando do exemplo...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}📝 Por favor, edite o arquivo .env com suas credenciais${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Arquivo .env configurado${NC}"

# Parar containers existentes
echo -e "\n${YELLOW}🛑 Parando containers existentes...${NC}"
docker-compose down

# Limpar volumes antigos (opcional)
# read -p "Deseja limpar volumes antigos? (y/N) " -n 1 -r
# echo
# if [[ $REPLY =~ ^[Yy]$ ]]; then
#     docker-compose down -v
#     echo -e "${YELLOW}🧹 Volumes limpos${NC}"
# fi

# Construir imagens se necessário
echo -e "\n${YELLOW}🔨 Construindo imagens...${NC}"
docker-compose build --no-cache

# Iniciar serviços
echo -e "\n${GREEN}🚀 Iniciando serviços...${NC}"
docker-compose up -d

# Aguardar serviços iniciarem
echo -e "\n${YELLOW}⏳ Aguardando serviços iniciarem...${NC}"
sleep 10

# Verificar status dos serviços
echo -e "\n${GREEN}📊 Status dos Serviços:${NC}"
echo "================================"

# Redis
if docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo -e "Redis:      ${GREEN}✅ Online${NC}"
else
    echo -e "Redis:      ${RED}❌ Offline${NC}"
fi

# PostgreSQL
if docker-compose exec -T postgres pg_isready > /dev/null 2>&1; then
    echo -e "PostgreSQL: ${GREEN}✅ Online${NC}"
else
    echo -e "PostgreSQL: ${RED}❌ Offline${NC}"
fi

# Grafana
if curl -s http://localhost:3001 > /dev/null; then
    echo -e "Grafana:    ${GREEN}✅ Online${NC}"
else
    echo -e "Grafana:    ${YELLOW}⏳ Iniciando...${NC}"
fi

# Prometheus
if curl -s http://localhost:9090 > /dev/null; then
    echo -e "Prometheus: ${GREEN}✅ Online${NC}"
else
    echo -e "Prometheus: ${YELLOW}⏳ Iniciando...${NC}"
fi

echo "================================"

# URLs de acesso
echo -e "\n${GREEN}🌐 URLs de Acesso:${NC}"
echo "================================"
echo "Grafana:    http://localhost:3001 (admin/admin)"
echo "Prometheus: http://localhost:9090"
echo "Redis:      localhost:6379"
echo "PostgreSQL: localhost:5432"
echo "================================"

# Logs
echo -e "\n${YELLOW}📝 Para ver os logs:${NC}"
echo "docker-compose logs -f [serviço]"
echo ""
echo "Serviços disponíveis:"
echo "  - redis"
echo "  - postgres"
echo "  - grafana"
echo "  - prometheus"

echo -e "\n${GREEN}✨ Orange SDR IA iniciado com sucesso!${NC}"
echo -e "${YELLOW}📌 Próximo passo: Importar workflow no N8N${NC}"
echo ""
echo "1. Acesse: https://n8n.construtoraorange.com.br"
echo "2. Importe: workflows/main-workflow-fixed.json"
echo "3. Configure credenciais do OpenAI"
echo "4. Ative o workflow"
echo ""
echo -e "${GREEN}🎉 Pronto para usar!${NC}"