/**
 * Sistema de Tratamento de Erros para Orange SDR IA
 * Implementa retry logic, fallback responses e logging estruturado
 */

const winston = require('winston');
const { format } = winston;

// Configurar Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  defaultMeta: { service: 'orange-sdr-ia' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10
    }),
    new winston.transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    })
  ]
});

/**
 * Classe principal de tratamento de erros
 */
class ErrorHandler {
  constructor() {
    this.retryConfig = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      factor: 2
    };
    
    this.fallbackMessages = {
      default: 'Desculpe, tive um problema técnico. Pode repetir sua mensagem?',
      timeout: 'A operação demorou muito. Por favor, tente novamente.',
      connection: 'Problema de conexão detectado. Tentando reconectar...',
      api: 'Serviço temporariamente indisponível. Tente em alguns instantes.',
      validation: 'Dados inválidos detectados. Por favor, verifique as informações.',
      auth: 'Problema de autenticação. Nossa equipe foi notificada.',
      rate_limit: 'Muitas requisições. Aguarde um momento antes de tentar novamente.'
    };

    this.criticalErrors = new Set([
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'AUTH_ERROR',
      'CRITICAL_FAILURE'
    ]);
  }

  /**
   * Executar função com retry logic
   */
  async executeWithRetry(fn, context = {}, options = {}) {
    const config = { ...this.retryConfig, ...options };
    let lastError;
    let delay = config.initialDelay;

    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        logger.info(`Executing function, attempt ${attempt}/${config.maxRetries}`, {
          context,
          attempt
        });

        const result = await fn();
        
        if (attempt > 1) {
          logger.info('Function succeeded after retry', {
            context,
            attempt,
            totalAttempts: attempt
          });
        }

        return result;
      } catch (error) {
        lastError = error;
        
        logger.error(`Attempt ${attempt} failed`, {
          error: error.message,
          stack: error.stack,
          context,
          attempt
        });

        // Verificar se é erro crítico que não deve ter retry
        if (this.isCriticalError(error)) {
          logger.error('Critical error detected, stopping retries', {
            error: error.message,
            errorCode: error.code
          });
          throw error;
        }

        // Se não é última tentativa, aguardar antes de retry
        if (attempt < config.maxRetries) {
          logger.info(`Waiting ${delay}ms before retry`, {
            delay,
            nextAttempt: attempt + 1
          });
          
          await this.sleep(delay);
          delay = Math.min(delay * config.factor, config.maxDelay);
        }
      }
    }

    // Todas tentativas falharam
    logger.error('All retry attempts failed', {
      context,
      attempts: config.maxRetries,
      lastError: lastError.message
    });

    throw this.enhanceError(lastError, {
      attempts: config.maxRetries,
      context
    });
  }

  /**
   * Tratamento centralizado de erros
   */
  handleError(error, context = {}) {
    const errorInfo = this.analyzeError(error);
    
    logger.error('Error handled', {
      ...errorInfo,
      context,
      timestamp: new Date().toISOString()
    });

    // Notificar se crítico
    if (errorInfo.severity === 'critical') {
      this.notifyCriticalError(errorInfo, context);
    }

    // Retornar resposta apropriada
    return {
      success: false,
      error: {
        message: this.getFallbackMessage(errorInfo.type),
        code: errorInfo.code,
        type: errorInfo.type,
        severity: errorInfo.severity
      },
      fallback: this.getFallbackResponse(context)
    };
  }

  /**
   * Analisar tipo e severidade do erro
   */
  analyzeError(error) {
    const errorInfo = {
      message: error.message || 'Unknown error',
      code: error.code || 'UNKNOWN',
      type: 'unknown',
      severity: 'low',
      stack: error.stack
    };

    // Classificar tipo de erro
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      errorInfo.type = 'connection';
      errorInfo.severity = 'high';
    } else if (error.response?.status === 401 || error.response?.status === 403) {
      errorInfo.type = 'auth';
      errorInfo.severity = 'critical';
    } else if (error.response?.status === 429) {
      errorInfo.type = 'rate_limit';
      errorInfo.severity = 'medium';
    } else if (error.response?.status >= 500) {
      errorInfo.type = 'api';
      errorInfo.severity = 'high';
    } else if (error.name === 'ValidationError') {
      errorInfo.type = 'validation';
      errorInfo.severity = 'low';
    } else if (error.name === 'TimeoutError') {
      errorInfo.type = 'timeout';
      errorInfo.severity = 'medium';
    }

    return errorInfo;
  }

  /**
   * Obter mensagem de fallback apropriada
   */
  getFallbackMessage(errorType) {
    return this.fallbackMessages[errorType] || this.fallbackMessages.default;
  }

  /**
   * Gerar resposta de fallback baseada no contexto
   */
  getFallbackResponse(context) {
    const { conversationId, messageType, lastAction } = context;

    if (messageType === 'greeting') {
      return {
        message: 'Olá! Bem-vindo à Orange Incorporadora! Em que posso ajudar? 🏠',
        action: 'continue'
      };
    }

    if (lastAction === 'collecting_data') {
      return {
        message: 'Tive um problema ao processar seus dados. Vamos tentar novamente?',
        action: 'retry_collection'
      };
    }

    if (lastAction === 'showing_properties') {
      return {
        message: 'Desculpe o problema. Temos opções incríveis de imóveis! Quer conhecer o CasasMar Farol ou Coral?',
        action: 'show_options'
      };
    }

    return {
      message: this.fallbackMessages.default,
      action: 'reset'
    };
  }

  /**
   * Verificar se é erro crítico
   */
  isCriticalError(error) {
    return this.criticalErrors.has(error.code) || 
           error.severity === 'critical' ||
           error.critical === true;
  }

  /**
   * Melhorar informações do erro
   */
  enhanceError(error, metadata = {}) {
    error.metadata = metadata;
    error.timestamp = new Date().toISOString();
    error.handled = true;
    return error;
  }

  /**
   * Notificar erro crítico
   */
  async notifyCriticalError(errorInfo, context) {
    try {
      // Log crítico
      logger.error('CRITICAL ERROR ALERT', {
        ...errorInfo,
        context,
        alert: true
      });

      // Aqui poderia enviar notificação via WhatsApp, email, etc
      // await this.sendWhatsAppAlert(errorInfo);
      // await this.sendEmailAlert(errorInfo);
      
    } catch (notifyError) {
      logger.error('Failed to send critical error notification', {
        originalError: errorInfo,
        notificationError: notifyError.message
      });
    }
  }

  /**
   * Função helper para sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validar dados de entrada
   */
  validateInput(data, schema) {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];

      // Required
      if (rules.required && !value) {
        errors.push(`${field} is required`);
        continue;
      }

      // Type
      if (value && rules.type && typeof value !== rules.type) {
        errors.push(`${field} must be ${rules.type}`);
      }

      // Pattern
      if (value && rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${field} format is invalid`);
      }

      // Min/Max Length
      if (value && rules.minLength && value.length < rules.minLength) {
        errors.push(`${field} must be at least ${rules.minLength} characters`);
      }

      if (value && rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${field} must be at most ${rules.maxLength} characters`);
      }
    }

    if (errors.length > 0) {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.errors = errors;
      throw error;
    }

    return true;
  }

  /**
   * Criar circuit breaker
   */
  createCircuitBreaker(fn, options = {}) {
    const config = {
      threshold: options.threshold || 5,
      timeout: options.timeout || 60000,
      resetTimeout: options.resetTimeout || 30000
    };

    let failures = 0;
    let lastFailTime = null;
    let state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN

    return async (...args) => {
      // Verificar se circuit está aberto
      if (state === 'OPEN') {
        if (Date.now() - lastFailTime > config.resetTimeout) {
          state = 'HALF_OPEN';
          logger.info('Circuit breaker entering HALF_OPEN state');
        } else {
          throw new Error('Circuit breaker is OPEN');
        }
      }

      try {
        const result = await Promise.race([
          fn(...args),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Circuit breaker timeout')), config.timeout)
          )
        ]);

        // Reset em sucesso
        if (state === 'HALF_OPEN') {
          state = 'CLOSED';
          failures = 0;
          logger.info('Circuit breaker reset to CLOSED state');
        }

        return result;
      } catch (error) {
        failures++;
        lastFailTime = Date.now();

        if (failures >= config.threshold) {
          state = 'OPEN';
          logger.error('Circuit breaker opened due to failures', {
            failures,
            threshold: config.threshold
          });
        }

        throw error;
      }
    };
  }

  /**
   * Rate limiter simples
   */
  createRateLimiter(limit, windowMs) {
    const requests = new Map();

    return (key) => {
      const now = Date.now();
      const windowStart = now - windowMs;

      // Limpar requisições antigas
      const userRequests = requests.get(key) || [];
      const recentRequests = userRequests.filter(time => time > windowStart);

      if (recentRequests.length >= limit) {
        const error = new Error('Rate limit exceeded');
        error.code = 'RATE_LIMIT';
        throw error;
      }

      recentRequests.push(now);
      requests.set(key, recentRequests);
      
      return true;
    };
  }
}

module.exports = new ErrorHandler();