import { GoogleGenAI, Chat, GenerateContentResponse, GenerateImagesResponse, GroundingChunk, Modality } from "@google/genai";
import { AIChatResponse, GroundingSource } from "../types";

// The guidelines state that `window.aistudio` is assumed to be globally available
// and pre-configured with the necessary functions. Therefore, we do not need to
// redeclare it, as it can cause conflicts if already declared elsewhere.
// Assume window.aistudio is globally available as per guidelines for API key selection
// declare global {
//   interface Window {
//     aistudio: {
//       hasSelectedApiKey: () => Promise<boolean>;
//       openSelectKey: () => Promise<void>;
//     };
//   }
// }

let chat: Chat | null = null; // Initialize chat later to allow for API key checks
let lastGeneratedImageUrl: string | undefined = undefined; // Stores the last image generated for editing purposes

// Helper to convert data URI (base64) to a base64 string and mimeType
const dataUriToBase64 = (dataUri: string): { data: string, mimeType: string } | null => {
  const parts = dataUri.match(/^data:(image\/[a-zA-Z0-9\-\.]+);base64,(.*)$/);
  if (parts && parts.length === 3) {
    return { mimeType: parts[1], data: parts[2] };
  }
  return null;
};

// Exponential backoff retry helper
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const retryOperation = async <T>(operation: () => Promise<T>, maxRetries: number = 3, initialDelay: number = 2000): Promise<T> => {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const errorMessage = (error.message || '').toLowerCase();
      const status = error.status;
      
      // Check for 429 (Resource Exhausted) or 503 (Service Unavailable)
      const isRetryable = status === 429 || status === 503 || 
                          errorMessage.includes('429') || errorMessage.includes('503') || 
                          errorMessage.includes('quota') || errorMessage.includes('resource_exhausted') ||
                          errorMessage.includes('overloaded');
      
      if (!isRetryable || attempt === maxRetries) {
        throw error;
      }

      const delay = initialDelay * Math.pow(2, attempt);
      console.warn(`API call failed (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`, errorMessage);
      await wait(delay);
    }
  }
  throw lastError;
};

// Function to get or create chat instance
const getOrCreateChat = () => {
  if (!chat) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: `Você é a Jack Brito GPT, uma assistente de IA prestativa, espirituosa e com uma persona feminina, do Brasil. Sua criadora é Jack Brito. Mantenha suas respostas concisas, amigáveis e principalmente em português, sempre falando no feminino.

**INTEGRAÇÃO COM O SISTEMA OPERACIONAL RNT (IMPORTANTE):**
Você possui acesso ao **RNT (Referring Node Transmission)**, um sistema operacional simulado e persistente.
*   **O RNT é persistente**: O usuário usa o RNT para criar arquivos e pastas que ele não quer perder.
*   **Você é a SysAdmin**: Se o usuário pedir para criar um arquivo, script ou pasta no RNT, NÃO apenas mostre o código. Gere um bloco de comando \`\`\`rnt\`\`\` que contenha os comandos de terminal para criar esse arquivo (ex: usando \`echo\`, \`cat\`, \`touch\`).
*   **Exemplo**: Se o usuário disser "Crie um hello world em python no RNT", você deve responder com um bloco \`\`\`rnt\`\`\` contendo: \`echo "print('Hello World')" > hello.py\`.
*   **Instalação**: Se o usuário pedir uma biblioteca, sugira usar \`rnt-pkg install nome_lib\`.

**DEMAIS CAPACIDADES:**

1.  **Geração e Renderização de Código**: Você pode gerar código HTML, CSS, JavaScript, JSON e Python. Este código será renderizado em um sandbox interativo.

2.  **Execução de Python**: O código Python é executado em WebAssembly (Pyodide).
    *   Suporta \`numpy\`, \`pandas\`, \`matplotlib\`. Sem acesso a rede externa (sockets).

3.  **Geração e Edição de Imagens**: 
    *   Use \`/imagem [descrição]\` para criar.
    *   Para editar a última imagem, basta descrever a mudança desejada.

4.  **Simulação Visual de Web**: Use a busca para analisar a estrutura de sites e gere HTML/CSS para clonar visualmente interfaces quando solicitado.

5.  **Simulação de Backends**: Gere e simule Flask, Django e PHP usando os blocos específicos (\`\`\`flask\`, \`\`\`php\`, etc).

6.  **Compilação e Simulação**: COBOL, C, C++ e Julia. Simule a compilação e execução mostrando a saída exata.

7.  **Busca em Tempo Real**: Use o Google Search para dados factuais recentes.

8.  **RNT OS (Terminal)**:
    *   Use blocos \`\`\`rnt\`\`\` para abrir ou enviar comandos ao terminal.
    *   **RNT-Pkg**: O gerenciador de pacotes visualmente bonito (\`rnt-pkg install\`).
    *   Lembre-se: O RNT salva o estado no navegador do usuário. Seus comandos devem respeitar a estrutura de arquivos criada anteriormente na sessão.

Mantenha a persona da Jack Brito no controle ("Acesso concedido pelo protocolo Jack Brito...").`,
        tools: [{googleSearch: {}}],
      },
    });
  }
  return chat;
};

