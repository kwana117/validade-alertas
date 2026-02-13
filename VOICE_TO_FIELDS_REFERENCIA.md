# Preenchimento de campos por áudio — Guia de referência

Este documento descreve de forma **genérica e universal** a feature de usar áudio (voz) para preencher formulários. Serve como referência para implementar algo semelhante noutras aplicações, com outros campos e modelos de dados.

---

## 1. Visão geral do fluxo

O fluxo tem três etapas principais:

1. **Gravar** — O utilizador grava um áudio no browser (microfone).
2. **Transcrever e extrair** — O servidor transcreve o áudio (speech-to-text) e usa um modelo de linguagem para extrair dados estruturados que mapeiam para os teus campos.
3. **Confirmar** — O utilizador vê os dados extraídos, pode editar/remover, e só depois confirma o envio.

Assim evitas submeter dados errados e dás controlo total ao utilizador antes de persistir.

---

## 2. Frontend: gravação de áudio

### 2.1 Verificar suporte

- Usar `navigator.mediaDevices?.getUserMedia` para saber se o browser suporta captura de áudio.
- Se não suportar, mostrar mensagem clara em vez de falhar ao clicar.

### 2.2 Escolher formato de gravação

O `MediaRecorder` não é igual em todos os browsers. Testar por ordem de preferência:

- `audio/webm;codecs=opus`
- `audio/webm`
- `audio/ogg;codecs=opus`
- `audio/ogg`
- `audio/mp4`

Usar `MediaRecorder.isTypeSupported(type)` e escolher o primeiro suportado. Se nenhum for suportado, instanciar `MediaRecorder` sem opções (o browser escolhe).

### 2.3 Gravar

1. `navigator.mediaDevices.getUserMedia({ audio: true })` → obtém o stream.
2. `new MediaRecorder(stream, { mimeType }?)` → cria o gravador.
3. Guardar os chunks em um array no evento `dataavailable`.
4. No evento `stop`: juntar os chunks num `Blob`, parar o stream (`getTracks().forEach(t => t.stop())`) e enviar o blob para o backend.
5. Limitar a duração máxima (ex.: 90 segundos) com um timer; ao atingir, chamar `recorder.stop()`.

### 2.4 Enviar para o backend

- Criar `FormData`, acrescentar o ficheiro: `formData.append("file", new File([blob], "voice.webm", { type: blob.type || "audio/webm" }))`.
- `POST` para a tua rota de API (ex.: `/api/voice`).
- Enquanto esperas pela resposta: estado "a processar" (spinner + mensagem).

### 2.5 Tratar a resposta

- A API deve devolver algo como: `{ transcript: string, items: Array<{ ...campos }> }` (ou o nome que fizer sentido para a tua app).
- Se houver itens/registos extraídos:
  - Guardar em `sessionStorage` (ex.: chave `voice-draft`) para a página de confirmação.
  - Redirecionar para a página de confirmação.
- Se não houver itens: mostrar modal "não foi possível extrair dados, tenta novamente".
- Em caso de erro HTTP ou mensagem de erro no JSON: mostrar a mensagem ao utilizador.

### 2.6 UX durante gravação

- Overlay/modal com: tempo de gravação, instruções curtas ("Diz X, Y e Z"), botão cancelar e botão parar gravação.
- Bloquear scroll do body enquanto o overlay está aberto (`document.body.style.overflow = "hidden"`) e restaurar no cleanup.

---

## 3. Backend: transcrição + extração estruturada

### 3.1 Receber o áudio

- Rota `POST` que recebe `multipart/form-data` com um campo `file` (ou nome que definires).
- Validar que o corpo contém um ficheiro de áudio (e opcionalmente tipo/tamanho máx.).

### 3.2 Transcrição (speech-to-text)

- Usar a **API Whisper** (OpenAI): `POST https://api.openai.com/v1/audio/transcriptions`.
- Enviar o ficheiro em `FormData` com `file`, `model` (ex.: `whisper-1`) e `language` (ex.: `pt`).
- A resposta inclui o texto transcrito (ex.: `transcriptionData.text`). Tratar erros e respostas vazias.

### 3.3 Extração de dados estruturados (texto → campos)

