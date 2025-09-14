const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const pdf = require('pdf-parse');

const app = express();
app.use(cors());
app.use(express.json());

let knowledgeBase = '';

// Function to load and parse PDFs
async function loadKnowledgeBase() {
    try {
        const pdf1Path = './knowledge_base/Memórias do subsolo (Dostoiévski Fiódor) (z-lib.org) (1).pdf';
        const pdf2Path = './knowledge_base/Origem das Ideias Ludwig von Mises (1).pdf';

        const dataBuffer1 = await fs.readFile(pdf1Path);
        const data1 = await pdf(dataBuffer1);
        knowledgeBase += data1.text;

        const dataBuffer2 = await fs.readFile(pdf2Path);
        const data2 = await pdf(dataBuffer2);
        knowledgeBase += data2.text;

        console.log('Knowledge base loaded successfully!');
    } catch (error) {
        console.error('Error loading knowledge base:', error);
    }
}

// API endpoint for the AI
app.post('/ask-ai', (req, res) => {
    const userMessage = req.body.message.toLowerCase();

    // Simple search logic
    const sentences = knowledgeBase.split('.');
    const relevantSentences = sentences.filter(sentence => sentence.toLowerCase().includes(userMessage));

    if (relevantSentences.length > 0) {
        res.json({ answer: relevantSentences[0] });
    } else {
        res.json({ answer: "Não encontrei uma resposta direta para sua pergunta. Gostaria de abrir um chamado?" });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    loadKnowledgeBase();
});