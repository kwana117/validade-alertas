# Setup: Tabela Frequent Items

Para ativar a funcionalidade de **Produtos Frequentes**, é necessário executar o seguinte SQL no Supabase.

## Passos

1. Vai ao [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleciona o projeto **validade-alertas**
3. Vai a **SQL Editor** no menu lateral
4. Cola e executa o SQL abaixo

## SQL a Executar

```sql
-- =============================================
-- PRODUTOS FREQUENTES
-- =============================================

-- Tabela de produtos frequentes
CREATE TABLE IF NOT EXISTS public.frequent_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  input_mode TEXT NOT NULL CHECK (input_mode IN ('date', 'duration')),
  default_duration_days INT NULL,
  allowed_locations TEXT[] NOT NULL DEFAULT ARRAY['fridge', 'freezer', 'pantry'],
  usage_count INT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE(user_id, name)
);

-- Indexes para melhorar performance
CREATE INDEX IF NOT EXISTS idx_frequent_items_user_id ON public.frequent_items(user_id);
CREATE INDEX IF NOT EXISTS idx_frequent_items_usage ON public.frequent_items(user_id, usage_count DESC);

-- RLS para frequent_items
ALTER TABLE public.frequent_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own frequent items"
ON public.frequent_items FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own frequent items"
ON public.frequent_items FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own frequent items"
ON public.frequent_items FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own frequent items"
ON public.frequent_items FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para updated_at nos frequent_items
DROP TRIGGER IF EXISTS trg_frequent_items_updated_at ON public.frequent_items;
CREATE TRIGGER trg_frequent_items_updated_at
BEFORE UPDATE ON public.frequent_items
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
```

## Verificação

Após executar, verifica que a tabela foi criada:

1. Vai a **Table Editor** no Supabase
2. Deves ver a tabela `frequent_items` na lista
3. Vai à app e testa adicionar um produto frequente em **Definições**

## Estrutura da Tabela

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | Identificador único |
| `user_id` | UUID | Referência ao utilizador |
| `name` | TEXT | Nome do produto |
| `input_mode` | TEXT | `'date'` ou `'duration'` |
| `default_duration_days` | INT | Dias de validade (se mode='duration') |
| `allowed_locations` | TEXT[] | Array de localizações permitidas |
| `usage_count` | INT | Contador de utilizações |
| `last_used_at` | TIMESTAMPTZ | Última utilização |
| `created_at` | TIMESTAMPTZ | Data de criação |
| `updated_at` | TIMESTAMPTZ | Data de atualização |