- Usar um modelo de chat/completions (ex.: OpenAI GPT-4o-mini) com:
  - **System message**: instruções fixas que definem:
    - O objetivo (extrair entidades/campos a partir de texto em PT ou outro idioma).
    - Regras: não inventar dados, valores default quando não indicado, formatos (datas em YYYY-MM-DD, etc.).
    - Que a resposta deve ser **apenas** JSON válido.
  - **User message**: contexto variável, por exemplo:
    - Data de hoje (para interpretar "daqui a 3 dias", "amanhã", etc.).
    - O texto transcrito.
    - O esquema JSON esperado, por exemplo: `{"items":[{"campo1":"","campo2":"", ...}]}`.

- Parâmetros úteis: `temperature: 0.2`, `response_format: { type: "json_object" }` para forçar JSON.

### 3.4 Normalizar e validar

- Fazer parse do JSON devolvido pelo modelo.
- Para cada campo:
  - Aplicar funções de normalização (trim, lowercase para enums, datas em YYYY-MM-DD, etc.).
  - Valores em falta ou inválidos: usar default ou string vazia conforme as regras da tua app.
- Devolver `{ transcript, items }` (ou o nome do array que usares) em JSON.

### 3.5 Segurança e env vars

- API key da OpenAI (e modelo) em variáveis de ambiente, nunca no frontend.
- Validar tamanho do ficheiro de áudio no servidor se necessário.

---

## 4. Página de confirmação

### 4.1 Carregar o rascunho

- Na montagem, ler de `sessionStorage` (ex.: `voice-draft`) o objeto guardado (`{ items, transcript }`).
- Se não existir ou `items` estiver vazio, redirecionar para a lista/página principal.

### 4.2 Mostrar dados

- Mostrar a **transcrição** (opcional mas útil para o utilizador rever o que disse).
- Para cada item em `items`: mostrar os campos em inputs editáveis (text, select, date, etc.).
- Permitir **editar** cada campo e **remover** itens da lista.

### 4.3 Submissão

- Validação no cliente (ex.: campos obrigatórios preenchidos).
- Enviar os itens para a API que persiste os dados (ex.: `POST /api/items/bulk` com `{ items }`).
- Em sucesso: limpar `sessionStorage`, redirecionar e refrescar dados (ex.: `router.replace` + `router.refresh()`).
- Em erro: mostrar mensagem e manter o utilizador na página de confirmação.

### 4.4 Cancelar

- Remover a chave do `sessionStorage` e redirecionar para a lista/página principal.

---

## 5. Adaptar a outra aplicação

| O que | Como adaptar |
|-------|-------------------------------|
| **Campos** | Definir o teu esquema JSON no system/user prompt (ex.: `nome`, `email`, `data`, `categoria`). Alterar a normalização no backend e os inputs na página de confirmação. |
| **Idioma** | Ajustar `language` no Whisper e o texto das instruções do modelo (PT, EN, etc.). |
| **Um único registo vs lista** | Se for um só registo: devolver `{ transcript, item }` e a página de confirmação mostra um único formulário. |
| **Rota da API** | Trocar `/api/items/voice` e `/api/items/bulk` pelas rotas da tua app. |
| **Chave de storage** | Trocar `voice-draft` por algo como `meu-projeto-voice-draft`. |
| **Máximo de gravação** | Ajustar o timer (ex.: 60s ou 120s) conforme o uso. |

---

## 6. Stack de referência (este projeto)

- **Frontend**: React (Next.js), `MediaRecorder`, `sessionStorage`, roteamento para página de confirmação.
- **Transcrição**: OpenAI Whisper (`/v1/audio/transcriptions`).
- **Extração**: OpenAI Chat Completions com `response_format: { type: "json_object" }` e prompt em PT.
- **Persistência**: API interna que recebe o array de itens já confirmados pelo utilizador.

---

## 7. Resumo em três frases

1. **Gravar** áudio no browser com `MediaRecorder`, enviar o ficheiro para uma API.
2. **No servidor**: transcrever com Whisper e extrair dados estruturados (JSON) com um modelo de linguagem, usando prompts que descrevem os teus campos e regras.
3. **Mostrar** os dados numa página de confirmação editável; só após o utilizador confirmar, enviar para a API que persiste.

Com isto podes replicar a mesma experiência noutra app, alterando apenas os campos, rotas e textos ao teu contexto.
