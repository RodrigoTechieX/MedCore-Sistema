document.addEventListener("DOMContentLoaded", () => {
  console.log("consulta.js carregado");

  const API_CONSULTAS = API_URL + "/consultas";
  const API_PACIENTES = API_URL + "/pacientes";
  const lista = document.getElementById("listaConsultas");

  // Elementos de Busca
  const searchNome = document.getElementById("search_nome");
  const searchConsulta = document.getElementById("search_consulta");
  const btnSearch = document.getElementById("btn_search");

  let pacientesPorId = {};
  let consultasAtuais = []; // Cache local para saber qual paciente excluir

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
      // Usamos getUTCDate e getUTCMonth para evitar problemas de fuso horário se a string vier em formato ISO
      // Mas como o banco envia DATE puro, o Date(data) pode interpretar como local ou UTC.
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
  // CARREGAR PACIENTES (MAPA)
  // ==============================
  async function carregarPacientes() {
    try {
      const res = await fetch(API_PACIENTES);
      if (!res.ok) throw new Error("Erro ao buscar pacientes");
      const pacientes = await res.json();
      pacientesPorId = {};
      pacientes.forEach(p => {
        if (p.id) pacientesPorId[p.id] = p.nome;
      });
    } catch (err) {
      console.error("Erro ao carregar pacientes:", err);
    }
  }

  // ==============================
  // LISTAR CONSULTAS (COM FILTROS)
  // ==============================
  async function listar() {
    try {
      await carregarPacientes();

      const res = await fetch(API_CONSULTAS);
      if (!res.ok) throw new Error("Erro ao listar consultas");

      consultasAtuais = await res.json();
      let consultasParaExibir = [...consultasAtuais];

      // Aplicar filtros de pesquisa
      const queryNome = searchNome ? searchNome.value.trim().toLowerCase() : "";
      const queryConsulta = searchConsulta ? searchConsulta.value.trim().toLowerCase() : "";

      if (queryNome || queryConsulta) {
        consultasParaExibir = consultasParaExibir.filter(c => {
          const nomePaciente = (
            pacientesPorId[c.paciente_id] ||
            c.paciente_nome ||
            ""
          ).toLowerCase();
          const tipoConsulta = (c.consulta || "").toLowerCase();
          const matchNome = queryNome ? nomePaciente.includes(queryNome) : true;
          const matchConsulta = queryConsulta ? tipoConsulta.includes(queryConsulta) : true;
          return matchNome && matchConsulta;
        });
      }

      lista.innerHTML = "";
      if (consultasParaExibir.length === 0) {
        lista.innerHTML = `<tr><td colspan="7" class="sem-dados" style="text-align:center;">Nenhuma consulta encontrada.</td></tr>`;
        return;
      }

      consultasParaExibir.forEach(c => {
        const nomePaciente = pacientesPorId[c.paciente_id] || c.paciente_nome || "Paciente não vinculado";
        lista.innerHTML += `
          <tr>
            <td>${c.id || "-"}</td>
            <td>${nomePaciente}</td>
            <td>${c.consulta || "-"}</td>
            <td>${formatarDataBR(c.data)}</td>
            <td>${c.hora || "-"}</td>
            <td>
              <select class="status-select" onchange="alterarStatus(${c.id}, this.value)">
                <option value="Agendada" ${c.status === "Agendada" ? "selected" : ""}>Agendada</option>
                <option value="Confirmada" ${c.status === "Confirmada" ? "selected" : ""}>Confirmada</option>
                <option value="Realizada" ${c.status === "Realizada" ? "selected" : ""}>Realizada</option>
                <option value="Cancelada" ${c.status === "Cancelada" ? "selected" : ""}>Cancelada</option>
              </select>
            </td>
            <td>
              <button class="btn btn-danger btn-sm" onclick="excluir(${c.id})">🗑️</button>
            </td>
          </tr>
        `;
      });
    } catch (err) {
      console.error("Erro ao listar consultas:", err);
    }
  }

  // ==============================
  // ALTERAR STATUS
  // ==============================
  window.alterarStatus = async function (id, status) {
    try {
      const res = await fetch(`${API_CONSULTAS}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Erro ao atualizar status");
      listar();
    } catch (err) {
      console.error("Erro ao alterar status:", err);
      alert("Não foi possível alterar o status da consulta.");
    }
  };

  // ==============================
  // EXCLUIR CONSULTA + PACIENTE (SINCRONIZAÇÃO TOTAL)
  // ==============================
  window.excluir = async function (id) {
    if (!confirm("Deseja excluir esta consulta? Isso também removerá o cadastro do paciente do sistema.")) return;
    
    try {
      // 1. Encontrar o ID do paciente vinculado a esta consulta
      const consultaParaExcluir = consultasAtuais.find(c => c.id === id);
      if (!consultaParaExcluir) throw new Error("Consulta não encontrada no cache.");
      
      const pacienteId = consultaParaExcluir.paciente_id;

      // 2. Excluir o Paciente (O banco de dados apagará a consulta automaticamente via ON DELETE CASCADE)
      const res = await fetch(`${API_PACIENTES}/${pacienteId}`, { method: "DELETE" });
      
      if (!res.ok) {
        // Se falhar ao excluir o paciente, tenta excluir apenas a consulta como fallback
        const resFallback = await fetch(`${API_CONSULTAS}/${id}`, { method: "DELETE" });
        if (!resFallback.ok) throw new Error("Erro ao excluir registro.");
      }

      alert("Consulta e cadastro do paciente removidos com sucesso.");
      listar();
    } catch (err) {
      console.error("Erro na exclusão sincronizada:", err);
      alert("Não foi possível realizar a exclusão completa.");
    }
  };

  // EVENTOS DE BUSCA
  if (btnSearch) btnSearch.addEventListener("click", listar);
  if (searchNome) searchNome.addEventListener("keypress", (e) => { if (e.key === 'Enter') listar(); });
  if (searchConsulta) searchConsulta.addEventListener("keypress", (e) => { if (e.key === 'Enter') listar(); });

  // INIT
  listar();
});