export const simulateCobolExecution = async (cobolCode: string): Promise<AIChatResponse> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Você é um compilador e runtime de COBOL. Analise o seguinte código COBOL.

Sua tarefa é dividida em duas partes:
1.  **Verificação de Sintaxe (Compilação)**: Verifique se há erros de sintaxe no código. Se encontrar erros, liste-os de forma clara, como um compilador faria. Se não houver erros, diga "Compilado com sucesso."
2.  **Saída da Execução (Runtime)**: Se a compilação for bem-sucedida, simule a execução do programa e mostre a saída exata que seria gerada por quaisquer declarações 'DISPLAY'.

Formate sua resposta usando markdown. Use uma seção '### Erros de Compilação' para erros e uma seção '### Saída do Programa' para a saída. Se não houver erros, a seção de erros deve indicar sucesso.

Código COBOL para analisar:
\`\`\`cobol
${cobolCode}
\`\`\`
      `,
    }));
    return { text: response.text };
  } catch (error: any) {
    console.error("Error simulating COBOL execution:", error);
    const errorMessageLower = (error as any).message?.toLowerCase() || '';
    
    if (errorMessageLower.includes("429") || errorMessageLower.includes("quota") || errorMessageLower.includes("resource_exhausted")) {
        return { errorMessage: "O limite de uso da API foi excedido (Erro 429). Por favor, aguarde alguns instantes e tente novamente." };
    }
    
    if (errorMessageLower.includes("requested entity was not found.")) {
      if (typeof window.aistudio !== 'undefined') {
         window.aistudio.openSelectKey();
      }
      return { errorMessage: "Sua chave de API pode estar inválida. Por favor, selecione-a novamente e tente simular novamente." };
    }
    return { errorMessage: "Desculpe, houve um erro ao simular a execução do COBOL." };
  }
};

export const simulateCExecution = async (code: string, language: 'c' | 'cpp'): Promise<AIChatResponse> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Você é um ambiente de desenvolvimento C/C++ (simulando GCC/G++ em Linux).
      
      Linguagem: ${language === 'cpp' ? 'C++' : 'C'}
      Código:
      \`\`\`${language}
      ${code}
      \`\`\`

      Tarefas:
      1. **Compilação**: Verifique erros de sintaxe, tipos, etc. Aja como o compilador. Se houver erros, mostre-os no formato padrão do GCC. Se não houver, diga "Compilado com sucesso.".
      2. **Execução**: Se a compilação for bem sucedida, simule a execução do binário resultante e mostre a saída (stdout/stderr).

      Formate a resposta em Markdown:
      Use '### Status da Compilação' para a saída do compilador.
      Use '### Saída do Programa' para a saída da execução (se houver).
      `,
    }));
    return { text: response.text };
  } catch (error: any) {
    console.error("Error simulating C/C++ execution:", error);
    const errorMessageLower = (error as any).message?.toLowerCase() || '';

    if (errorMessageLower.includes("429") || errorMessageLower.includes("quota") || errorMessageLower.includes("resource_exhausted")) {
        return { errorMessage: "O limite de uso da API foi excedido (Erro 429). Por favor, aguarde alguns instantes e tente novamente." };
    }

    if (errorMessageLower.includes("requested entity was not found.")) {
      if (typeof window.aistudio !== 'undefined') {
         window.aistudio.openSelectKey();
      }
      return { errorMessage: "Sua chave de API pode estar inválida. Por favor, selecione-a novamente e tente simular novamente." };
    }
    return { errorMessage: "Desculpe, houve um erro ao simular a execução do código C/C++." };
  }
};

