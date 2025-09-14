document.addEventListener('DOMContentLoaded', () => {
    const token = getToken();
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const welcomeMessage = document.getElementById('welcome-message');
    const ticketsContainer = document.getElementById('tickets-container');
    const actionsContainer = document.getElementById('actions-container');

    // --- LÓGICA DE EVENTO PARA O BOTÃO DE RESPOSTA ---
    // Usamos delegação de evento para capturar cliques nos botões de resposta
    ticketsContainer.addEventListener('click', async (e) => {
        if (e.target && e.target.classList.contains('respond-btn')) {
            const button = e.target;
            const ticketId = button.dataset.ticketId;
            const form = button.closest('.response-form');
            const textarea = form.querySelector('textarea');
            const responseText = textarea.value.trim();

            if (!responseText) {
                alert('Por favor, escreva uma resposta.');
                return;
            }

            button.disabled = true;
            button.textContent = 'Enviando...';

            try {
                const response = await fetch(`${API_URL}/chamadas/${ticketId}/responder`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ responseText })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Falha ao enviar resposta.');
                }
                
                // Atualiza a interface dinamicamente
                const ticketCard = form.closest('.ticket-card');
                ticketCard.classList.remove('status-aberto');
                ticketCard.classList.add('status-fechado');
                ticketCard.querySelector('span').textContent = 'Status: fechado';
                // Adiciona a resposta à descrição visível
                const descP = ticketCard.querySelector('p');
                descP.innerHTML += `<br><br><strong>--- RESPOSTA DO SUPORTE ---</strong><br>${responseText}`;
                form.remove(); // Remove o formulário de resposta

            } catch (error) {
                alert(`Erro: ${error.message}`);
                button.disabled = false;
                button.textContent = 'Responder e Fechar';
            }
        }
    });

    // --- FUNÇÕES DE CARREGAMENTO DO DASHBOARD ---
    async function loadDashboard() {
        try {
            const profileResponse = await fetch(`${API_URL}/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!profileResponse.ok) throw new Error('Sessão inválida. Por favor, faça o login novamente.');
            
            const user = await profileResponse.json();
            
            welcomeMessage.textContent = `Bem-vindo(a), ${user.email}!`;
            actionsContainer.innerHTML = `<a href="index.html" class="cta-button">Fazer Nova Chamada (IA)</a>`;
            
            await loadMyTickets(token);

            if (user.role === 'funcionario') {
                welcomeMessage.textContent += ' (Funcionário)';
                await loadOpenTickets(token);
            }

        } catch (error) {
            console.error('Erro ao carregar dashboard:', error);
            alert(error.message);
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        }
    }
    
    async function loadMyTickets(token) {
        const response = await fetch(`${API_URL}/chamadas/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const tickets = await response.json();
        
        let ticketsHtml = '<h2>Meus Chamados</h2>';
        if (tickets.length === 0) {
            ticketsHtml += '<p>Você ainda não fez nenhum chamado.</p>';
        } else {
            tickets.forEach(ticket => {
                ticketsHtml += `
                    <div class="ticket-card status-${ticket.status}">
                        <h3>${ticket.titulo} (ID: ${ticket.id})</h3>
                        <p>${ticket.descricao.replace(/\n/g, '<br>')}</p>
                        <span>Status: ${ticket.status}</span>
                    </div>
                `;
            });
        }
        ticketsContainer.innerHTML += ticketsHtml;
    }

    // ATUALIZADO: Agora renderiza o formulário de resposta para cada chamado aberto
    async function loadOpenTickets(token) {
         const response = await fetch(`${API_URL}/chamadas/abertas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const tickets = await response.json();
        
        let ticketsHtml = '<hr><h2>Chamados Abertos (Todos os Usuários)</h2>';
        if (tickets.length === 0) {
            ticketsHtml += '<p>Não há chamados abertos no momento.</p>';
        } else {
            tickets.forEach(ticket => {
                ticketsHtml += `
                    <div class="ticket-card status-aberto">
                        <h3>${ticket.titulo} (ID: ${ticket.id})</h3>
                        <p>${ticket.descricao.replace(/\n/g, '<br>')}</p>
                        <span>Status: ${ticket.status}</span>
                        <div class="response-form">
                            <textarea placeholder="Escreva sua resposta aqui..."></textarea>
                            <button class="respond-btn" data-ticket-id="${ticket.id}">Responder e Fechar</button>
                        </div>
                    </div>
                `;
            });
        }
        ticketsContainer.innerHTML += ticketsHtml;
    }

    loadDashboard();
});

// A função getToken() do auth.js
function getToken() {
    return localStorage.getItem('token');
}
const API_URL = 'http://localhost:3000';