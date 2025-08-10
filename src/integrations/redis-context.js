/**
 * Redis Context Manager para Orange SDR IA
 * Gerencia persistência de contexto de conversas
 */

const Redis = require('ioredis');

class RedisContextManager {
  constructor(config = {}) {
    this.redis = new Redis({
      host: config.host || process.env.REDIS_HOST || 'localhost',
      port: config.port || process.env.REDIS_PORT || 6379,
      password: config.password || process.env.REDIS_PASSWORD,
      db: config.db || process.env.REDIS_DB || 0,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3
    });

    this.ttl = config.ttl || process.env.REDIS_TTL || 86400; // 24 horas padrão
    this.prefix = config.prefix || 'orange:sdr:context:';
    
    this.setupErrorHandling();
  }

  /**
   * Configurar tratamento de erros
   */
  setupErrorHandling() {
    this.redis.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    this.redis.on('connect', () => {
      console.log('Redis Client Connected');
    });

    this.redis.on('ready', () => {
      console.log('Redis Client Ready');
    });
  }

  /**
   * Obter contexto de uma conversa
   */
  async getContext(conversationId) {
    try {
      const key = this.prefix + conversationId;
      const data = await this.redis.get(key);
      
      if (!data) {
        return this.createInitialContext(conversationId);
      }

      const context = JSON.parse(data);
      
      // Atualizar último acesso
      context.lastAccess = new Date().toISOString();
      await this.updateContext(conversationId, context);
      
      return context;
    } catch (error) {
      console.error('Error getting context:', error);
      return this.createInitialContext(conversationId);
    }
  }

  /**
   * Atualizar contexto de uma conversa
   */
  async updateContext(conversationId, context) {
    try {
      const key = this.prefix + conversationId;
      
      // Merge com contexto existente
      const existingContext = await this.getContext(conversationId);
      const updatedContext = {
        ...existingContext,
        ...context,
        messageCount: (existingContext.messageCount || 0) + 1,
        lastUpdate: new Date().toISOString()
      };

      // Salvar com TTL
      await this.redis.setex(
        key,
        this.ttl,
        JSON.stringify(updatedContext)
      );

      return updatedContext;
    } catch (error) {
      console.error('Error updating context:', error);
      throw error;
    }
  }

  /**
   * Adicionar mensagem ao histórico
   */
  async addMessage(conversationId, message, role = 'user') {
    try {
      const context = await this.getContext(conversationId);
      
      if (!context.messages) {
        context.messages = [];
      }

      context.messages.push({
        role,
        content: message,
        timestamp: new Date().toISOString()
      });

      // Limitar histórico a últimas 20 mensagens
      if (context.messages.length > 20) {
        context.messages = context.messages.slice(-20);
      }

      await this.updateContext(conversationId, context);
      return context;
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
  }

  /**
   * Atualizar dados coletados
   */
  async updateCollectedData(conversationId, data) {
    try {
      const context = await this.getContext(conversationId);
      
      context.dadosColetados = {
        ...context.dadosColetados,
        ...data
      };

      // Calcular progresso de coleta
      const campos = ['nome', 'cpf', 'telefone', 'email', 'renda', 'entrada'];
      const coletados = campos.filter(campo => context.dadosColetados[campo]).length;
      context.progressoColeta = Math.round((coletados / campos.length) * 100);

      await this.updateContext(conversationId, context);
      return context;
    } catch (error) {
      console.error('Error updating collected data:', error);
      throw error;
    }
  }

  /**
   * Criar contexto inicial
   */
  createInitialContext(conversationId) {
    return {
      conversationId,
      createdAt: new Date().toISOString(),
      lastUpdate: new Date().toISOString(),
      lastAccess: new Date().toISOString(),
      messageCount: 0,
      messages: [],
      dadosColetados: {},
      leadScore: 0,
      progressoColeta: 0,
      empreendimentoInteresse: null,
      proximaAcao: 'qualificar',
      tags: [],
      notas: []
    };
  }

  /**
   * Limpar contexto de uma conversa
   */
  async clearContext(conversationId) {
    try {
      const key = this.prefix + conversationId;
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Error clearing context:', error);
      return false;
    }
  }

  /**
   * Obter estatísticas de uso
   */
  async getStats() {
    try {
      const keys = await this.redis.keys(this.prefix + '*');
      const memoryUsage = await this.redis.info('memory');
      
      return {
        activeConversations: keys.length,
        memoryUsage: memoryUsage.match(/used_memory_human:(.+)/)?.[1] || 'unknown',
        uptime: await this.redis.info('server').match(/uptime_in_seconds:(\d+)/)?.[1] || 0
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return null;
    }
  }

  /**
   * Limpar contextos expirados manualmente
   */
  async cleanupExpired() {
    try {
      const keys = await this.redis.keys(this.prefix + '*');
      let cleaned = 0;

      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -1) {
          // Sem TTL definido, definir TTL padrão
          await this.redis.expire(key, this.ttl);
          cleaned++;
        }
      }

      return { cleaned, total: keys.length };
    } catch (error) {
      console.error('Error cleaning up:', error);
      return null;
    }
  }

  /**
   * Fechar conexão
   */
  async disconnect() {
    await this.redis.quit();
  }
}

module.exports = RedisContextManager;