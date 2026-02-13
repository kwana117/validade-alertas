# Feature: Sistema de Produtos Frequentes e Input Inteligente de Validade

## 📋 Contexto

Esta feature adiciona ao projeto "Validade Alertas" um sistema inteligente que:
1. Aprende e sugere produtos que o utilizador adiciona frequentemente
2. Diferencia entre produtos comprados (com data fixa) e produtos caseiros (com duração em dias)
3. Permite gestão centralizada de produtos frequentes nas Settings
4. Otimiza a experiência de adicionar novos itens

## 🎯 Objetivos

- **Reduzir tempo de input**: Autocomplete e sugestões contextuais
- **Prevenir erros**: Sugestões adequadas por localização
- **Flexibilidade**: Suportar produtos comprados vs. caseiros
- **Configurabilidade**: Gerir produtos frequentes nas Settings

---

## 🗄️ Alterações à Base de Dados

### Nova Tabela: `frequent_items`

```sql
CREATE TABLE frequent_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  input_mode TEXT NOT NULL CHECK (input_mode IN ('date', 'duration')),
  default_duration_days INT NULL,
  allowed_locations TEXT[] NOT NULL DEFAULT ARRAY['fridge', 'freezer', 'pantry'],
  usage_count INT NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Index para melhorar performance de queries
CREATE INDEX idx_frequent_items_user_id ON frequent_items(user_id);
CREATE INDEX idx_frequent_items_usage ON frequent_items(user_id, usage_count DESC);

-- RLS Policies
ALTER TABLE frequent_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own frequent items"
  ON frequent_items FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own frequent items"
  ON frequent_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own frequent items"
  ON frequent_items FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own frequent items"
  ON frequent_items FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER set_frequent_items_updated_at
  BEFORE UPDATE ON frequent_items
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
```

### Campos Explicados

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `name` | TEXT | Nome do produto (ex: "Sopa", "Iogurte") |
| `input_mode` | TEXT | `'date'` para produtos comprados, `'duration'` para caseiros |
| `default_duration_days` | INT | Dias de validade (apenas para mode='duration') |
| `allowed_locations` | TEXT[] | Localizações onde o produto faz sentido |
| `usage_count` | INT | Contador de utilizações (para ranking) |
| `last_used_at` | TIMESTAMPTZ | Última vez usado (para sugestões recentes) |

---

## 🧠 Lógica de Negócio

### Distinção: Produtos Comprados vs. Caseiros

#### Produtos Comprados (input_mode: 'date')
- **Exemplos**: Iogurte, Leite, Queijo, Manteiga, Ovos, Fiambre
- **Característica**: Têm data de validade impressa na embalagem
- **Input**: Date picker (calendário)
- **Validade**: Varia conforme lote/marca (não faz sentido ter default)

#### Produtos Caseiros (input_mode: 'duration')
- **Exemplos**: Sopa caseira, Caldo de legumes, Restos de almoço, Guisado
- **Característica**: Feitos em casa, têm validade previsível
- **Input**: Número de dias + cálculo automático da data
- **Validade**: Consistente (ex: sopa sempre 3-4 dias)

### Sistema de Sugestões

#### Por Localização
```
Frigorífico: Iogurte, Leite, Queijo, Manteiga, Restos, Sopa caseira, Frutas
Congelador: Carne, Peixe, Gelado, Pão, Sopa congelada
Despensa: Arroz, Massa, Conservas, Bolachas, Azeite, Especiarias
```

#### Ranking de Sugestões
1. **Produtos recentes** (usados nos últimos 7 dias)
2. **Produtos frequentes** (maior usage_count)
3. **Produtos adequados à localização selecionada**

### Auto-Tracking de Produtos Frequentes

Quando o utilizador adiciona um item:
1. Verificar se já existe em `frequent_items`
2. Se SIM: incrementar `usage_count` e atualizar `last_used_at`
3. Se NÃO e `usage_count >= 2`: oferecer adicionar aos frequentes

---

## 🎨 Especificação UX/UI

### 1. Página `/add` - Formulário de Adicionar Item

#### Layout Atualizado

