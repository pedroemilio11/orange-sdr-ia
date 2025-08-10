# 🔧 CORREÇÕES PARA O WORKFLOW ORANGE SDR IA

## 1. CONFIGURAR PROMPT NO NODE OPENAI (URGENTE!)

No node **"OpenAI Chat (Ora)"**, adicione no campo **System Message**:

```
Você é Ora, assistente virtual da Orange Incorporadora em Parnaíba-PI.

🏠 EMPREENDIMENTOS:
• CasasMar Farol: R$ 179.900 (Bairro Farol)
• CasasMar Coral: R$ 149.900 (Bairro Coral)
• Conclusão: Dezembro/2026
• Site: casasmar.com.br

📋 OBJETIVO:
Coletar naturalmente durante a conversa:
1. Nome completo
2. CPF (para análise de crédito)
3. Telefone
4. Renda mensal
5. Valor de entrada disponível

💬 PERSONALIDADE:
• Simpática e acolhedora
• Profissional mas descontraída
• Nunca insistente
• Responde todas as dúvidas
• Foco em ajudar, não em vender

⚡ REGRAS:
• Mantenha conversa natural
• Não force coleta de dados
• Se cliente resistir, continue normalmente
• Apresente benefícios quando apropriado
• Use emojis com moderação
• Máximo 3 parágrafos por resposta

CONTEXTO ATUAL:
{{$json.contexto}}

MENSAGEM DO CLIENTE:
{{$json.messageContent}}
```

## 2. SUBSTITUIR MEMÓRIA ESTÁTICA POR REDIS

### Instalar Redis no Docker:
```bash
docker run -d --name redis-sdr \
  -p 6379:6379 \
  --restart always \
  redis:alpine
```

### Substituir nodes de contexto:

**Node "Buscar Contexto":**
```javascript
// Usar Redis ao invés de memória estática
const Redis = require('ioredis');
const redis = new Redis({
  host: 'localhost',
  port: 6379
});

const conversationId = $input.item.json.conversationId;
const key = `sdr:context:${conversationId}`;

try {
  const contextStr = await redis.get(key);
  const contexto = contextStr ? JSON.parse(contextStr) : null;
  
  return {
    ...$input.item.json,
    contextoExistente: contexto
  };
} catch (error) {
  console.error('Erro ao buscar contexto:', error);
  return {
    ...$input.item.json,
    contextoExistente: null
  };
}
```

**Node "Salvar Contexto":**
```javascript
const Redis = require('ioredis');
const redis = new Redis({
  host: 'localhost',
  port: 6379
});

const contexto = $input.item.json.contexto;
const conversationId = $input.item.json.conversationId;
const key = `sdr:context:${conversationId}`;

try {
  // Salvar com TTL de 24 horas
  await redis.setex(key, 86400, JSON.stringify(contexto));
  console.log('Contexto salvo no Redis:', conversationId);
} catch (error) {
  console.error('Erro ao salvar contexto:', error);
}

return $input.item.json;
```

## 3. ADICIONAR TRATAMENTO DE ERROS

### Node de Error Handler (adicionar após cada integração):

```javascript
try {
  // Processar normalmente
  return items;
} catch (error) {
  console.error('Erro no workflow:', {
    node: $node.name,
    error: error.message,
    conversation: $json.conversationId,
    timestamp: new Date().toISOString()
  });
  
  // Resposta de fallback
  return [{
    json: {
      ...$json,
      error: true,
      fallbackMessage: "Desculpe, tive um problema técnico. Um consultor entrará em contato em breve.",
      shouldNotify: true
    }
  }];
}
```

## 4. OTIMIZAR EXTRAÇÃO DE DADOS

### Node "Processar Resposta IA" melhorado:

