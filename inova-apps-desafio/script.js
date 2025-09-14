// --- Bloco de Variáveis Globais ---
let currentUser = null;
let isEmployee = false;
let tickets = [];
let users = [];
let nextTicketId = 1;
let currentOpenTicketId = null;
let currentConversation = [];

// Base de conhecimento simples, baseada em palavras-chave. Cumpre o requisito do desafio.
const knowledgeBase = {
    "o que é a unitá": "A Unitá é uma solução de gestão que centraliza as solicitações de todas as áreas da sua empresa, como RH, Financeiro, Marketing, Jurídico, Manutenção, Suprimentos e TI.",
    "serviços": "Oferecemos uma plataforma centralizada para agilizar processos e unir pessoas em toda a empresa, indo muito além da gestão de chamados de TI.",
    "funcionalidades": "Nossa plataforma oferece abertura de chamados, base de conhecimento, portal de serviços, gestão de tarefas, controle de SLA, pesquisa de satisfação e relatórios completos.",
    "módulos": "A Unitá possui módulos como Service Desk, para chamados de TI; Central de Serviços Compartilhados (CSC), para outras áreas; e Gestão de Ativos (ITAM).",
    "preço": "Para informações sobre preços e planos, o ideal é solicitar um orçamento com nossa equipe comercial. Posso abrir um chamado para você.",
    "demonstração": "Claro! Posso abrir um chamado para que nossa equipe agende uma demonstração completa da plataforma para você.",
    "problema": "Entendo que está com um problema. Por favor, me dê mais detalhes para que eu possa criar um chamado para a equipe técnica.",
    "erro": "Lamento que esteja enfrentando um erro. Pode descrever o que aconteceu? Com essa informação, posso criar um chamado detalhado.",
    "oi": "Olá! Eu sou o assistente virtual da Unitá. Como posso te ajudar hoje?",
    "olá": "Olá! Eu sou o assistente virtual da Unitá. Como posso te ajudar hoje?",
};

// --- Bloco de Inicialização ---
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    loadStoredData();
    initializeSampleData();
});

function initializeApp() {
    showHome();
    clearChatMessages();
}

function setupEventListeners() {
    document.getElementById('chatButton').addEventListener('click', () => document.getElementById('chatPopup').classList.toggle('active'));
    document.getElementById('chatClose').addEventListener('click', () => document.getElementById('chatPopup').classList.remove('active'));
    document.getElementById('sendButton').addEventListener('click', sendMessage);
    document.getElementById('chatInput').addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterTickets(this.dataset.filter);
        });
    });
    document.getElementById('sendReplyBtn').addEventListener('click', handleReply);
}

// --- Gerenciamento de Dados (sessionStorage) ---
function loadStoredData() {
    users = JSON.parse(sessionStorage.getItem('unitaUsers') || '[]');
    tickets = JSON.parse(sessionStorage.getItem('unitaTickets') || '[]');
    nextTicketId = JSON.parse(sessionStorage.getItem('unitaNextTicketId') || '1');
}
function saveData() {
    sessionStorage.setItem('unitaUsers', JSON.stringify(users));
    sessionStorage.setItem('unitaTickets', JSON.stringify(tickets));
    sessionStorage.setItem('unitaNextTicketId', JSON.stringify(nextTicketId));
}
function initializeSampleData() {
    if (users.length === 0) { users.push({username: 'cliente', email: 'cliente@teste.com', password: '123', type: 'customer'}); saveData(); }
    if (tickets.length === 0) { tickets.push({ id: nextTicketId++, title: "Exemplo: Dúvida sobre Faturamento", status: "answered", answered: true, userId: "cliente", createdAt: new Date().toLocaleDateString(), conversation: [{ sender: 'user', message: 'Como funciona o faturamento dos planos?' },{ sender: 'employee', message: 'Olá! O faturamento é realizado mensalmente.' }] }); saveData(); }
}