```
┌────────────────────────────────────────────────┐
│  🔙 Voltar                    Adicionar Item   │
├────────────────────────────────────────────────┤
│                                                │
│  Localização rápida:                          │
│  [🧊 Frigorífico] [❄️ Congelador] [🏠 Despensa]│
│                                                │
│  ─────────────────────────────────────────────│
│                                                │
│  Nome do Produto *                            │
│  ┌──────────────────────────────────────────┐ │
│  │ Sop_                                     │ │
│  └──────────────────────────────────────────┘ │
│  💡 Sugestões:                                │
│  [Sopa caseira] [Sopa congelada]             │
│                                                │
│  ─────────────────────────────────────────────│
│                                                │
│  Validade *                                   │
│  ┌─────────────────────────────────────────┐  │
│  │ ● Dura X dias  ○ Data específica        │  │
│  └─────────────────────────────────────────┘  │
│                                                │
│  Duração: [3] dias                            │
│  Presets: [1 dia] [3 dias] [1 sem] [2 sem]   │
│  💡 Expira a: 23 Jan 2026                     │
│                                                │
│  ─────────────────────────────────────────────│
│                                                │
│  Localização *                                │
│  [Frigorífico ▼]                              │
│                                                │
│  ─────────────────────────────────────────────│
│                                                │
│           [Adicionar Item]                    │
│                                                │
└────────────────────────────────────────────────┘
```

#### Comportamentos Interativos

**Autocomplete do Nome:**
- Mostra até 5 sugestões enquanto digita
- Filtra por localização selecionada
- Ordena por: recentes → frequentes → alfabético
- Click numa sugestão:
  - Preenche o nome
  - Define o input_mode (date/duration)
  - Se duration: preenche default_duration_days

**Toggle Date/Duration:**
- Alterna entre dois modos
- Ao selecionar produto frequente, modo é pré-selecionado
- Estado persiste durante a sessão

**Input de Duration:**
- Number input (min: 1, max: 365)
- Botões preset para valores comuns
- Preview da data calculada em tempo real
- Exemplo: "3 dias → Expira a 23 Jan 2026"

**Input de Date:**
- Date picker HTML5 padrão
- Min: hoje
- Max: hoje + 5 anos

### 2. Página `/settings` - Gestão de Produtos Frequentes

#### Nova Secção

```
┌────────────────────────────────────────────────┐
│  Produtos Frequentes                          │
├────────────────────────────────────────────────┤
│                                                │
│  Gere os teus produtos mais usados e define   │
│  valores padrão para agilizar o processo.     │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ [+ Adicionar Produto Frequente]          │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ 🍲 Sopa caseira                          │ │
│  │ Modo: Duração | 3 dias                   │ │
│  │ Locais: Frigorífico, Congelador          │ │
│  │ Usado: 12 vezes                          │ │
│  │ [Editar] [Eliminar]                      │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ 🥛 Iogurte                               │ │
│  │ Modo: Data específica                    │ │
│  │ Locais: Frigorífico                      │ │
│  │ Usado: 8 vezes                           │ │
│  │ [Editar] [Eliminar]                      │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ 🍞 Pão                                   │ │
│  │ Modo: Duração | 3 dias                   │ │
│  │ Locais: Despensa, Congelador             │ │
│  │ Usado: 6 vezes                           │ │
│  │ [Editar] [Eliminar]                      │ │
│  └──────────────────────────────────────────┘ │
│                                                │
└────────────────────────────────────────────────┘
```

#### Modal de Adicionar/Editar

```
┌────────────────────────────────────────────────┐
│  Produto Frequente                         [×] │
├────────────────────────────────────────────────┤
│                                                │
│  Nome *                                       │
│  ┌──────────────────────────────────────────┐ │
│  │ Sopa caseira                             │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  Modo de Input *                              │
│  ● Dura X dias (produtos caseiros)            │
│  ○ Data específica (produtos comprados)       │
│                                                │
│  Duração Padrão                               │
│  ┌──────────────────────────────────────────┐ │
│  │ [3] dias                                 │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  Localizações Permitidas *                    │
│  ☑ Frigorífico                                │
│  ☑ Congelador                                 │
│  ☐ Despensa                                   │
│                                                │
│  ─────────────────────────────────────────────│
│                                                │
│      [Cancelar]  [Guardar Produto]            │
│                                                │
└────────────────────────────────────────────────┘
```

---

## 📁 Estrutura de Ficheiros

### Novos Ficheiros

