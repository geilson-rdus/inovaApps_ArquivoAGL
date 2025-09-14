const API_URL = 'http://localhost:3000';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const logoutButton = document.getElementById('logout-button');
    const errorMessageP = document.getElementById('error-message');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const button = e.target.querySelector('button');
            const originalButtonText = button.textContent;
            
            // Lógica de "carregando"
            button.disabled = true;
            button.textContent = 'Carregando...';
            errorMessageP.textContent = '';

            try {
                const email = e.target.email.value;
                const password = e.target.password.value;

                const response = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Falha no login');
                }
                localStorage.setItem('token', data.token);
                window.location.href = 'dashboard.html';
            } catch (error) {
                errorMessageP.textContent = error.message;
            } finally {
                // Garante que o botão seja reativado, mesmo se der erro
                button.disabled = false;
                button.textContent = originalButtonText;
            }
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const button = e.target.querySelector('button');
            const originalButtonText = button.textContent;

            // Lógica de "carregando"
            button.disabled = true;
            button.textContent = 'Enviando...';
            errorMessageP.textContent = '';

            try {
                const email = e.target.email.value;
                const password = e.target.password.value;

                const response = await fetch(`${API_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Falha no cadastro');
                }
                alert('Cadastro realizado com sucesso! Você já pode fazer o login.');
                window.location.href = 'login.html';
            } catch (error) {
                errorMessageP.textContent = error.message;
            } finally {
                button.disabled = false;
                button.textContent = originalButtonText;
            }
        });
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
        });
    }
});

function getToken() {
    return localStorage.getItem('token');
}