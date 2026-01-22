#!/usr/bin/env node

/**
 * Script para testar conexão ao Supabase diretamente no servidor
 * Executa: node scripts/test-supabase-connection.js
 * 
 * Este script lê as variáveis de ambiente diretamente do process.env
 * (que vêm do .htaccess em produção via LiteSpeed/Apache)
 */

const { createClient } = require('@supabase/supabase-js');

// Ler do process.env (vem do .htaccess em produção)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('=== TESTE DE CONEXÃO SUPABASE ===\n');

// Verificar variáveis
console.log('1. Verificando variáveis de ambiente:');
console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✓ Definido' : '✗ NÃO DEFINIDO'}`);
console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${serviceRoleKey ? '✓ Definido' : '✗ NÃO DEFINIDO'}`);
console.log(`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${anonKey ? '✓ Definido' : '✗ NÃO DEFINIDO'}`);

if (serviceRoleKey) {
  console.log(`   Service Role Key prefix: ${serviceRoleKey.substring(0, 20)}...`);
  console.log(`   Service Role Key length: ${serviceRoleKey.length}`);
}

if (!supabaseUrl || !serviceRoleKey) {
  console.error('\n❌ ERRO: Variáveis de ambiente em falta!');
  console.error('   Verifica se estão definidas no .htaccess ou .env.local');
  process.exit(1);
}

console.log('\n2. Criando cliente Supabase...');
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

console.log('   ✓ Cliente criado');

console.log('\n3. Testando query simples (SELECT 1 profile)...');
supabase
  .from('profiles')
  .select('id, telegram_chat_id, alert_time')
  .limit(1)
  .then(({ data, error }) => {
    if (error) {
      console.error('   ✗ ERRO na query:');
      console.error(`      Mensagem: ${error.message}`);
      console.error(`      Código: ${error.code || 'N/A'}`);
      console.error(`      Hint: ${error.hint || 'N/A'}`);
      console.error(`      Detalhes: ${JSON.stringify(error, null, 2)}`);
      
      if (error.message?.includes('API key') || error.message?.includes('Unregistered')) {
        console.error('\n❌ PROBLEMA IDENTIFICADO: API Key inválida ou não registada');
        console.error('   Solução:');
        console.error('   1. Vai ao Supabase Dashboard > Settings > API');
        console.error('   2. Copia a "service_role secret" key atual');
        console.error('   3. Atualiza no .htaccess (linha 12)');
        console.error('   4. Reinicia a aplicação');
      }
      process.exit(1);
    } else {
      console.log('   ✓ Query executada com sucesso!');
      console.log(`   ✓ Encontrados ${data?.length || 0} perfis`);
      if (data && data.length > 0) {
        console.log(`   ✓ Primeiro perfil: ${data[0].id}`);
        console.log(`   ✓ Chat ID: ${data[0].telegram_chat_id || 'N/A'}`);
        console.log(`   ✓ Alert Time: ${data[0].alert_time || 'N/A'}`);
      }
    }
  })
  .then(() => {
    console.log('\n4. Testando query com alert_time...');
    return supabase
      .from('profiles')
      .select('id, alert_time, telegram_chat_id')
      .not('telegram_chat_id', 'is', null)
      .limit(5);
  })
  .then(({ data, error }) => {
    if (error) {
      console.error('   ✗ ERRO na query de alert_time:');
      console.error(`      ${error.message}`);
      process.exit(1);
    } else {
      console.log(`   ✓ Encontrados ${data?.length || 0} perfis com chat ID`);
      if (data && data.length > 0) {
        console.log('   ✓ Horas configuradas:');
        data.forEach(p => {
          console.log(`      - ${p.alert_time} (user: ${p.id.substring(0, 8)}...)`);
        });
      }
    }
  })
  .then(() => {
    console.log('\n5. Testando cálculo de hora de Lisboa...');
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Lisbon',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const hours = parts.find(p => p.type === 'hour')?.value.padStart(2, '0') || '00';
    const minutes = parts.find(p => p.type === 'minute')?.value.padStart(2, '0') || '00';
    const lisbonTime = `${hours}:${minutes}`;
    
    console.log(`   ✓ Hora UTC: ${now.toISOString()}`);
    console.log(`   ✓ Hora Lisboa: ${lisbonTime}`);
    console.log(`   ✓ Formatter result: ${formatter.format(now)}`);
  })
  .then(() => {
    console.log('\n✅ TODOS OS TESTES PASSARAM!');
    console.log('\nA conexão ao Supabase está a funcionar corretamente.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ ERRO INESPERADO:');
    console.error(err);
    process.exit(1);
  });