```
src/
├── app/
│   ├── add/
│   │   ├── add-form.tsx                 # ATUALIZAR
│   │   └── product-autocomplete.tsx     # NOVO
│   ├── settings/
│   │   ├── page.tsx                     # ATUALIZAR
│   │   ├── frequent-items-section.tsx   # NOVO
│   │   ├── frequent-item-card.tsx       # NOVO
│   │   └── frequent-item-modal.tsx      # NOVO
│   └── api/
│       └── frequent-items/
│           ├── route.ts                 # NOVO - GET/POST
│           └── [id]/
│               └── route.ts             # NOVO - PUT/DELETE
└── lib/
    ├── frequent-items.ts                # NOVO - utils e types
    └── date-utils.ts                    # NOVO - cálculos de datas
```

---

## 🔧 Especificação Técnica Detalhada

### 1. Types TypeScript

```typescript
// lib/frequent-items.ts

export type InputMode = 'date' | 'duration';

export interface FrequentItem {
  id: string;
  user_id: string;
  name: string;
  input_mode: InputMode;
  default_duration_days: number | null;
  allowed_locations: ('fridge' | 'freezer' | 'pantry')[];
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface FrequentItemInput {
  name: string;
  input_mode: InputMode;
  default_duration_days: number | null;
  allowed_locations: ('fridge' | 'freezer' | 'pantry')[];
}

export interface ProductSuggestion {
  id: string;
  name: string;
  input_mode: InputMode;
  default_duration_days: number | null;
  isFrequent: boolean;
}
```

### 2. API Endpoints

#### `GET/POST /api/frequent-items`

**GET - Listar produtos frequentes do utilizador**
```typescript
Response: {
  items: FrequentItem[]
}
```

**POST - Criar novo produto frequente**
```typescript
Request: FrequentItemInput
Response: {
  item: FrequentItem
}
```

#### `PUT/DELETE /api/frequent-items/[id]`

**PUT - Atualizar produto frequente**
```typescript
Request: Partial<FrequentItemInput>
Response: {
  item: FrequentItem
}
```

**DELETE - Eliminar produto frequente**
```typescript
Response: {
  success: true
}
```

#### `POST /api/frequent-items/track-usage`

**Track automático quando item é adicionado**
```typescript
Request: {
  name: string;
  location: string;
}
Response: {
  tracked: boolean;
  suggestion?: {
    message: string; // "Adicionar 'Sopa' aos frequentes?"
    item: FrequentItemInput;
  }
}
```

### 3. Componente ProductAutocomplete

```typescript
// app/add/product-autocomplete.tsx

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: ProductSuggestion) => void;
  location: 'fridge' | 'freezer' | 'pantry';
}

export function ProductAutocomplete({ value, onChange, onSelect, location }: Props) {
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch sugestões quando valor muda
  useEffect(() => {
    if (value.length >= 2) {
      fetchSuggestions(value, location).then(setSuggestions);
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [value, location]);

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ex: Sopa, Iogurte, Carne..."
      />
      
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg">
          {suggestions.map(suggestion => (
            <button
              key={suggestion.id}
              onClick={() => {
                onSelect(suggestion);
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left hover:bg-gray-100"
            >
              <div className="flex items-center justify-between">
                <span>{suggestion.name}</span>
                {suggestion.isFrequent && (
                  <span className="text-xs text-gray-500">⭐ Frequente</span>
                )}
              </div>
              {suggestion.input_mode === 'duration' && suggestion.default_duration_days && (
                <span className="text-xs text-gray-500">
                  {suggestion.default_duration_days} dias
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 4. Componente ValidityInput

```typescript
// app/add/validity-input.tsx

interface Props {
  mode: InputMode;
  onModeChange: (mode: InputMode) => void;
  durationDays: number;
  onDurationChange: (days: number) => void;
  specificDate: string;
  onDateChange: (date: string) => void;
}

