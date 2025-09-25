document.addEventListener('DOMContentLoaded', function () {
    // --- PARTE 1: LÓGICA DE NAVEGAÇÃO ENTRE ABAS ---
    const navLinks = document.querySelectorAll('.nav-link');
    const contentSections = document.querySelectorAll('.content-section');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            contentSections.forEach(s => s.classList.remove('active'));
            const targetId = link.getAttribute('href').substring(1);
            const targetSection = document.getElementById(targetId);
            link.classList.add('active');
            targetSection.classList.add('active');
        });
    });

    // --- PARTE 2: LÓGICA DO MODAL E GERENCIAMENTO DE SERVIÇOS ---

    const modal = document.getElementById('addServiceModal');
    const modalTitle = modal.querySelector('h2');
    const btnOpenModal = document.querySelector('#servicos .btn-add');
    const btnCloseModal = document.querySelector('.close-button');
    const form = document.getElementById('addServiceForm');
    const tableBody = document.querySelector('table tbody');

    let currentRowBeingEdited = null;

    const openModal = () => { modal.style.display = 'block'; };
    const closeModal = () => {
        modal.style.display = 'none';
        form.reset();
        currentRowBeingEdited = null;
        modalTitle.textContent = 'Adicionar Novo Serviço';
    };

    btnOpenModal.addEventListener('click', openModal);
    btnCloseModal.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target == modal) closeModal();
    });

    const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const parseCurrency = (text) => parseFloat(text.replace('R$', '').replace(/\./g, '').replace(',', '.').trim());

    form.addEventListener('submit', function (e) {
        e.preventDefault();
        
        const custoInput = document.getElementById('custo').value;
        const valorCobradoInput = document.getElementById('valorCobrado').value;
        
        if (custoInput === '' || valorCobradoInput === '') {
            alert('Por favor, preencha os campos de Custo e Valor Cobrado.');
            return;
        }
        
        const custo = parseFloat(custoInput);
        const valorCobrado = parseFloat(valorCobradoInput);

        if (isNaN(custo) || isNaN(valorCobrado)) {
            alert('Os valores de Custo e Valor Cobrado devem ser números válidos.');
            return;
        }

        const descricao = document.getElementById('descricao').value;
        const dataRecebimento = document.getElementById('dataRecebimento').value; 
        const dataEntrega = document.getElementById('dataEntrega').value;
        const lucro = valorCobrado - custo;

        if (currentRowBeingEdited) {
            const cells = currentRowBeingEdited.children;
            cells[0].textContent = descricao;
            cells[1].textContent = dataRecebimento;
            cells[2].textContent = dataEntrega;
            cells[3].textContent = formatCurrency(custo);
            cells[4].textContent = formatCurrency(valorCobrado);
            cells[5].textContent = formatCurrency(lucro);
        } else {
            const newRow = document.createElement('tr');
            newRow.innerHTML = `
                <td>${descricao}</td>
                <td>${dataRecebimento}</td>
                <td>${dataEntrega}</td>
                <td>${formatCurrency(custo)}</td>
                <td>${formatCurrency(valorCobrado)}</td>
                <td>${formatCurrency(lucro)}</td>
                <td class="acoes">
                    <button class="btn-edit">Editar</button>
                    <button class="btn-delete">Excluir</button>
                </td>
            `;
            tableBody.appendChild(newRow);
        }
        closeModal();
        updateCharts();
    });

    tableBody.addEventListener('click', function(e) {
        const target = e.target;
        if (target.classList.contains('btn-delete')) {
            if (confirm('Tem certeza que deseja excluir este serviço?')) {
                target.closest('tr').remove();
                updateCharts();
            }
        }

        if (target.classList.contains('btn-edit')) {
            const row = target.closest('tr');
            currentRowBeingEdited = row;
            const cells = row.children;
            
            document.getElementById('descricao').value = cells[0].textContent;
            document.getElementById('dataRecebimento').value = cells[1].textContent;
            document.getElementById('dataEntrega').value = cells[2].textContent;
            document.getElementById('custo').value = parseCurrency(cells[3].textContent);
            document.getElementById('valorCobrado').value = parseCurrency(cells[4].textContent);

            modalTitle.textContent = 'Editar Serviço';
            openModal();
        }
    });

    // --- PARTE 3: LÓGICA DOS GRÁFICOS DINÂMICOS ---

    let panoramaChart, lucroChart;

    function getChartDataFromTable() {
        const rows = tableBody.querySelectorAll('tr');
        return Array.from(rows).map(row => {
            const cells = row.querySelectorAll('td');
            return {
                descricao: cells[0].textContent,
                dataEntrega: cells[2].textContent,
                custo: parseCurrency(cells[3].textContent),
                valorCobrado: parseCurrency(cells[4].textContent),
                lucro: parseCurrency(cells[5].textContent),
            };
        });
    }

    function updateCharts() {
        const tableData = getChartDataFromTable();
        const monthlyData = {};
        tableData.forEach(item => {
            const monthYear = item.dataEntrega.substring(0, 7);
            if (!monthlyData[monthYear]) {
                monthlyData[monthYear] = { custo: 0, valorCobrado: 0 };
            }
            monthlyData[monthYear].custo += item.custo;
            monthlyData[monthYear].valorCobrado += item.valorCobrado;
        });

        const sortedMonths = Object.keys(monthlyData).sort();
        const labels = sortedMonths.map(my => my.replace('-', '/'));
        const custosMensais = sortedMonths.map(my => monthlyData[my].custo);
        const valoresCobradosMensais = sortedMonths.map(my => monthlyData[my].valorCobrado);
        
        panoramaChart.data.labels = labels;
        panoramaChart.data.datasets[0].data = valoresCobradosMensais;
        panoramaChart.data.datasets[1].data = custosMensais;
        panoramaChart.update();

        const lucroLabels = tableData.map(item => item.descricao.length > 25 ? item.descricao.substring(0, 25) + '...' : item.descricao);
        const lucroData = tableData.map(item => item.lucro);

        lucroChart.data.labels = lucroLabels;
        lucroChart.data.datasets[0].data = lucroData;
        lucroChart.update();
    }

    function initializeCharts() {
        const panoramaCtx = document.getElementById('panoramaGeralChart').getContext('2d');
        panoramaChart = new Chart(panoramaCtx, {
            type: 'bar',
            data: { labels: [], datasets: [{ label: 'Valor Cobrado (Faturamento)', data: [], backgroundColor: '#4caf50' }, { label: 'Custo Total', data: [], backgroundColor: '#f44336' }] },
            options: { responsive: true, scales: { x: { stacked: false }, y: { stacked: false, beginAtZero: true } } }
        });

        const lucroCtx = document.getElementById('lucroServicoChart').getContext('2d');
        lucroChart = new Chart(lucroCtx, {
            type: 'bar',
            data: { labels: [], datasets: [{ label: 'Lucro (R$)', data: [], backgroundColor: '#2e7d32' }] },
            options: { responsive: true, indexAxis: 'y', scales: { x: { beginAtZero: true } } }
        });

        updateCharts();
    }

    initializeCharts();
});