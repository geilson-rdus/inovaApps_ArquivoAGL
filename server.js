// 1. Configuração inicial
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');
const crypto = require('crypto');
const sql = require('mssql');
const { GoogleGenerativeAI } = require('@google/generative-ai'); // VOLTAMOS PARA O GOOGLE

// --- CONFIGURAÇÃO DO BANCO DE DADOS (SQL SERVER - Sem alterações) ---
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true, 
        trustServerCertificate: true
    }
};

sql.connect(dbConfig).then(() => {
    console.log('Conectado ao SQL Server.');
}).catch(err => {
    console.error('Erro na conexão com o banco de dados: ', err);
});
// --------------------------------

// 2. Inicialização do Express e IA (MODIFICADO)
const app = express();
app.use(express.json());
app.use(cors());

// Inicialização do Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest"});
let knowledgeBase = '';

// Função de carregar a base de conhecimento (sem alterações)
async function loadKnowledgeBase() {
    console.log("Carregando base de conhecimento...");
    try {
        const dataPath = path.join(__dirname, 'dados');
        const files = await glob(`${dataPath}/**/*.txt`);
        let fullText = '';
        for (const file of files) {
            const content = await fs.readFile(file, 'utf-8');
            fullText += content + '\n\n';
        }
        knowledgeBase = fullText;
        console.log("Base de conhecimento carregada com sucesso!");
    } catch (error) {
        console.error("Erro ao carregar a base de conhecimento:", error);
        knowledgeBase = "Nenhuma base de conhecimento foi encontrada.";
    }
}

// 4. Endpoint do chat (MODIFICADO PARA GEMINI)
app.post('/chat', async (req, res) => {
    try {
        const userMessage = req.body.message;
        
        const prompt = `
            Você é o assistente virtual da "Arquivo AGL". Sua personalidade é amigável e profissional.
            Sua principal fonte de conhecimento é o CONTEXTO abaixo. PRIORIZE sempre as respostas usando o CONTEXTO.
            
            Se a resposta para a pergunta do usuário estiver no CONTEXTO, responda-a claramente.
            Se a resposta NÃO estiver no CONTEXTO, você NÃO deve inventar. Em vez disso, diga: "Entendido. Essa é uma questão mais específica e, para garantir a resposta correta, vou registrar sua dúvida para que um de nossos especialistas entre em contato."

            Após formular sua resposta, adicione uma tag de status no final:
            - Adicione [STATUS:FECHADO] se você respondeu a pergunta com base no contexto.
            - Adicione [STATUS:ABERTO] se você informou que vai passar para um especialista.
            --- CONTEXTO ---
            ${knowledgeBase}
            --- FIM DO CONTEXTO ---
            PERGUNTA DO USUÁRIO: "${userMessage}"
        `;

        const result = await model.generateContent(prompt);
        const rawResponse = result.response.text();

        let replyText = rawResponse;
        let status = 'aberto';

        if (rawResponse.includes('[STATUS:FECHADO]')) {
            status = 'fechado';
            replyText = rawResponse.replace('[STATUS:FECHADO]', '').trim();
        } else if (rawResponse.includes('[STATUS:ABERTO]')) {
            status = 'aberto';
            replyText = rawResponse.replace('[STATUS:ABERTO]', '').trim();
        }

        res.json({ reply: replyText, status: status });

    } catch (error) {
        console.error("Erro na API do Gemini:", error);
        res.status(500).json({ error: "Desculpe, não consegui processar sua solicitação com a IA." });
    }
});

// 5. Endpoint para SUMARIZAR E SALVAR A CONVERSA (MODIFICADO PARA GEMINI)
app.post('/summarize-and-save', async (req, res) => {
    const { conversation } = req.body;

    const conversationText = conversation
        .map(msg => `[${msg.role === 'user' ? 'Usuário' : 'IA'}]: ${msg.content}`)
        .join('\n');

    try {
        const summaryPrompt = `
            Analise a transcrição de uma conversa de chatbot e extraia as seguintes informações no formato JSON:
            1.  "titulo": Crie um título curto e descritivo (máximo 8 palavras) que resuma o assunto principal da conversa.
            2.  "resumo": Escreva um resumo de uma ou duas frases sobre o que o usuário perguntou e qual foi a conclusão.
            3.  "status": Determine o status final. Se a última mensagem da IA indicou que o problema foi resolvido, o status é "fechado". Se a IA disse que ia passar para um especialista, o status é "aberto".

            Responda APENAS com um objeto JSON válido, sem nenhum texto ou formatação adicional. Exemplo: {"titulo": "Dúvida sobre Suporte", "resumo": "Usuário perguntou sobre planos de suporte e a IA explicou as opções.", "status": "fechado"}

            --- TRANSCRIÇÃO DA CONVERSA ---
            ${conversationText}
            --- FIM DA TRANSCRIÇÃO ---
        `;

        const result = await model.generateContent(summaryPrompt);
        const rawJsonResponse = result.response.text();
        
        // Limpa a resposta para garantir que seja um JSON válido
        const cleanedJson = rawJsonResponse.replace(/```json/g, '').replace(/```/g, '').trim();
        const analysisResult = JSON.parse(cleanedJson);
        const { titulo, resumo, status } = analysisResult;
        
        const id = crypto.randomBytes(8).toString('hex').toUpperCase();

        await sql.connect(dbConfig);
        await new sql.Request()
            .input('id', sql.NVarChar, id)
            .input('titulo', sql.NVarChar, titulo)
            .input('descricao', sql.NVarChar, resumo)
            .input('status', sql.NVarChar, status)
            .query('INSERT INTO chamadas (id, titulo, descricao, status) VALUES (@id, @titulo, @descricao, @status)');

        res.status(201).json({ message: "Chamado criado com sucesso!", id: id, titulo: titulo });

    } catch (err) {
        console.error('Erro ao sumarizar ou salvar o chamado:', err);
        res.status(500).json({ error: 'Falha ao processar e salvar o chamado.' });
    }
});


// 6. Inicia o servidor
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    loadKnowledgeBase();
});