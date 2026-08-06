import { supabase } from './supabase.js';

// Injeta o Favicon dinamicamente
const favicon = document.createElement('link');
favicon.rel = 'icon';
favicon.type = 'image/svg+xml';
favicon.href = 'assets/img/logo.svg';
document.head.appendChild(favicon);

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-login');
    const btnSubmit = document.getElementById('btn-submit');
    const linkToggle = document.getElementById('link-toggle');
    const toggleTextPre = document.getElementById('toggle-text-pre');
    const errorMsg = document.getElementById('login-error');
    
    // Elementos novos do cadastro
    const signupFields = document.getElementById('signup-fields');
    const inputNome = document.getElementById('signup-nome');
    const inputCpf = document.getElementById('signup-cpf');

    let modoLogin = true;

    // Lógica de alternar entre Login e Cadastro
    linkToggle.addEventListener('click', (e) => {
        e.preventDefault();
        modoLogin = !modoLogin;
        errorMsg.style.display = 'none';

        if (modoLogin) {
            // MODO LOGIN
            btnSubmit.textContent = 'Entrar no Sistema';
            toggleTextPre.textContent = 'Não possui conta? ';
            linkToggle.textContent = 'Cadastre-se aqui';
            
            signupFields.style.display = 'none'; // Esconde Nome e CPF
            inputNome.required = false;
            inputCpf.required = false;
        } else {
            // MODO CADASTRO
            btnSubmit.textContent = 'Criar Minha Conta';
            toggleTextPre.textContent = 'Já possui uma conta? ';
            linkToggle.textContent = 'Faça login';
            
            signupFields.style.display = 'flex'; // Mostra Nome e CPF
            inputNome.required = true;
            inputCpf.required = true;
        }
    });

    // Lógica de envio do formulário
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const nome = inputNome.value.trim();
        const cpf = inputCpf.value.trim();

        errorMsg.style.display = 'none';
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Processando...';

        try {
            if (modoLogin) {
                // Requisição de Login
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: password,
                });
                if (error) throw error;
                if (data.session) window.location.replace('dashboard.html');
            } else {
                // Requisição de Cadastro (Enviando Nome e CPF como Metadados)
                const { data, error } = await supabase.auth.signUp({
                    email: email,
                    password: password,
                    options: {
                        data: {
                            nome: nome,
                            cpf: cpf
                        }
                    }
                });
                if (error) throw error;
                
                alert('Conta criada com sucesso! Você já pode fazer login.');
                
                // Limpa os campos e volta para a tela de login
                form.reset();
                linkToggle.click();
            }
        } catch (error) {
            console.error('Erro:', error.message);
            errorMsg.style.display = 'block';
            if (error.message.includes('Invalid login') || error.message.includes('Invalid credentials')) {
                errorMsg.textContent = 'E-mail ou senha incorretos.';
            } else if (error.message.includes('already registered')) {
                errorMsg.textContent = 'Este e-mail já possui uma conta cadastrada.';
            } else {
                errorMsg.textContent = 'Ocorreu um erro: ' + error.message;
            }
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = modoLogin ? 'Entrar no Sistema' : 'Criar Minha Conta';
        }
    });
});