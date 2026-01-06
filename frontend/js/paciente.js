document.addEventListener("DOMContentLoaded", () => {
  console.log("paciente.js carregado");

  const API_PACIENTES = API_URL + "/pacientes";
  const API_CONSULTAS = API_URL + "/consultas";

  // ==============================
  // ELEMENTOS
  // ==============================
  const form = document.getElementById("formPaciente");
  const lista = document.getElementById("listaPacientes");
  const inputId = document.getElementById("id");

  const nome = document.getElementById("nome");
  const cpf = document.getElementById("cpf");
  const nascimento = document.getElementById("nascimento");
  const telefone = document.getElementById("telefone");
  const email = document.getElementById("email");

  const consulta = document.getElementById("consulta");
  const dataConsulta = document.getElementById("data_consulta");
  const horaConsulta = document.getElementById("hora_consulta");

  // Elementos de Busca
  const searchNome = document.getElementById("search_nome");
  const searchCpf = document.getElementById("search_cpf");
  const btnSearch = document.getElementById("btn_search");
  const btnNew = document.getElementById("btn_new");

  // ==============================
  // FORMATAR DATA (dd/mm/aaaa)
  // ==============================
  function formatarDataBR(data) {
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

  // ==============================
  // LIMPAR FORMULÁRIO
  // ==============================
  function limparForm() {
    form.reset();
    inputId.value = "";
  }

  // ==============================
  // LISTAR PACIENTES (COM BUSCA)
  // ==============================
  async function listar() {
    try {
      const queryNome = searchNome ? searchNome.value.trim() : "";
      const queryCpf = searchCpf ? searchCpf.value.trim() : "";
      
      const url = `${API_PACIENTES}?nome=${encodeURIComponent(queryNome)}&cpf=${encodeURIComponent(queryCpf)}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error("Erro ao buscar pacientes");

      const pacientes = await res.json();
      lista.innerHTML = "";

      if (pacientes.length === 0) {
        lista.innerHTML = `<tr><td colspan="7" class="sem-dados" style="text-align:center;">Nenhum paciente encontrado.</td></tr>`;
        return;
      }

      pacientes.forEach(p => {
        lista.innerHTML += `
          <tr>
            <td>${p.id || "-"}</td>
            <td>${p.nome || "-"}</td>
            <td>${p.cpf || "-"}</td>
            <td>${formatarDataBR(p.data_nascimento)}</td>
            <td>${p.telefone || "-"}</td>
            <td>${p.email || "-"}</td>
            <td>
              <button class="btn btn-secondary btn-sm" onclick="editar(${p.id})">✏️</button>
              <button class="btn btn-danger btn-sm" onclick="excluir(${p.id})">🗑️</button>
            </td>
          </tr>
        `;
      });
    } catch (err) {
      console.error("Erro ao listar pacientes:", err);
      alert("Erro ao carregar pacientes.");
    }
  }

  // ==============================
  // SALVAR PACIENTE (+ CONSULTA)
  // ==============================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      if (!nome.value.trim() || !cpf.value.trim()) {
        alert("Nome e CPF são obrigatórios.");
        return;
      }

      const isEdicao = Boolean(inputId.value);

      // Se for novo cadastro, os dados da consulta são obrigatórios
      if (!isEdicao) {
        if (!consulta.value || !dataConsulta.value || !horaConsulta.value) {
          alert("Preencha os dados da consulta para o novo paciente.");
          return;
        }
      }

      const paciente = {
        nome: nome.value.trim(),
        cpf: cpf.value.trim(),
        data_nascimento: nascimento.value || null,
        telefone: telefone.value.trim(),
        email: email.value.trim()
      };

      const urlPaciente = isEdicao
        ? `${API_PACIENTES}/${inputId.value}`
        : API_PACIENTES;

      const methodPaciente = isEdicao ? "PUT" : "POST";

      const resPaciente = await fetch(urlPaciente, {
        method: methodPaciente,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(paciente)
      });

      if (!resPaciente.ok) {
        const errorData = await resPaciente.json();
        throw new Error(errorData.erro || "Erro ao salvar paciente.");
      }

      const pacienteSalvo = await resPaciente.json();

      // Se for novo cadastro, cria a consulta vinculada
      if (!isEdicao) {
        const consultaObj = {
          paciente_id: pacienteSalvo.id,
          consulta: consulta.value,
          data: dataConsulta.value,
          hora: horaConsulta.value,
          status: "Agendada"
        };

        const resConsulta = await fetch(API_CONSULTAS, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(consultaObj)
        });

        if (!resConsulta.ok) {
          throw new Error("Paciente salvo, mas erro ao criar consulta.");
        }
      }

      limparForm();
      listar();
      alert(isEdicao ? "Paciente atualizado com sucesso!" : "Paciente e consulta cadastrados com sucesso!");

    } catch (err) {
      console.error(err);
      alert(err.message || "Erro inesperado.");
    }
  });

  // ==============================
  // EDITAR PACIENTE
  // ==============================
  window.editar = async function (id) {
    try {
      const res = await fetch(`${API_PACIENTES}/${id}`);
      if (!res.ok) throw new Error("Erro ao buscar paciente");

      const p = await res.json();

      inputId.value = p.id;
      nome.value = p.nome || "";
      cpf.value = p.cpf || "";
      
      // Formatar data para o input date (AAAA-MM-DD)
      if (p.data_nascimento) {
        // Se a data vier no formato DD/MM/AAAA, precisamos converter para AAAA-MM-DD para o input type="date"
        if (p.data_nascimento.includes('/')) {
          const partes = p.data_nascimento.split('/');
          if (partes.length === 3) {
            nascimento.value = `${partes[2]}-${partes[1]}-${partes[0]}`;
          }
        } else if (p.data_nascimento.includes('-')) {
          // Se já vier no formato AAAA-MM-DD
          nascimento.value = p.data_nascimento.split('T')[0];
        } else {
          nascimento.value = "";
        }
      } else {
        nascimento.value = "";
      }
      
      telefone.value = p.telefone || "";
      email.value = p.email || "";

      // Limpa campos de consulta na edição (pois a edição é apenas do paciente)
      consulta.value = "";
      dataConsulta.value = "";
      horaConsulta.value = "";

      window.scrollTo({ top: 0, behavior: "smooth" });

    } catch (err) {
      console.error("Erro ao editar paciente:", err);
      alert("Erro ao carregar paciente.");
    }
  };

  // ==============================
  // EXCLUIR PACIENTE
  // ==============================
  window.excluir = async function (id) {
    if (!confirm("Deseja excluir este paciente? Todas as consultas vinculadas a ele também serão excluídas.")) return;

    try {
      const res = await fetch(`${API_PACIENTES}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao excluir paciente");

      listar();
      alert("Paciente e suas consultas foram excluídos com sucesso.");
    } catch (err) {
      console.error("Erro ao excluir paciente:", err);
      alert("Erro ao excluir paciente.");
    }
  };

  // ==============================
  // EVENTOS DE BUSCA
  // ==============================
  if (btnSearch) btnSearch.addEventListener("click", listar);
  if (btnNew) btnNew.addEventListener("click", limparForm);
  
  if (searchNome) searchNome.addEventListener("keypress", (e) => { if (e.key === 'Enter') listar(); });
  if (searchCpf) searchCpf.addEventListener("keypress", (e) => { if (e.key === 'Enter') listar(); });

  // INIT
  listar();
});
