document.addEventListener('DOMContentLoaded', () => {
    
    // --- CONFIGURAÇÃO E VARIÁVEIS GLOBAIS ---
    const usuarios = [
        { username: 'yoshi', password: '1985', name: 'Anderson Yoshi' },
        { username: 'maria', password: '456', name: 'Maria Oliveira' },
        { username: 'admin', password: '1234', name: 'Administrador Geral' }
    ];
    let usuarioLogado = null;
    let clientes = JSON.parse(localStorage.getItem('clientes')) || [];
    let proximoCodigo = parseInt(localStorage.getItem('proximoCodigo')) || 1;
    const placeholderImage = "https://via.placeholder.com/150";
    const telaLogin = document.getElementById('tela-login');
    const appContainer = document.getElementById('app-container');

    // --- FUNÇÕES DE NAVEGAÇÃO E LOGIN ---
    const mostrarPagina = (pageId) => {
        document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
        document.getElementById(pageId)?.classList.add('active');
        if (pageId === 'pagina-cadastro') {
            document.getElementById('form-cadastro').reset();
            document.getElementById('foto-preview-cadastro').src = placeholderImage;
            document.getElementById('codigo-cadastro').value = proximoCodigo.toString().padStart(3, '0');
            document.getElementById('data-cadastro-cadastro').value = new Date().toLocaleDateString('pt-BR');
        }
        if (pageId === 'pagina-pesquisa') {
            renderizarResultados(clientes);
            limparFormularioEdicao();
        }
    };

    function login(e) {
        e.preventDefault();
        const userInput = document.getElementById('username').value;
        const passInput = document.getElementById('password').value;
        const usuarioEncontrado = usuarios.find(user => user.username.toLowerCase() === userInput.toLowerCase() && user.password === passInput);
        if (usuarioEncontrado) {
            usuarioLogado = usuarioEncontrado;
            telaLogin.style.display = 'none';
            appContainer.style.display = 'block';
            mostrarPagina('menu-inicial');
        } else {
            document.getElementById('login-error').textContent = 'Usuário ou senha inválidos.';
        }
    }

    function logout() {
        if (confirm('Você tem certeza que deseja sair?')) {
            usuarioLogado = null;
            appContainer.style.display = 'none';
            telaLogin.style.display = 'flex';
            document.getElementById('password').value = '';
            document.getElementById('login-error').textContent = '';
        }
    }

    // --- FUNÇÕES DE DADOS (SALVAR, LOG, EXPORTAR, BACKUP) ---
    const salvarDados = () => {
        localStorage.setItem('clientes', JSON.stringify(clientes));
        localStorage.setItem('proximoCodigo', proximoCodigo);
    };

    function registrarLog(cliente, acao) {
        if (!cliente.historico) cliente.historico = [];
        cliente.historico.push({ autor: usuarioLogado.name, data: new Date().toISOString(), acao });
    }

    function exibirHistorico(cliente) {
        const container = document.getElementById('audit-trail-content');
        if (!cliente || !cliente.historico || cliente.historico.length === 0) {
            container.innerHTML = '<p>Nenhuma alteração registrada.</p>'; return;
        }
        container.innerHTML = cliente.historico.slice().reverse().map(log => {
            const dataFormatada = new Date(log.data).toLocaleString('pt-BR');
            return `<p><strong>${log.autor}</strong> em ${dataFormatada}:<br>${log.acao}</p>`;
        }).join('');
    }

    function exportarParaExcel() {
        if (!confirm('Deseja exportar um resumo para Excel?')) return;
        if (clientes.length === 0) { alert('Não há clientes para exportar.'); return; }
        const dadosParaExportar = clientes.map(c => ({
            'Código': c.codigo, 'Nome': c.nome, 'Telefone': c.celular || c.telefone || '', 'E-mail': c.email || ''
        }));
        const worksheet = XLSX.utils.json_to_sheet(dadosParaExportar);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Associados");
        XLSX.writeFile(workbook, "Resumo_Associados.xlsx");
    }

    function fazerBackup() {
        if (clientes.length === 0) { alert('Não há dados para fazer backup.'); return; }
        const dataJson = JSON.stringify(clientes, null, 2);
        const blob = new Blob([dataJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dataHoje = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `backup_associados_${dataHoje}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('Backup completo baixado com sucesso!');
    }

    function restaurarBackup() {
        const fileInput = document.getElementById('input-restore-file');
        if (fileInput.files.length === 0) { alert('Por favor, selecione um arquivo de backup para restaurar.'); return; }
        const file = fileInput.files[0];
        const confirmacao = prompt("ATENÇÃO! Esta ação substituirá TODOS os dados atuais. Para confirmar, digite 'CONFIRMAR' e clique em OK.");
        if (confirmacao !== 'CONFIRMAR') { alert('Restauração cancelada.'); return; }
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const dadosRestaurados = JSON.parse(event.target.result);
                if (!Array.isArray(dadosRestaurados) || (dadosRestaurados.length > 0 && typeof dadosRestaurados[0].nome === 'undefined')) {
                    throw new Error('O formato do arquivo de backup é inválido.');
                }
                clientes = dadosRestaurados;
                proximoCodigo = clientes.length > 0 ? Math.max(...clientes.map(c => parseInt(c.codigo) || 0)) + 1 : 1;
                salvarDados();
                alert('Backup restaurado com sucesso! O sistema será recarregado.');
                window.location.reload();
            } catch (error) { alert(`Erro ao restaurar o backup: ${error.message}`); }
        };
        reader.onerror = () => alert('Ocorreu um erro ao ler o arquivo.');
        reader.readAsText(file);
    }

    // --- FUNÇÕES DE AÇÕES (CADASTRO, EDIÇÃO, DELEÇÃO, IMPRESSÃO) ---
    function handleCadastro(e) {
        e.preventDefault();
        const novoCliente = {
            id: Date.now(),
            codigo: proximoCodigo.toString().padStart(3, '0'),
            foto: document.getElementById('foto-preview-cadastro').src,
            nome: document.getElementById('nome-cadastro').value, cpf: document.getElementById('cpf-cadastro').value, rg: document.getElementById('rg-cadastro').value, estadoCivil: document.getElementById('estado-civil-cadastro').value, dataNascimento: document.getElementById('data-nascimento-cadastro').value, localNascimento: document.getElementById('local-nascimento-cadastro').value, nomeConjuge: document.getElementById('nome-conjuge-cadastro').value, endereco: document.getElementById('endereco-cadastro').value, numero: document.getElementById('numero-cadastro').value, bairro: document.getElementById('bairro-cadastro').value, cep: document.getElementById('cep-cadastro').value, aposentadoDesde: document.getElementById('aposentado-desde-cadastro').value, uf: document.getElementById('uf-cadastro').value, cidade: document.getElementById('cidade-cadastro').value, telefone: document.getElementById('telefone-cadastro').value, celular: document.getElementById('celular-cadastro').value, email: document.getElementById('email-cadastro').value, dataCadastro: document.getElementById('data-cadastro-cadastro').value, obs: document.getElementById('obs-cadastro').value,
            historico: []
        };
        registrarLog(novoCliente, 'Associado cadastrado.');
        clientes.push(novoCliente);
        proximoCodigo++;
        salvarDados();
        alert('Associado cadastrado com sucesso!');
        mostrarPagina('menu-inicial');
    }

    function handleEdicao(e) {
        e.preventDefault();
        const id = parseInt(document.getElementById('id-edicao').value);
        if (!id) return;
        const index = clientes.findIndex(c => c.id === id);
        if (index > -1) {
            const cliente = clientes[index];
            cliente.foto = document.getElementById('foto-preview-edicao').src;
            cliente.nome = document.getElementById('nome-edicao').value;
            cliente.cpf = document.getElementById('cpf-edicao').value;
            cliente.rg = document.getElementById('rg-edicao').value;
            cliente.estadoCivil = document.getElementById('estado-civil-edicao').value;
            cliente.dataNascimento = document.getElementById('data-nascimento-edicao').value;
            cliente.localNascimento = document.getElementById('local-nascimento-edicao').value;
            cliente.nomeConjuge = document.getElementById('nome-conjuge-edicao').value;
            cliente.endereco = document.getElementById('endereco-edicao').value;
            cliente.numero = document.getElementById('numero-edicao').value;
            cliente.bairro = document.getElementById('bairro-edicao').value;
            cliente.cep = document.getElementById('cep-edicao').value;
            cliente.aposentadoDesde = document.getElementById('aposentado-desde-edicao').value;
            cliente.uf = document.getElementById('uf-edicao').value;
            cliente.cidade = document.getElementById('cidade-edicao').value;
            cliente.telefone = document.getElementById('telefone-edicao').value;
            cliente.celular = document.getElementById('celular-edicao').value;
            cliente.email = document.getElementById('email-edicao').value;
            cliente.obs = document.getElementById('obs-edicao').value;
            registrarLog(cliente, 'Cadastro atualizado.');
            salvarDados();
            alert('Cadastro atualizado com sucesso!');
            renderizarResultados(clientes);
            exibirHistorico(cliente);
        }
    }

    function renderizarResultados(lista) {
        const tabela = document.getElementById('tabela-resultados');
        tabela.innerHTML = '';
        lista.forEach(cliente => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${cliente.codigo}</td><td>${cliente.nome}</td><td>${cliente.cpf}</td><td>${cliente.dataNascimento ? new Date(cliente.dataNascimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : ''}</td><td>${cliente.localNascimento || ''}</td><td>${cliente.nomeConjuge || ''}</td>`;
            tr.dataset.id = cliente.id;
            tr.addEventListener('click', () => selecionarCliente(parseInt(tr.dataset.id)));
            tabela.appendChild(tr);
        });
    }

    function selecionarCliente(id) {
        const cliente = clientes.find(c => c.id === id);
        if(cliente) {
            document.getElementById('id-edicao').value = cliente.id;
            document.getElementById('codigo-edicao').value = cliente.codigo;
            document.getElementById('foto-preview-edicao').src = cliente.foto;
            document.getElementById('nome-edicao').value = cliente.nome;
            document.getElementById('cpf-edicao').value = cliente.cpf;
            document.getElementById('rg-edicao').value = cliente.rg;
            document.getElementById('estado-civil-edicao').value = cliente.estadoCivil;
            document.getElementById('data-nascimento-edicao').value = cliente.dataNascimento;
            document.getElementById('local-nascimento-edicao').value = cliente.localNascimento;
            document.getElementById('nome-conjuge-edicao').value = cliente.nomeConjuge;
            document.getElementById('endereco-edicao').value = cliente.endereco;
            document.getElementById('numero-edicao').value = cliente.numero;
            document.getElementById('bairro-edicao').value = cliente.bairro;
            document.getElementById('cep-edicao').value = cliente.cep;
            document.getElementById('aposentado-desde-edicao').value = cliente.aposentadoDesde;
            document.getElementById('uf-edicao').value = cliente.uf;
            document.getElementById('cidade-edicao').value = cliente.cidade;
            document.getElementById('telefone-edicao').value = cliente.telefone;
            document.getElementById('celular-edicao').value = cliente.celular;
            document.getElementById('email-edicao').value = cliente.email;
            document.getElementById('data-cadastro-edicao').value = cliente.dataCadastro;
            document.getElementById('obs-edicao').value = cliente.obs;
            exibirHistorico(cliente);
        }
    }
    
    function limparFormularioEdicao() {
        document.getElementById('form-edicao').reset();
        document.getElementById('id-edicao').value = '';
        document.getElementById('foto-preview-edicao').src = placeholderImage;
        document.getElementById('audit-trail-content').innerHTML = '<p>Selecione um cliente para ver o histórico.</p>';
    }

    function deletarCadastro() {
        const id = parseInt(document.getElementById('id-edicao').value);
        if (!id) { alert('Nenhum cliente selecionado para deletar.'); return; }
        if (confirm('Tem certeza que deseja deletar este cadastro? Esta ação não pode ser desfeita.')) {
            clientes = clientes.filter(c => c.id !== id);
            salvarDados();
            alert('Cadastro deletado com sucesso!');
            renderizarResultados(clientes);
            limparFormularioEdicao();
        }
    }

    function imprimirFicha() {
        const id = parseInt(document.getElementById('id-edicao').value);
        if (!id) { alert('Selecione um cliente para imprimir a ficha.'); return; }
        const cliente = clientes.find(c => c.id === id);
        const printArea = document.getElementById('pagina-impressao');
        let localNasc = cliente.localNascimento || '';
        let estadoNasc = '';
        if (localNasc.includes('/')) { [localNasc, estadoNasc] = localNasc.split('/').map(s => s.trim()); }
        
        printArea.innerHTML = `
            <div class="print-header">
                <div class="logo-area"><img src="logo/logo_aair.png" alt="ERRO: 'logo/logo_aair.png' não encontrado!" class="print-logo"></div>
                <div class="title-area"><h2>FICHA DO ASSOCIADO</h2></div>
                <div class="photo-area"><img class="print-photo" src="${cliente.foto || placeholderImage}" alt="Foto"><span class="print-id">N2025/${cliente.codigo}</span></div>
            </div>
            <div class="print-content">
                <div class="print-row"><p class="print-field full-width"><strong class="print-label">Nome:</strong><span class="print-value">${cliente.nome || ''}</span></p></div>
                <div class="print-row"><p class="print-field full-width"><strong class="print-label">Endereço:</strong><span class="print-value">${cliente.endereco || ''}, ${cliente.numero || ''}</span></p></div>
                <div class="print-row"><p class="print-field"><strong class="print-label">Bairro:</strong><span class="print-value">${cliente.bairro || ''}</span></p><p class="print-field"><strong class="print-label">Cep:</strong><span class="print-value">${cliente.cep || ''}</span></p></div>
                <div class="print-row"><p class="print-field"><strong class="print-label">Cidade:</strong><span class="print-value">${cliente.cidade || ''}</span></p><p class="print-field"><strong class="print-label">Estado:</strong><span class="print-value">${cliente.uf || ''}</span></p></div>
                <div class="print-row"><p class="print-field"><strong class="print-label">Cpf:</strong><span class="print-value">${cliente.cpf || ''}</span></p><p class="print-field"><strong class="print-label">Rg:</strong><span class="print-value">${cliente.rg || ''}</span></p></div>
                <div class="print-row"><p class="print-field full-width"><strong class="print-label">Telefone Residencial:</strong><span class="print-value">${cliente.telefone || 'NÃO'}</span></p></div>
                <div class="print-row"><p class="print-field full-width"><strong class="print-label">Telefone Celular:</strong><span class="print-value">${cliente.celular || ''}</span></p></div>
                <div class="print-row"><p class="print-field full-width"><strong class="print-label">E-mail:</strong><span class="print-value">${cliente.email || ''}</span></p></div>
                <div class="print-row"><p class="print-field"><strong class="print-label">Data Nascimento:</strong><span class="print-value">${cliente.dataNascimento ? new Date(cliente.dataNascimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : ''}</span></p><p class="print-field"><strong class="print-label">Admissão:</strong><span class="print-value">${cliente.dataCadastro || ''}</span></p></div>
                <div class="print-row"><p class="print-field"><strong class="print-label">Local de Nascimento:</strong><span class="print-value">${localNasc}</span></p><p class="print-field"><strong class="print-label">Estado:</strong><span class="print-value">${estadoNasc}</span></p></div>
                <div class="print-row"><p class="print-field full-width"><strong class="print-label">Aposentado desde:</strong><span class="print-value">${cliente.aposentadoDesde || ''}</span></p></div>
                <div class="print-row"><p class="print-field full-width"><strong class="print-label">Estado Civil:</strong><span class="print-value">${cliente.estadoCivil || ''}</span></p></div>
                <div class="print-row"><p class="print-field full-width"><strong class="print-label">Nome do Cônjuge:</strong><span class="print-value">${cliente.nomeConjuge || ''}</span></p></div>
            </div>
            <div class="print-footer">
                <p class="date-location-line">IBIPORÃ, _______ / _______ / _______</p>
                <p class="affiliation-text">Solicito minha filiação ao AIAPIR – ASSOCIAÇÃO DE IDOSOS, APOSENTADOS E PENSIONISTAS DE IBIPORÃ E REGIÃO.</p>
                <div class="signature-area"><div class="signature-line"></div><p>ASSINATURA</p></div>
            </div>
        `;
        window.print();
    }

    function handlePhotoChange(input, preview) {
        const file = input.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => { preview.src = e.target.result; };
            reader.readAsDataURL(file);
        }
    }

    // --- ATRIBUINDO EVENTOS AOS ELEMENTOS ---
    document.getElementById('form-login').addEventListener('submit', login);
    document.getElementById('btn-logout').addEventListener('click', logout);
    document.getElementById('btn-menu-backup').addEventListener('click', () => mostrarPagina('pagina-backup'));
    document.getElementById('btn-exportar-excel').addEventListener('click', exportarParaExcel);
    document.getElementById('btn-fazer-backup').addEventListener('click', fazerBackup);
    document.getElementById('btn-restaurar-backup').addEventListener('click', restaurarBackup);
    document.getElementById('btn-menu-cadastrar').addEventListener('click', () => mostrarPagina('pagina-cadastro'));
    document.getElementById('btn-menu-pesquisar').addEventListener('click', () => mostrarPagina('pagina-pesquisa'));
    document.getElementById('btn-menu-instrucoes').addEventListener('click', () => mostrarPagina('pagina-instrucoes'));
    document.querySelectorAll('.btn-voltar').forEach(btn => btn.addEventListener('click', () => mostrarPagina('menu-inicial')));
    document.getElementById('form-cadastro').addEventListener('submit', handleCadastro);
    document.getElementById('form-edicao').addEventListener('submit', handleEdicao);
    document.getElementById('btn-deletar').addEventListener('click', deletarCadastro);
    document.getElementById('btn-imprimir').addEventListener('click', imprimirFicha);
    document.getElementById('btn-pesquisar').addEventListener('click', () => {
        const nome = document.getElementById('pesquisa-nome').value.toLowerCase();
        const cpf = document.getElementById('pesquisa-cpf').value;
        const codigo = document.getElementById('pesquisa-codigo').value;
        const resultados = clientes.filter(c => c.nome.toLowerCase().includes(nome) && c.cpf.includes(cpf) && c.codigo.includes(codigo));
        renderizarResultados(resultados);
    });
    document.getElementById('btn-limpar-pesquisa').addEventListener('click', () => {
        document.getElementById('pesquisa-nome').value = '';
        document.getElementById('pesquisa-cpf').value = '';
        document.getElementById('pesquisa-codigo').value = '';
        renderizarResultados(clientes);
    });
    document.getElementById('input-foto-cadastro').addEventListener('change', (e) => handlePhotoChange(e.target, document.getElementById('foto-preview-cadastro')));
    document.getElementById('btn-limpar-foto-cadastro').addEventListener('click', () => { document.getElementById('foto-preview-cadastro').src = placeholderImage; document.getElementById('input-foto-cadastro').value = ''; });
    document.getElementById('input-foto-edicao').addEventListener('change', (e) => handlePhotoChange(e.target, document.getElementById('foto-preview-edicao')));
    document.getElementById('btn-limpar-foto-edicao').addEventListener('click', () => { document.getElementById('foto-preview-edicao').src = placeholderImage; document.getElementById('input-foto-edicao').value = ''; });
});