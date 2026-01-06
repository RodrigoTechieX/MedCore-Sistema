let FUNCIONARIOS_CACHE = [];

document.addEventListener("DOMContentLoaded", () => {
  const API_FUNC = `${API_URL}/funcionarios`;
  const API_CARGOS = `${API_URL}/cargos`;

  const tabelaBody = document.querySelector("#tabela_funcionarios tbody");
  const form = document.getElementById("form_funcionario");

  const idInput = document.getElementById("func_id");
  const nome = document.getElementById("nome");
  const cpf = document.getElementById("cpf");
  const dataNascimento = document.getElementById("data_nascimento");
  const endereco = document.getElementById("endereco");
  const email = document.getElementById("email");
  const telefone = document.getElementById("telefone");
  const cargoSelect = document.getElementById("cargo_id");

  const searchNome = document.getElementById("search_nome");
  const searchCpf = document.getElementById("search_cpf");
  const btnSearch = document.getElementById("btn_search");
  const btnNew = document.getElementById("btn_new");

  // ==============================
  // FORMATAR DATA (dd/mm/aaaa)
  // ==============================
  function formatarData(data) {
    if (!data) return "-";
    
    // Se a data já estiver no formato DD/MM/AAAA, retorna como está
    if (typeof data === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(data)) {
      return data;
    }

    // Tenta converter para objeto Date
    const d = new Date(data);
    if (!isNaN(d.getTime())) {
      // A forma mais segura para garantir DD/MM/AAAA de uma string AAAA-MM-DD é o split:
      if (typeof data === 'string' && data.includes('-')) {
        const partes = data.split('T')[0].split('-');
        if (partes.length === 3) {
          return `${partes[2]}/${partes[1]}/${partes[0]}`;
        }
      }
      
      const dia = String(d.getDate()).padStart(2, "0");
      const mes = String(d.getMonth() + 1).padStart(2, "0");
      const ano = d.getFullYear();
      return `${dia}/${mes}/${ano}`;
    }

    return data;
  }

  function limparForm() {
    form.reset();
    idInput.value = "";
  }

  async function carregarCargos() {
    const res = await fetch(API_CARGOS);
    const cargos = await res.json();

    cargoSelect.innerHTML = `<option value="">Selecione</option>`;
    cargos.forEach(c => {
      cargoSelect.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
    });
  }

  async function listarFuncionarios() {
    const res = await fetch(
      `${API_FUNC}?nome=${encodeURIComponent(searchNome.value)}&cpf=${encodeURIComponent(searchCpf.value)}`
    );

    const lista = await res.json();
    FUNCIONARIOS_CACHE = Array.isArray(lista) ? lista : [];
    tabelaBody.innerHTML = "";

    if (FUNCIONARIOS_CACHE.length === 0) {
      tabelaBody.innerHTML = `
        <tr>
          <td colspan="9" class="sem-dados" style="text-align:center;">Nenhum funcionário encontrado.</td>
        </tr>
      `;
      return;
    }

    FUNCIONARIOS_CACHE.forEach(f => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${f.id}</td>
        <td>${f.nome}</td>
        <td>${formatarData(f.data_nascimento)}</td>
        <td>${f.endereco || "-"}</td>
        <td>${f.cpf}</td>
        <td>${f.email || "-"}</td>
        <td>${f.telefone || "-"}</td>
        <td>${f.cargo_nome || "-"}</td>
        <td class="acoes text-center">
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            title="Editar"
            onclick="editarFuncionario(${f.id})"
          >
            ✏️
          </button>

          <button
            type="button"
            class="btn btn-danger btn-sm"
            title="Excluir"
            onclick="excluirFuncionario(${f.id})"
          >
            🗑️
          </button>
        </td>
      `;

      tabelaBody.appendChild(tr);
    });
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const payload = {
      nome: nome.value.trim(),
      cpf: cpf.value.trim(),
      data_nascimento: dataNascimento.value || null,
      endereco: endereco.value.trim(),
      email: email.value.trim(),
      telefone: telefone.value.trim(),
      cargo_id: cargoSelect.value || null
    };

    const id = idInput.value;
    const method = id ? "PUT" : "POST";
    const url = id ? `${API_FUNC}/${id}` : API_FUNC;

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    alert("Funcionário salvo com sucesso!");
    limparForm();
    listarFuncionarios();
  });

  btnSearch.addEventListener("click", listarFuncionarios);
  btnNew.addEventListener("click", limparForm);

  carregarCargos();
  listarFuncionarios();
});

/* =========================
   EDITAR FUNCIONÁRIO (CACHE)
========================= */
window.editarFuncionario = function (id) {
  const f = FUNCIONARIOS_CACHE.find(item => item.id === id);
  if (!f) {
    alert("Funcionário não encontrado");
    return;
  }

  document.getElementById("func_id").value = f.id;
  document.getElementById("nome").value = f.nome || "";
  document.getElementById("cpf").value = f.cpf || "";
  
  // Formatar data para o input date (AAAA-MM-DD)
  if (f.data_nascimento) {
    // Se a data vier no formato DD/MM/AAAA, precisamos converter para AAAA-MM-DD para o input type="date"
    if (f.data_nascimento.includes('/')) {
      const partes = f.data_nascimento.split('/');
      if (partes.length === 3) {
        document.getElementById("data_nascimento").value = `${partes[2]}-${partes[1]}-${partes[0]}`;
      }
    } else {
      // Se já vier no formato AAAA-MM-DD ou ISO
      document.getElementById("data_nascimento").value = f.data_nascimento.split("T")[0];
    }
  } else {
    document.getElementById("data_nascimento").value = "";
  }
  
  document.getElementById("endereco").value = f.endereco || "";
  document.getElementById("email").value = f.email || "";
  document.getElementById("telefone").value = f.telefone || "";
  document.getElementById("cargo_id").value = f.cargo_id || "";

  window.scrollTo({ top: 0, behavior: "smooth" });
};

/* =========================
   EXCLUIR FUNCIONÁRIO
========================= */
window.excluirFuncionario = async function (id) {
  if (!confirm("Deseja excluir este funcionário?")) return;

  await fetch(`${API_URL}/funcionarios/${id}`, { method: "DELETE" });
  listarFuncionarios();
};