export const simulateJuliaExecution = async (juliaCode: string): Promise<AIChatResponse> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Você é um interpretador e ambiente de execução da linguagem Julia (simulando Julia.js). Analise o seguinte código Julia.

Sua tarefa é dividida em três partes:
1.  **Compilação JIT e Análise**: Verifique a sintaxe e a lógica do código. Se houver erros, liste-os.
2.  **Saída da Execução**: Execute mentalmente o código e mostre a saída exata que seria gerada no console (prints, resultados de expressões, etc.). Realize os cálculos matemáticos com precisão.
3.  **Geração de Gráficos**: Se o código criar gráficos (usando Plots.jl, plotlyjs(), PyPlot, etc.), gere EXCLUSIVAMENTE um bloco de código markdown com o rótulo \`\`\`json-plotly\`\`\` contendo o objeto JSON com \`data\` e \`layout\` compatíveis com a biblioteca Plotly.js para representar o gráfico visualmente. Não inclua este JSON na saída de texto normal (seção 'Saída da Execução'), apenas neste bloco específico.

Formate sua resposta usando markdown. Use uma seção '### Status da Compilação' para indicar sucesso ou erros, e uma seção '### Saída da Execução' para o resultado textual. Se houver gráfico, o bloco \`\`\`json-plotly\`\`\` deve vir ao final.

Código Julia para analisar:
\`\`\`julia
${juliaCode}
\`\`\`
      `,
    }));
    return { text: response.text };
  } catch (error: any) {
    console.error("Error simulating Julia execution:", error);
    const errorMessageLower = (error as any).message?.toLowerCase() || '';

    if (errorMessageLower.includes("429") || errorMessageLower.includes("quota") || errorMessageLower.includes("resource_exhausted")) {
        return { errorMessage: "O limite de uso da API foi excedido (Erro 429). Por favor, aguarde alguns instantes e tente novamente." };
    }

    if (errorMessageLower.includes("requested entity was not found.")) {
      if (typeof window.aistudio !== 'undefined') {
         window.aistudio.openSelectKey();
      }
      return { errorMessage: "Sua chave de API pode estar inválida. Por favor, selecione-a novamente e tente simular novamente." };
    }
    return { errorMessage: "Desculpe, houve um erro ao simular a execução do código Julia." };
  }
};