```javascript
// Regex patterns otimizados
const patterns = {
  nome: /(?:me chamo|meu nome é|sou o?a?)\s+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+)*)/i,
  cpf: /\b(\d{3})[.\s-]?(\d{3})[.\s-]?(\d{3})[.\s-]?(\d{2})\b/,
  telefone: /\b(?:\(?\d{2}\)?[\s-]?)?([9]?\d{4})[\s-]?(\d{4})\b/,
  renda: /(?:renda|ganho|recebo|salário).*?R?\$?\s*([\d.,]+)/i,
  entrada: /(?:entrada|tenho|posso dar).*?R?\$?\s*([\d.,]+)/i
};

function extrairDados(texto) {
  const dados = { ...contexto.dados_coletados };
  
  // Extrair com validação
  for (const [campo, pattern] of Object.entries(patterns)) {
    if (!dados[campo]) {
      const match = texto.match(pattern);
      if (match) {
        let valor = match[0];
        
        // Limpar e validar
        if (campo === 'cpf') {
          valor = valor.replace(/\D/g, '');
          if (valor.length === 11) {
            dados.cpf = valor;
          }
        } else if (campo === 'telefone') {
          valor = valor.replace(/\D/g, '');
          if (valor.length >= 10) {
            dados.telefone = valor;
          }
        } else if (campo === 'renda' || campo === 'entrada') {
          valor = parseFloat(valor.replace(/[^\d,]/g, '').replace(',', '.'));
          if (!isNaN(valor)) {
            dados[campo] = valor;
          }
        } else {
          dados[campo] = match[1].trim();
        }
      }
    }
  }
  
  return dados;
}
```

## 5. ADICIONAR ANALYTICS E MONITORAMENTO

### Node de Analytics (adicionar após salvar contexto):

```javascript
const analytics = {
  timestamp: new Date().toISOString(),
  conversation_id: $json.conversationId,
  event_type: 'message_processed',
  etapa: $json.contexto.etapa_atual,
  dados_coletados: Object.keys($json.contexto.dados_coletados).filter(k => $json.contexto.dados_coletados[k]),
  lead_score: calculateLeadScore($json.contexto.dados_coletados),
  response_time_ms: Date.now() - new Date($json.timestamp).getTime()
};

// Enviar para Google Sheets ou banco de dados
console.log('Analytics:', JSON.stringify(analytics));

function calculateLeadScore(dados) {
  let score = 0;
  if (dados.nome) score += 20;
  if (dados.cpf) score += 20;
  if (dados.telefone) score += 15;
  if (dados.renda > 3000) score += 25;
  if (dados.entrada > 50000) score += 20;
  return Math.min(score, 100);
}

return [{
  json: {
    ...$json,
    analytics
  }
}];
```

## 6. CONFIGURAR RETRY E TIMEOUT

Em TODOS os nodes HTTP Request, adicione:

```json
{
  "options": {
    "timeout": 30000,
    "retry": {
      "enabled": true,
      "maxRetries": 3,
      "retryInterval": 5000
    }
  }
}
```

## 7. SUB-WORKFLOWS PARA ESCALABILIDADE

Dividir em 4 sub-workflows:

1. **sdr-webhook-processor**: Recebe e valida webhook
2. **sdr-ai-conversation**: Processa com IA e contexto
3. **sdr-crm-integration**: Cadastra no CRM
4. **sdr-notifications**: Envia WhatsApp e emails

## CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Configurar System Message no OpenAI
- [ ] Instalar e configurar Redis
- [ ] Substituir memória estática por Redis
- [ ] Adicionar error handlers
- [ ] Otimizar extração de dados
- [ ] Implementar analytics
- [ ] Configurar retry/timeout
- [ ] Testar fluxo completo
- [ ] Monitorar logs de erro
- [ ] Validar integrações

## TESTE APÓS CORREÇÕES

```bash
curl -X POST https://n8n.construtoraorange.com.br/webhook/orange-sdr-conversacional-pro \
  -H "Content-Type: application/json" \
  -d '{
    "event": "message_created",
    "message": {
      "content": "Olá, sou João Silva, CPF 123.456.789-00, quero saber sobre os imóveis",
      "sender": {"type": "contact"}
    },
    "conversation": {"id": 999, "account_id": 2},
    "contact": {"phone": "86999887766"}
  }'
```

---
Implementar essas correções tornará o workflow PRODUÇÃO-READY! 🚀