// --- Funções de Navegação e UI ---
function showHome() {
    document.getElementById('homeSection').style.display = 'block';
    document.getElementById('dashboardSection').style.display = 'none';
    updateNavigation();
}
function showDashboard() {
    document.getElementById('homeSection').style.display = 'none';
    document.getElementById('dashboardSection').style.display = 'block';
    renderTickets();
}
function updateNavigation() {
    const navMenu = document.getElementById('navMenu');
    const chatWidget = document.getElementById('chatWidget');
    if (currentUser) {
        if (isEmployee) {
            chatWidget.classList.add('hidden');
            navMenu.innerHTML = `<li class="nav-item"><a onclick="showDashboard()">Ver Todos os Chamados</a></li><li class="nav-item"><a onclick="logout()">Sair</a></li>`;
            document.getElementById('dashboardTitle').textContent = 'Painel do Funcionário';
            document.getElementById('ticketsTitle').textContent = 'Todos os Chamados';
        } else {
            chatWidget.classList.remove('hidden');
            navMenu.innerHTML = `<li class="nav-item"><a onclick="showDashboard()">Meus Chamados</a></li><li class="nav-item"><a onclick="logout()">Sair</a></li>`;
            document.getElementById('dashboardTitle').textContent = 'Painel de Controle';
            document.getElementById('ticketsTitle').textContent = 'Meus Chamados';
        }
    } else {
        chatWidget.classList.add('hidden');
        navMenu.innerHTML = `<li class="nav-item"><a onclick="showHome()">Home</a></li><li class="nav-item"><a href="#about">Sobre</a></li><li class="nav-item"><a onclick="showLogin()">Login</a></li><li class="nav-item"><a onclick="showRegister()">Criar Conta</a></li>`;
    }
}
function showLogin() { document.getElementById('loginModal').classList.add('active'); }
function showRegister() { document.getElementById('registerModal').classList.add('active'); }
function closeModal(modalId) { document.getElementById(modalId).classList.remove('active'); if (modalId === 'ticketDetailModal') currentOpenTicketId = null; }

// --- Autenticação ---
function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    let foundUser = null;
    if (username === 'funcionario' && password === 'teste123') {
        foundUser = { username: 'funcionario', type: 'employee' };
        isEmployee = true;
    } else {
        foundUser = users.find(u => u.username === username && u.password === password);
        isEmployee = false;
    }
    if (foundUser) {
        currentUser = foundUser;
        closeModal('loginModal');
        showDashboard();
        updateNavigation();
        clearChatMessages();
    } else { alert('Usuário ou senha inválidos'); }
}
function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    if (users.find(u => u.username === username || u.email === email)) { alert('Usuário ou email já existe'); return; }
    users.push({ username, email, password, type: 'customer' });
    saveData();
    closeModal('registerModal');
    alert('Conta criada com sucesso! Faça login para continuar.');
}
function logout() {
    currentUser = null;
    isEmployee = false;
    showHome();
}

