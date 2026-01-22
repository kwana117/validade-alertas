# Scripts de Teste

Scripts para testar a aplicação diretamente no servidor sem fazer commit/pull.

## Teste Rápido de Conexão Supabase

### No servidor (via SSH ou Terminal do cPanel):

```bash
cd /home/digitali/validade.digitalimpact.pt  # ou o teu path
node scripts/test-supabase-connection.js
```

### Ou usando npm:

```bash
npm run test:supabase
```

### O que o script testa:

1. ✅ Verifica se as variáveis de ambiente estão definidas
2. ✅ Cria cliente Supabase
3. ✅ Testa query simples (SELECT 1 profile)
4. ✅ Testa query com alert_time
5. ✅ Testa cálculo de hora de Lisboa

### Exemplo de output:

```
=== TESTE DE CONEXÃO SUPABASE ===

1. Verificando variáveis de ambiente:
   NEXT_PUBLIC_SUPABASE_URL: ✓ Definido
   SUPABASE_SERVICE_ROLE_KEY: ✓ Definido
   Service Role Key prefix: sb_secret_2oHXp2...
   Service Role Key length: 51

2. Criando cliente Supabase...
   ✓ Cliente criado

3. Testando query simples (SELECT 1 profile)...
   ✓ Query executada com sucesso!
   ✓ Encontrados 1 perfis
   ✓ Primeiro perfil: abc123...
   ✓ Chat ID: 8495675514
   ✓ Alert Time: 11:45

✅ TODOS OS TESTES PASSARAM!
```

### Se houver erro:

O script mostra exatamente qual é o problema:
- ❌ Variável não definida
- ❌ API key inválida
- ❌ Erro de conexão
- ❌ Erro na query

## Vantagens

- ✅ Testa diretamente no servidor
- ✅ Não precisa de commit/pull
- ✅ Mostra erros detalhados
- ✅ Rápido (segundos vs minutos)