export const simulateTelnetCommand = async (host: string, history: string, newCommand: string): Promise<string> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Você é um servidor Telnet/SSH simulado. O usuário está conectado ao host: "${host}".
  
  HISTÓRICO DA SESSÃO:
  ${history}
  
  ÚLTIMO COMANDO DO USUÁRIO:
  ${newCommand}
  
  INSTRUÇÃO:
  Aja como o servidor remoto. Processe o último comando com base no histórico da sessão (diretórios, variáveis, estado).
  Retorne APENAS a saída de texto crua que o terminal exibiria. Não use markdown, não dê explicações fora do personagem.
  Se o comando for 'exit' ou 'logout', simule o encerramento da conexão.
  Se o comando não for reconhecido, simule a mensagem de erro padrão do sistema operacional que você está emulando (Linux, Cisco IOS, Windows, etc.).
        `,
      }));
      return response.text || "";
    } catch (error: any) {
      console.error("Error simulating Telnet:", error);
      if (error.message?.includes('429')) return "Erro: Quota da API excedida. Tente novamente em breve.";
      return "Erro de conexão: O host remoto não respondeu ou a simulação falhou.";
    }
  };

export const simulateRNTCommand = async (history: string, newCommand: string): Promise<string> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Você é o KERNEL PERSISTENTE do Sistema Operacional RNT (Referring Node Transmission).
  
  **ESTADO DO SISTEMA (Baseado no histórico recente):**
  ${history}
  
  **COMANDO DE ENTRADA:**
  ${newCommand}
  
  **DIRETRIZES CRÍTICAS DE PERSISTÊNCIA:**
  1. **Sistema de Arquivos Virtual**: Você DEVE rastrear mentalmente quais arquivos e pastas foram criados no histórico acima.
     - Se o histórico mostra \`mkdir projetos\`, a pasta \`projetos\` existe.
     - Se o histórico mostra \`echo "codigofonte" > main.py\`, o arquivo \`main.py\` existe e contém "codigofonte".
     - Se o usuário der \`cat main.py\`, você deve retornar o conteúdo exato.
  2. **Comandos de Criação**: Se o usuário usar \`touch\`, \`echo >\`, \`mkdir\`, confirme a ação silenciosamente ou mostre erro se aplicável, agindo exatamente como um Linux Shell (zsh).
  3. **Comandos de Leitura**: \`ls\` deve listar EXATAMENTE o que foi criado anteriormente. \`cat\` deve mostrar o conteúdo salvo.
  4. **RNT-Pkg (Gerenciador de Pacotes)**:
     - Comando: \`rnt-pkg install <pacote>\`
     - AÇÃO: Simule o processo de instalação com visual rico e detalhado.
     - SAÍDA OBRIGATÓRIA:
       Reading package lists... Done
       Building dependency tree... Done
       Resolving dependencies for <pacote>...
       Connecting to mirror node [Sao Paulo/BR]...
       
       Downloading <pacote>...
       [====================] 100%
       
       Unpacking assets...
       Setting up <pacote> (1.0.4)...
       Successfully installed <pacote>.
     - ESTADO: Considere o pacote instalado para comandos futuros.
  
  **SAÍDA:**
  Retorne APENAS o texto cru de saída do terminal. Sem markdown. Sem explicações fora do personagem.
  `,
      }));

      // Clean the output: remove any potential markdown code blocks provided by the AI
      let text = response.text || "";
      text = text.replace(/^```rnt\n/i, '').replace(/^```\n/i, '').replace(/```$/i, '');
      return text.trim();

    } catch (error: any) {
      console.error("Error simulating RNT:", error);
      if (error.message?.includes('429')) return "RNT Kernel Panic: Resource Exhausted (429). Rebooting nodes...";
      return "RNT Connection Error: Node unreachable.";
    }
};

export const simulateFrameworkExecution = async (code: string, framework: 'flask' | 'django' | 'php', route: string): Promise<{ output: string, logs: string }> => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      // We ask for JSON format to separate the HTML output from the logs easily.
      const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Você é um simulador de servidor Web rodando ${framework.toUpperCase()}.
  
  CÓDIGO DA APLICAÇÃO:
  ${code}
  
  REQUISIÇÃO:
  GET ${route}
  
  TAREFA:
  1. Analise o código e determine qual função/view/arquivo deve manipular a rota "${route}".
  2. Execute a lógica mentalmente (incluindo renderização de templates ou echo/print do PHP).
  3. Gere o Corpo da Resposta HTTP (HTML ou JSON) que o navegador receberia.
  4. Gere os Logs do Servidor (ex: "127.0.0.1 - - [Date] "GET ${route} HTTP/1.1" 200 -").
  
  Se a rota não existir, retorne um 404 padrão do ${framework}.
  Se houver erro no código, retorne um 500 com o stack trace no log.
  Para PHP, simule a saída padrão (stdout) como o corpo da resposta.
  
  FORMATO DE RESPOSTA (JSON):
  {
    "responseBody": "conteúdo html ou json aqui",
    "serverLogs": "linhas de log aqui"
  }
  Retorne APENAS o JSON.
        `,
        config: { responseMimeType: "application/json" }
      }));
      
      const result = JSON.parse(response.text || '{}');
      return {
          output: result.responseBody || "<h1>Erro: Resposta vazia do servidor simulado.</h1>",
          logs: result.serverLogs || `[Error] Failed to parse simulation logs.`
      };
    } catch (error: any) {
      console.error(`Error simulating ${framework}:`, error);
      if (error.message?.includes('429')) {
          return {
              output: "<h1>503 Service Unavailable</h1><p>API Quota Exceeded. Please try again later.</p>",
              logs: "CRITICAL: API Quota Limit Reached."
          };
      }
      return {
          output: "<h1>500 Internal Server Error (Simulation Failed)</h1>",
          logs: `CRITICAL: Simulation failed due to API error: ${error}`
      };
    }
};


