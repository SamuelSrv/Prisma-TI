import { supabase } from './supabase.js';
import { verificarAutenticacao } from './auth.js';
import { carregarMenu } from './menu.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const authData = await verificarAutenticacao();
        if (!authData || !authData.session) return;

        // VALIDAÇÃO DE SEGURANÇA: Verifica se é TI ou Administrador na tabela 'perfis'
        const { data: perfil } = await supabase
            .from('perfis')
            .select('nivel_acesso')
            .eq('id', authData.session.user.id)
            .single();

        // Bloqueia quem não for TI ou Administrador
        if (!perfil || (perfil.nivel_acesso !== 'ti' && perfil.nivel_acesso !== 'administrador')) {
            alert('Acesso negado. Apenas usuários autorizados podem acessar o gerenciamento de acessos.');
            window.location.href = 'dashboard.html'; 
            return;
        }

        // Carrega o menu marcando a página ativa
        carregarMenu('usuarios');
        
        // Puxa a lista de usuários do banco
        carregarUsuarios();

    } catch (error) {
        console.error("Erro crítico na tela de usuários:", error);
    }
});

async function carregarUsuarios() {
    const tbody = document.getElementById('tabela-usuarios');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="3" class="px-6 py-8 text-center text-slate-500"><i class="fa-solid fa-spinner fa-spin mr-2"></i> Buscando no banco de dados...</td></tr>';

    // Busca os perfis cadastrados
    const { data: usuarios, error } = await supabase
        .from('perfis')
        .select('*');

    if (error) {
        console.error("Erro ao buscar usuários:", error);
        tbody.innerHTML = '<tr><td colspan="3" class="px-6 py-8 text-center text-red-500">Erro ao carregar usuários.</td></tr>';
        return;
    }

    if (!usuarios || usuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="px-6 py-8 text-center text-slate-500">Nenhum usuário encontrado na tabela de perfis.</td></tr>';
        return;
    }

    tbody.innerHTML = '';
    
    // Pega o ID de quem está logado para proteger contra auto-bloqueio
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

        // Dropdown com os 3 níveis separados
        tr.innerHTML = `
            <td class="px-6 py-4">
                <div class="font-medium text-white flex items-center gap-2">
                    ${isMe ? '<span class="w-2 h-2 rounded-full bg-emerald-500" title="Você"></span>' : ''}
                    ${u.email || u.nome || 'Usuário Sem Nome/Email'}
                </div>
                <div class="text-xs text-slate-400 mt-1">ID: ${u.id.substring(0,8)}...</div>
            </td>
            <td class="px-6 py-4">
                <div class="max-w-[200px] mx-auto">
                    <select onchange="alterarCargo('${u.id}', this.value)" ${isMe ? 'disabled' : ''} class="bg-slate-900 border border-slate-600 text-slate-300 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5 outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                        <option value="padrao" ${u.nivel_acesso === 'padrao' ? 'selected' : ''}>Usuário Comum</option>
                        <option value="ti" ${u.nivel_acesso === 'ti' ? 'selected' : ''}>Equipe TI</option>
                        <option value="administrador" ${u.nivel_acesso === 'administrador' ? 'selected' : ''}>Administrador</option>
                    </select>
                    ${isMe ? `<div class="text-[10px] text-emerald-500/70 text-center mt-1">Este é o seu perfil</div>` : ''}
                </div>
            </td>
            <td class="px-6 py-4 text-center text-slate-400">
                ${dataCadastro}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Expõe a função para o HTML poder chamar via onchange
window.alterarCargo = async function(id, novoNivel) {
    let cargoNome = 'Usuário Comum';
    if (novoNivel === 'ti') cargoNome = 'Equipe TI';
    if (novoNivel === 'administrador') cargoNome = 'Administrador';

    const confirmacao = confirm(`Tem certeza que deseja alterar o nível de acesso deste usuário para ${cargoNome}?`);
    
    if (!confirmacao) {
        carregarUsuarios(); // Reverte visualmente caso cancele
        return;
    }

    const { error } = await supabase
        .from('perfis')
        .update({ nivel_acesso: novoNivel })
        .eq('id', id);

    if (error) {
        alert('Erro ao alterar cargo. Verifique suas permissões no Supabase.');
        console.error(error);
        carregarUsuarios();
    } else {
        carregarUsuarios(); // Recarrega a tabela atualizada
    }
};