export function ValidityInput({
  mode,
  onModeChange,
  durationDays,
  onDurationChange,
  specificDate,
  onDateChange
}: Props) {
  const calculatedDate = useMemo(() => {
    if (mode === 'duration') {
      return addDays(new Date(), durationDays);
    }
    return null;
  }, [mode, durationDays]);

  return (
    <div className="space-y-4">
      {/* Toggle Mode */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={mode === 'duration'}
            onChange={() => onModeChange('duration')}
          />
          <span>Dura X dias</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            checked={mode === 'date'}
            onChange={() => onModeChange('date')}
          />
          <span>Data específica</span>
        </label>
      </div>

      {/* Duration Input */}
      {mode === 'duration' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1"
              max="365"
              value={durationDays}
              onChange={(e) => onDurationChange(parseInt(e.target.value))}
              className="w-20"
            />
            <span>dias</span>
          </div>
          
          {/* Presets */}
          <div className="flex gap-2">
            {[1, 3, 7, 14].map(days => (
              <button
                key={days}
                onClick={() => onDurationChange(days)}
                className="px-3 py-1 text-sm border rounded"
              >
                {days} {days === 1 ? 'dia' : days === 7 ? 'sem' : days === 14 ? '2 sem' : 'dias'}
              </button>
            ))}
          </div>

          {/* Preview */}
          {calculatedDate && (
            <p className="text-sm text-gray-600">
              💡 Expira a: {format(calculatedDate, 'dd MMM yyyy', { locale: pt })}
            </p>
          )}
        </div>
      )}

      {/* Date Input */}
      {mode === 'date' && (
        <input
          type="date"
          value={specificDate}
          onChange={(e) => onDateChange(e.target.value)}
          min={format(new Date(), 'yyyy-MM-dd')}
          max={format(addYears(new Date(), 5), 'yyyy-MM-dd')}
        />
      )}
    </div>
  );
}
```

### 5. Lógica de Sugestões (Server-side)

```typescript
// app/api/frequent-items/suggestions/route.ts

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const location = searchParams.get('location') || '';

  // 1. Fetch produtos frequentes do user
  const { data: frequentItems } = await supabase
    .from('frequent_items')
    .select('*')
    .eq('user_id', user.id)
    .contains('allowed_locations', [location])
    .ilike('name', `%${query}%`)
    .order('usage_count', { ascending: false })
    .limit(5);

  // 2. Adicionar produtos default se poucos resultados
  const defaultProducts = getDefaultProducts(location, query);

  // 3. Merge e deduplicate
  const suggestions = [
    ...frequentItems.map(item => ({
      ...item,
      isFrequent: true
    })),
    ...defaultProducts.filter(
      defaultP => !frequentItems.some(fi => fi.name.toLowerCase() === defaultP.name.toLowerCase())
    )
  ].slice(0, 5);

  return Response.json({ suggestions });
}

