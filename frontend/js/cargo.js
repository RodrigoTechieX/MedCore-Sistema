let CARGOS_CACHE = [];

document.addEventListener("DOMContentLoaded", () => {
  const API_CARGOS = `${API_URL}/cargos`;

  const tabelaBody = document.querySelector("#tabela_cargos tbody");
  const form = document.getElementById("form_cargo");

  const idInput = document.getElementById("cargo_id");
  const nome = document.getElementById("nome");
  const salario = document.getElementById("salario");
  const descricao = document.getElementById("descricao");

  const searchNome = document.getElementById("search_nome");
  const btnSearch = document.getElementById("btn_search");
  const btnNew = document.getElementById("btn_new");
  const btnNewForm = document.getElementById("btn_new_form");

  function limparForm() {
    form.reset();
    idInput.value = "";
  }

  async function listarCargos() {
    const res = await fetch(
      `${API_CARGOS}?nome=${encodeURIComponent(searchNome.value)}`
    );
    const lista = await res.json();

    CARGOS_CACHE = lista;
    tabelaBody.innerHTML = "";

    if (!Array.isArray(lista) || lista.length === 0) {
      tabelaBody.innerHTML = `
        <tr>
          <td colspan="5" class="sem-dados" style="text-align:center;">Nenhum cargo encontrado.</td>
        </tr>`;
      return;
    }

    lista.forEach(c => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${c.id}</td>
        <td>${c.nome}</td>
        <td>R$ ${Number(c.salario).toFixed(2)}</td>
        <td>${c.descricao || "-"}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="editarCargo(${c.id})">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="excluirCargo(${c.id})">🗑️</button>
        </td>
      `;

      tabelaBody.appendChild(tr);
    });
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();

    const payload = {
      nome: nome.value.trim(),
      salario: salario.value,
      descricao: descricao.value.trim()
    };

    const id = idInput.value;
    const method = id ? "PUT" : "POST";
    const url = id ? `${API_CARGOS}/${id}` : API_CARGOS;

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    alert("Cargo salvo com sucesso!");
    limparForm();
    listarCargos();
  });

  btnSearch.addEventListener("click", listarCargos);
  btnNew.addEventListener("click", limparForm);
  btnNewForm.addEventListener("click", limparForm);

  listarCargos();
});

/* =========================
   FUNÇÕES GLOBAIS
========================= */
window.editarCargo = function (id) {
  const c = CARGOS_CACHE.find(c => c.id === id);
  if (!c) return alert("Cargo não encontrado");

  document.getElementById("cargo_id").value = c.id;
  document.getElementById("nome").value = c.nome;
  document.getElementById("salario").value = c.salario;
  document.getElementById("descricao").value = c.descricao || "";

  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.excluirCargo = async function (id) {
  if (!confirm("Deseja excluir este cargo?")) return;

  await fetch(`${API_URL}/cargos/${id}`, { method: "DELETE" });
  alert("Cargo excluído com sucesso!");
  location.reload();
};
