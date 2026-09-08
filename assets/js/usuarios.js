import { supabase } from './supabase.js';
import { verificarAutenticacao } from './auth.js';
import { carregarMenu } from './menu.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const authData = await verificarAutenticacao();
        if (!authData || !authData.session) return;

        const { data: perfil } = await supabase
            .from('perfis')
            .select('nivel_acesso')
            .eq('id', authData.session.user.id)
            .single();

        if (!perfil || (perfil.nivel_acesso !== 'ti' && perfil.nivel_acesso !== 'administrador')) {
            alert('Acesso negado. Apenas usuários autorizados podem acessar esta tela.');
            window.location.href = 'dashboard.html'; 
            return;
        }

        carregarMenu('usuarios');
        carregarUsuarios();

    } catch (error) {
        console.error("Erro crítico na inicialização:", error);
    }
});

async function carregarUsuarios() {
    const tbody = document.getElementById('tabela-usuarios');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="3" class="px-6 py-8 text-center text-slate-500"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Buscando no banco de dados...</td></tr>';

    const { data: usuarios, error } = await supabase
        .from('perfis')
        .select('*');

    if (error) {
        console.error("Erro ao buscar usuários:", error);
        tbody.innerHTML = '<tr><td colspan="3" class="px-6 py-8 text-center text-red-500">Erro ao carregar usuários. Verifique as permissões.</td></tr>';
        return;
    }

    if (!usuarios || usuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="px-6 py-8 text-center text-slate-500">Nenhum usuário encontrado.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    const { data: { user } } = await supabase.auth.getUser();

    usuarios.forEach(u => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-700/50 hover:bg-slate-700/30 transition';
        const isMe = user.id === u.id;
        
        let dataCadastro = 'N/A';
        if (u.created_at) {
            const dt = new Date(u.created_at);
            dataCadastro = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }

        // Fallback robusto: se a tabela perfis não tiver o e-mail, usa o Nome ou CPF
        const identificacao = u.nome || `CPF: ${u.cpf || 'Não informado'}`;

        tr.innerHTML = `
            <td class="px-6 py-4">
                <div class="font-medium text-white flex items-center gap-2 uppercase text-xs tracking-wide">
                    ${isMe ? '<span class="w-2 h-2 rounded-full bg-emerald-500" title="Você"></span>' : ''}
                    ${identificacao}
                </div>
                <div class="text-xs text-slate-400 mt-1">ID: ${u.id.substring(0,8)}...</div>
            </td>
            <td class="px-6 py-4">
                <div class="max-w-[200px] mx-auto">
                    <select onchange="alterarCargo('${u.id}', this.value)" ${isMe ? 'disabled' : ''} class="bg-slate-900 border border-slate-600 text-slate-300 text-sm font-semibold rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                        <option value="padrao" ${u.nivel_acesso === 'padrao' ? 'selected' : ''}>Usuário Comum</option>
                        <option value="ti" ${u.nivel_acesso === 'ti' ? 'selected' : ''}>Equipe TI</option>
                        <option value="administrador" ${u.nivel_acesso === 'administrador' ? 'selected' : ''}>Administrador</option>
                    </select>
                    ${isMe ? `<div class="text-[10px] text-emerald-500/70 text-center mt-1">Este é o seu perfil</div>` : ''}
                </div>
            </td>
            <td class="px-6 py-4 text-center text-slate-400 font-mono text-xs">
                ${dataCadastro}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.alterarCargo = async function(id, novoNivel) {
    let cargoNome = novoNivel === 'ti' ? 'Equipe TI' : novoNivel === 'administrador' ? 'Administrador' : 'Usuário Comum';

    if (!confirm(`Tem certeza que deseja alterar o acesso para ${cargoNome}?`)) {
        carregarUsuarios(); 
        return;
    }

    const { error } = await supabase
        .from('perfis')
        .update({ nivel_acesso: novoNivel })
        .eq('id', id);

    if (error) {
        alert('Erro ao alterar cargo. O Supabase bloqueou a edição (RLS).');
        console.error(error);
    } 
    carregarUsuarios(); 
};