function getDefaultProducts(location: string, query: string) {
  const defaults = {
    fridge: [
      { name: 'Iogurte', input_mode: 'date', default_duration_days: null },
      { name: 'Leite', input_mode: 'date', default_duration_days: null },
      { name: 'Queijo', input_mode: 'date', default_duration_days: null },
      { name: 'Sopa caseira', input_mode: 'duration', default_duration_days: 3 },
      { name: 'Restos', input_mode: 'duration', default_duration_days: 2 },
    ],
    freezer: [
      { name: 'Carne', input_mode: 'date', default_duration_days: null },
      { name: 'Peixe', input_mode: 'date', default_duration_days: null },
      { name: 'Pão', input_mode: 'duration', default_duration_days: 30 },
      { name: 'Sopa congelada', input_mode: 'duration', default_duration_days: 90 },
    ],
    pantry: [
      { name: 'Arroz', input_mode: 'date', default_duration_days: null },
      { name: 'Massa', input_mode: 'date', default_duration_days: null },
      { name: 'Conservas', input_mode: 'date', default_duration_days: null },
      { name: 'Bolachas', input_mode: 'date', default_duration_days: null },
    ]
  };

  return defaults[location]
    .filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
    .map(p => ({ ...p, isFrequent: false, id: 'default-' + p.name }));
}
```

---

## 🧪 Casos de Uso

### Caso 1: Utilizador Novo - Primeiro Item

**Contexto**: João acabou de criar conta

1. Vai a `/add`
2. Seleciona "Frigorífico"
3. Digita "Sop" → vê sugestões: "Sopa caseira", "Sopa congelada"
4. Clica "Sopa caseira"
5. Formulário preenche:
   - Nome: "Sopa caseira"
   - Modo: "Dura X dias" (pré-selecionado)
   - Duração: 3 dias (pré-preenchido)
6. Vê preview: "Expira a: 23 Jan 2026"
7. Clica "Adicionar Item"
8. Sistema não adiciona a frequentes ainda (usage_count = 1)

### Caso 2: Utilizador Frequente - Adicionar Sopa pela 3ª vez

**Contexto**: João já adicionou "Sopa caseira" 2 vezes

1. Vai a `/add`
2. Digita "Sop"
3. Vê "Sopa caseira" com estrela ⭐ (é frequente)
4. Clica
5. Tudo preenche automaticamente
6. Clica "Adicionar Item"
7. Sistema incrementa usage_count para 3

### Caso 3: Produto Comprado - Iogurte

**Contexto**: João comprou iogurtes

1. Vai a `/add`, seleciona "Frigorífico"
2. Digita "Iog" → vê "Iogurte"
3. Clica → Modo muda para "Data específica"
4. Abre calendário, seleciona data da embalagem
5. Adiciona

### Caso 4: Gerir Produto Frequente

**Contexto**: João quer ajustar duração da sopa

1. Vai a `/settings`
2. Scroll até "Produtos Frequentes"
3. Encontra "Sopa caseira"
4. Clica "Editar"
5. Modal abre com dados atuais
6. Muda duração de 3 para 4 dias
7. Guarda
8. Próximas adições usam 4 dias

---

## ✅ Checklist de Implementação

### Fase 1: Base de Dados
- [ ] Criar tabela `frequent_items` com RLS
- [ ] Adicionar indexes
- [ ] Testar políticas RLS no Supabase Dashboard

### Fase 2: API Endpoints
- [ ] `GET /api/frequent-items` - listar
- [ ] `POST /api/frequent-items` - criar
- [ ] `PUT /api/frequent-items/[id]` - atualizar
- [ ] `DELETE /api/frequent-items/[id]` - eliminar
- [ ] `GET /api/frequent-items/suggestions` - sugestões

### Fase 3: Componentes Reutilizáveis
- [ ] `ProductAutocomplete` - input com sugestões
- [ ] `ValidityInput` - toggle date/duration
- [ ] `FrequentItemCard` - card de produto nas settings
- [ ] `FrequentItemModal` - adicionar/editar

### Fase 4: Páginas
- [ ] Atualizar `/add/add-form.tsx`
- [ ] Atualizar `/settings/page.tsx`
- [ ] Criar `/settings/frequent-items-section.tsx`

### Fase 5: Utilitários
- [ ] `lib/frequent-items.ts` - types e helpers
- [ ] `lib/date-utils.ts` - cálculo de datas

### Fase 6: Testes
- [ ] Testar autocomplete com diferentes queries
- [ ] Testar toggle date/duration
- [ ] Testar cálculo de datas
- [ ] Testar gestão completa nas settings
- [ ] Testar tracking automático

---

## 🎯 Critérios de Sucesso

1. ✅ Utilizador consegue adicionar produto em < 10 segundos
2. ✅ Sugestões aparecem em < 300ms
3. ✅ Produtos frequentes sincronizam entre dispositivos
4. ✅ Modo (date/duration) é intuitivo e óbvio
5. ✅ Preview de data calculada é claro
6. ✅ UI é consistente com resto da app
7. ✅ Mobile-responsive

---

## 📝 Notas de Implementação

### Prioridades
1. **Crítico**: Schema BD + API básica
2. **Alto**: ProductAutocomplete + ValidityInput
3. **Médio**: Settings management
4. **Baixo**: Auto-tracking suggestions

### Melhorias Futuras (Pós-MVP)
- [ ] Emojis personalizados para produtos
- [ ] Importar/exportar lista de frequentes
- [ ] Partilhar templates entre utilizadores
- [ ] ML para sugerir durações baseado em histórico
- [ ] Notificações quando produto frequente está a acabar

### Considerações de Performance
- Cache de sugestões no client (5min)
- Debounce no autocomplete (300ms)
- Limit de 100 produtos frequentes por utilizador
- Index em `usage_count` para queries rápidas

---

## 🌍 Internacionalização (PT-PT)

```typescript
export const LABELS_PT = {
  inputMode: {
    duration: 'Dura X dias',
    date: 'Data específica',
  },
  durationPresets: {
    1: '1 dia',
    3: '3 dias',
    7: '1 semana',
    14: '2 semanas',
  },
  messages: {
    expiresOn: 'Expira a',
    addToFrequent: 'Adicionar aos frequentes?',
    frequentItem: 'Produto frequente',
    usedTimes: (n: number) => `Usado ${n} ${n === 1 ? 'vez' : 'vezes'}`,
  }
};
```

---

**Documento criado por**: João (utilizador)  
**Revisado para**: Claude Code  
**Data**: 20 Janeiro 2026  
**Versão**: 1.0