// --- Lógica do Chat e IA (Versão Simples e Funcional) ---
function clearChatMessages() {
    document.getElementById('chatMessages').innerHTML = `<div class="message bot-message">Olá! Eu sou o assistente virtual da Unitá. Como posso te ajudar hoje?</div>`;
    currentConversation = [];
}
function addMessageToChat(message, sender) {
    const chatMessages = document.getElementById('chatMessages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${sender}-message`;
    msgDiv.textContent = message;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
function sendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    if (!message) return;
    addMessageToChat(message, 'user');
    currentConversation.push({ sender: 'user', message });
    chatInput.value = '';
    setTimeout(() => processAIMessage(message), 1000);
}
function processAIMessage(userMessage) {
    const normalized = userMessage.toLowerCase();
    let response = null;
    for (const key in knowledgeBase) {
        if (normalized.includes(key)) {
            response = knowledgeBase[key];
            break;
        }
    }
    if (response) {
        addMessageToChat(response, 'bot');
        currentConversation.push({ sender: 'bot', message: response });
    } else {
        createTicketFromConversation();
    }
}
function createTicketFromConversation() {
    const firstUserMessage = currentConversation.find(m => m.sender === 'user')?.message || "Chamado sem mensagem inicial";
    const newTicket = { id: nextTicketId++, title: `Chamado via IA: "${firstUserMessage.substring(0, 30)}..."`, status: 'open', answered: false, userId: currentUser.username, createdAt: new Date().toLocaleDateString(), conversation: [...currentConversation] };
    tickets.push(newTicket);
    saveData();
    const response = `Não encontrei uma resposta. Mas não se preocupe, criei o chamado #${newTicket.id} e nossa equipe irá te responder em breve.`;
    addMessageToChat(response, 'bot');
    if (document.getElementById('dashboardSection').style.display === 'block') renderTickets();
}

// --- Lógica de Chamados (Tickets) ---
function renderTickets() {
    const ticketsGrid = document.getElementById('ticketsGrid');
    const displayTickets = isEmployee ? tickets : tickets.filter(t => t.userId === currentUser.username);
    if (displayTickets.length === 0) {
        ticketsGrid.innerHTML = '<p>Nenhum chamado encontrado.</p>';
        return;
    }
    ticketsGrid.innerHTML = displayTickets.map(ticket => {
        const description = ticket.conversation?.[0]?.message || 'Descrição não disponível';
        return `<div class="ticket-card" data-status="${ticket.status}" data-answered="${ticket.answered}" data-ticket-id="${ticket.id}"><div class="ticket-header"><span class="ticket-id">#${ticket.id}</span><span class="ticket-status status-${ticket.status}">${getStatusText(ticket.status)}</span></div><h3 class="ticket-title">${ticket.title}</h3><p class="ticket-description">${description.substring(0, 100)}...</p><div class="ticket-actions"><button class="action-btn details-btn" onclick="openTicketModal(${ticket.id})">Ver Detalhes</button>${isEmployee && ticket.status !== 'closed' ? `<button class="action-btn close-btn" onclick="closeTicket(${ticket.id})">Fechar Chamado</button>` : ''}</div><div class="ticket-meta"><small>Criado em: ${ticket.createdAt}</small>${isEmployee ? `<small>Usuário: ${ticket.userId}</small>` : ''}<small>Status Resposta: ${ticket.answered ? 'Respondido' : 'Pendente'}</small></div></div>`;
    }).join('');
}
function openTicketModal(ticketId) {
    currentOpenTicketId = ticketId;
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;
    document.getElementById('ticketDetailTitle').textContent = `Detalhes do Chamado #${ticket.id}`;
    const conversationBox = document.getElementById('ticketConversation');
    conversationBox.innerHTML = ticket.conversation.map(msg => {
        const senderName = msg.sender.charAt(0).toUpperCase() + msg.sender.slice(1);
        return `<div class="conversation-message ${msg.sender}-message"><strong>${senderName.replace('Bot', 'IA')}:</strong><p>${msg.message.replace(/\n/g, '<br>')}</p></div>`;
    }).join('');
    document.getElementById('ticketReplyArea').style.display = isEmployee && ticket.status !== 'closed' ? 'block' : 'none';
    document.getElementById('ticketDetailModal').classList.add('active');
    conversationBox.scrollTop = conversationBox.scrollHeight;
}
function handleReply() {
    const replyInput = document.getElementById('ticketReplyInput');
    const message = replyInput.value.trim();
    if (!message || currentOpenTicketId === null) return;
    const ticket = tickets.find(t => t.id === currentOpenTicketId);
    if (ticket) {
        ticket.conversation.push({ sender: 'employee', message });
        ticket.answered = true;
        ticket.status = 'answered';
        saveData();
        replyInput.value = '';
        openTicketModal(currentOpenTicketId); 
        renderTickets();
    }
}
function getStatusText(status) {
    return { 'open': 'Aberto', 'closed': 'Fechado', 'answered': 'Respondido' }[status] || status;
}
function filterTickets(filter) {
    document.querySelectorAll('.ticket-card').forEach(card => {
        const status = card.dataset.status;
        const answered = card.dataset.answered === 'true';
        let show = false;
        switch (filter) {
            case 'all': show = true; break;
            case 'open': show = status === 'open'; break;
            case 'closed': show = status === 'closed'; break;
            case 'answered': show = answered; break;
            case 'unanswered': show = !answered && status !== 'closed'; break;
        }
        card.style.display = show ? 'block' : 'none';
    });
}
function closeTicket(ticketId) {
    const ticket = tickets.find(t => t.id === ticketId);
    if (ticket) {
        ticket.status = 'closed';
        saveData();
        renderTickets();
        if(currentOpenTicketId === ticketId) closeModal('ticketDetailModal');
    }
}