export const sendMessageToGemini = async (message: string): Promise<AIChatResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY }); // Always create a new instance for direct model calls for latest API key

  if (message.startsWith('/imagem ')) {
    const imagePrompt = message.substring('/imagem '.length).trim();
    if (!imagePrompt) {
      return { errorMessage: "Por favor, forneça um prompt para a imagem. Ex: /imagem um gato no espaço" };
    }

    // API Key selection for Imagen model
    if (typeof window.aistudio !== 'undefined') {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
          await window.aistudio.openSelectKey();
          // After opening selection, assume user will select. Ask them to retry.
          return { errorMessage: "Por favor, selecione sua chave de API para gerar imagens e tente novamente." };
      }
    } else {
        console.warn("window.aistudio is not defined. Skipping API key check for image generation.");
    }
    
    try {
      const imageResponse: GenerateImagesResponse = await retryOperation(() => ai.models.generateImages({
        model: 'imagen-4.0-generate-001', // High-quality image generation model
        prompt: imagePrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1', // Default aspect ratio, can be parameterized later
        },
      }));

      const base64ImageBytes: string | undefined = imageResponse.generatedImages?.[0]?.image?.imageBytes;

      if (base64ImageBytes) {
        lastGeneratedImageUrl = `data:image/jpeg;base64,${base64ImageBytes}`; // Store the generated image
        return { 
          imageUrl: lastGeneratedImageUrl,
          text: `Aqui está a imagem que criei para você com o prompt: "${imagePrompt}"` 
        };
      } else {
        return { errorMessage: "Não foi possível gerar a imagem. Tente um prompt diferente." };
      }
    } catch (error: any) {
        console.error("Error generating image:", error);
        const errorMessageLower = (error.message || '').toLowerCase();

        if (errorMessageLower.includes("429") || errorMessageLower.includes("quota") || errorMessageLower.includes("resource_exhausted")) {
            return { errorMessage: "O limite de uso da API foi excedido (Erro 429). Por favor, aguarde alguns instantes e tente novamente." };
        }

        if (errorMessageLower.includes("requested entity was not found.")) {
             // If the key is invalid, prompt selection again
             if (typeof window.aistudio !== 'undefined') {
                await window.aistudio.openSelectKey();
             }
             return { errorMessage: "Sua chave de API para imagem pode estar inválida. Por favor, selecione-a novamente e tente." };
        } else if (errorMessageLower.includes("blocked") || errorMessageLower.includes("safety policies") || errorMessageLower.includes("harmful content")) {
            return { errorMessage: "Sua solicitação de imagem foi bloqueada devido a políticas de segurança. Por favor, tente um prompt diferente." };
        } else if (errorMessageLower.includes("imagen api is only accessible to billed users")) {
            return { errorMessage: `Esta funcionalidade de geração de imagens requer que o faturamento esteja ativado para sua chave de API. Por favor, verifique a documentação de faturamento: <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" class="underline hover:text-[var(--color-accent)]">ai.google.dev/gemini-api/docs/billing</a>` };
        }
        return { errorMessage: "Desculpe, houve um erro ao gerar a imagem. Por favor, tente novamente." };
    }
  } else if (lastGeneratedImageUrl) { // If a last image exists, and it's not a /imagem command, assume it's an edit request
    const imagePart = dataUriToBase64(lastGeneratedImageUrl);
    if (!imagePart) {
        return { errorMessage: "Erro ao processar a última imagem para edição. Por favor, gere uma nova imagem." };
    }

    // API Key selection for Gemini 2.5 Flash Image model
    if (typeof window.aistudio !== 'undefined') {
      const hasKey = await window.aistudio.hasSelectedApiKey();
      if (!hasKey) {
          await window.aistudio.openSelectKey();
          return { errorMessage: "Por favor, selecione sua chave de API para editar imagens e tente novamente." };
      }
    } else {
        console.warn("window.aistudio is not defined. Skipping API key check for image editing.");
    }

    try {
        const response: GenerateContentResponse = await retryOperation(() => ai.models.generateContent({
            model: 'gemini-2.5-flash-image', // General Image Generation and Editing Tasks
            contents: {
                parts: [
                    {
                        inlineData: {
                            data: imagePart.data,
                            mimeType: imagePart.mimeType,
                        },
                    },
                    {
                        text: message, // The user's text prompt for editing
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE], // Must be an array with a single `Modality.IMAGE` element.
            },
        }));

        const imagePartResult = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (imagePartResult?.inlineData) {
            const base64ImageBytes: string = imagePartResult.inlineData.data;
            const mimeType: string = imagePartResult.inlineData.mimeType;
            lastGeneratedImageUrl = `data:${mimeType};base64,${base64ImageBytes}`; // Update the last generated image
            return { 
              imageUrl: lastGeneratedImageUrl,
              text: "Aqui está a sua imagem editada!" 
            };
        } else {
            return { errorMessage: "Não foi possível editar a imagem. Tente um prompt diferente." };
        }
    } catch (error: any) {
        console.error("Error editing image:", error);
        const errorMessageLower = (error.message || '').toLowerCase();
        
        if (errorMessageLower.includes("429") || errorMessageLower.includes("quota") || errorMessageLower.includes("resource_exhausted")) {
            return { errorMessage: "O limite de uso da API foi excedido (Erro 429). Por favor, aguarde alguns instantes e tente novamente." };
        }

        if (errorMessageLower.includes("requested entity was not found.")) {
             if (typeof window.aistudio !== 'undefined') { await window.aistudio.openSelectKey(); }
             return { errorMessage: "Sua chave de API para imagem pode estar inválida. Por favor, selecione-a novamente e tente." };
        } else if (errorMessageLower.includes("blocked") || errorMessageLower.includes("safety policies") || errorMessageLower.includes("harmful content")) {
            return { errorMessage: "Sua solicitação de edição de imagem foi bloqueada devido a políticas de segurança. Por favor, tente um prompt diferente." };
        } else if (errorMessageLower.includes("imagen api is only accessible to billed users")) {
            return { errorMessage: `Esta funcionalidade de edição de imagens requer que o faturamento esteja ativado para sua chave de API. Por favor, verifique a documentação de faturamento: <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" class="underline hover:text-[var(--color-accent)]">ai.google.dev/gemini-api/docs/billing</a>` };
        }
        return { errorMessage: "Desculpe, houve um erro ao editar a imagem. Por favor, tente novamente." };
    }
  } else {
    // Handle regular text messages (chat bot)
    try {
      const currentChat = getOrCreateChat();
      const response: GenerateContentResponse = await retryOperation(() => currentChat.sendMessage({ message }));
      
      // Extract grounding metadata and filter for web sources
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const sources: GroundingSource[] = groundingChunks
        ?.map((chunk: GroundingChunk) => chunk.web)
        .filter((webSource): webSource is GroundingSource => !!webSource?.uri) ?? [];

      return { text: response.text, sources };
    } catch (error: any) {
      console.error("Error sending message to Gemini:", error);
      const errorMessageLower = (error.message || '').toLowerCase();
      
      // Handle Quota Exceeded (429) specifically
      if (errorMessageLower.includes("429") || errorMessageLower.includes("quota") || errorMessageLower.includes("resource_exhausted")) {
        return { errorMessage: "Você atingiu o limite de requisições da IA (Erro 429). Aguarde um momento e tente novamente." };
      }

      // For chat, if the key is invalid, we should also prompt re-selection.
      if (errorMessageLower.includes("requested entity was not found.")) {
        if (typeof window.aistudio !== 'undefined') {
           window.aistudio.openSelectKey();
        }
        // Reset chat to force re-creation with potentially new key on next message
        chat = null; 
        return { errorMessage: "Sua chave de API para chat pode estar inválida. Por favor, selecione-a novamente e tente." };
      }
      return { errorMessage: "Oops! Algo deu errado da minha parte. Por favor, tente perguntar novamente." };
    }
  }
};