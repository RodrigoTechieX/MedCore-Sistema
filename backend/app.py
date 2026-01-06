from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from services.db import Database
from pymysql.err import IntegrityError
from datetime import datetime, date, timedelta

app = Flask(__name__)
CORS(app)

# ======================================================
# BANCO DE DADOS
# ======================================================
DB = Database(
    host=os.getenv("DB_HOST", "localhost"),
    port=int(os.getenv("DB_PORT", 3306)),
    user=os.getenv("DB_USER", "appuser"),
    password=os.getenv("DB_PASSWORD", "app_password_here"),
    database=os.getenv("DB_NAME", "medcore")
)

# ======================================================
# FUNÇÕES AUXILIARES — SERIALIZA JSON
# ======================================================
def serializar(obj):
    if isinstance(obj, timedelta):
        return str(obj)

    if isinstance(obj, datetime):
        # Garante o formato dia/mês/ano para data e hora
        return obj.strftime('%d/%m/%Y %H:%M:%S')

    if isinstance(obj, date):
        # Garante o formato dia/mês/ano para datas
        return obj.strftime('%d/%m/%Y')

    return obj


def serializar_lista(lista):
    dados = []
    for item in lista:
        novo = {}
        for chave, valor in item.items():
            novo[chave] = serializar(valor)
        dados.append(novo)
    return dados


# ======================================================
# CARGOS
# ======================================================
@app.route('/api/cargos', methods=['GET'])
def listar_cargos():
    nome = request.args.get('nome', '')
    return jsonify(DB.buscar_cargos_por_nome(nome)), 200


@app.route('/api/cargos', methods=['POST'])
def adicionar_cargo():
    data = request.json or {}

    if not data.get('nome') or data.get('salario') is None:
        return jsonify({'erro': 'Nome e salário são obrigatórios'}), 400

    novo_id = DB.inserir_cargo(
        data['nome'],
        data['salario'],
        data.get('descricao', '')
    )
    return jsonify({'id': novo_id}), 201


@app.route('/api/cargos/<int:id>', methods=['PUT'])
def editar_cargo(id):
    atualizado = DB.atualizar_cargo(
        id,
        request.json.get('nome'),
        request.json.get('salario'),
        request.json.get('descricao')
    )

    if atualizado:
        return jsonify({'mensagem': 'Cargo atualizado'}), 200

    return jsonify({'erro': 'Cargo não encontrado'}), 404


@app.route('/api/cargos/<int:id>', methods=['DELETE'])
def remover_cargo(id):
    try:
        if DB.deletar_cargo(id):
            return jsonify({'mensagem': 'Cargo excluído'}), 200
        return jsonify({'erro': 'Cargo não encontrado'}), 404
    except IntegrityError:
        return jsonify({'erro': 'Existem funcionários vinculados a este cargo'}), 400


# ======================================================
# FUNCIONÁRIOS
# ======================================================
@app.route('/api/funcionarios', methods=['GET'])
def listar_funcionarios():
    return jsonify(DB.buscar_funcionarios(
        request.args.get('nome', ''),
        request.args.get('cpf', '')
    )), 200


@app.route('/api/funcionarios', methods=['POST'])
def adicionar_funcionario():
    data = request.json or {}

    try:
        novo_id = DB.inserir_funcionario(
            data['nome'],
            data.get('data_nascimento'),
            data.get('endereco'),
            data['cpf'],
            data.get('email'),
            data.get('telefone'),
            data['cargo_id']
        )
        return jsonify({'id': novo_id}), 201

    except IntegrityError:
        return jsonify({'erro': 'CPF já cadastrado'}), 400


@app.route('/api/funcionarios/<int:id>', methods=['PUT'])
def editar_funcionario(id):
    if DB.atualizar_funcionario(id, request.json):
        return jsonify({'mensagem': 'Funcionário atualizado'}), 200

    return jsonify({'erro': 'Funcionário não encontrado'}), 404


@app.route('/api/funcionarios/<int:id>', methods=['DELETE'])
def excluir_funcionario(id):
    if DB.deletar_funcionario(id):
        return jsonify({'mensagem': 'Funcionário excluído'}), 200

    return jsonify({'erro': 'Funcionário não encontrado'}), 404


# ======================================================
# CONTADORES
# ======================================================
@app.route('/api/counts', methods=['GET'])
def api_counts():
    return jsonify(DB.buscar_counts()), 200


# ======================================================
# PACIENTES
# ======================================================
@app.route('/api/pacientes', methods=['GET'])
def listar_pacientes():
    nome = request.args.get('nome', '')
    cpf = request.args.get('cpf', '')

    pacientes = DB.buscar_pacientes(nome, cpf)
    return jsonify(serializar_lista(pacientes)), 200


@app.route('/api/pacientes/<int:id>', methods=['GET'])
def buscar_paciente(id):
    paciente = DB.buscar_paciente_por_id(id)

    if paciente:
        return jsonify(serializar_lista([paciente])[0]), 200

    return jsonify({'erro': 'Paciente não encontrado'}), 404


@app.route('/api/pacientes', methods=['POST'])
def criar_paciente():
    data = request.json or {}

    if not data.get('nome') or not data.get('cpf'):
        return jsonify({'erro': 'Nome e CPF são obrigatórios'}), 400

    try:
        paciente_id = DB.inserir_paciente(
            data['nome'],
            data['cpf'],
            data.get('data_nascimento'),
            data.get('telefone'),
            data.get('email')
        )
        return jsonify({'id': paciente_id}), 201

    except IntegrityError:
        return jsonify({'erro': 'CPF já cadastrado'}), 400


@app.route('/api/pacientes/<int:id>', methods=['PUT'])
def atualizar_paciente(id):
    if DB.atualizar_paciente(id, request.json):
        return jsonify({'mensagem': 'Paciente atualizado'}), 200

    return jsonify({'erro': 'Paciente não encontrado'}), 404


@app.route('/api/pacientes/<int:id>', methods=['DELETE'])
def deletar_paciente(id):
    DB.deletar_paciente(id)
    return jsonify({'mensagem': 'Paciente excluído'}), 200


# ======================================================
# CONSULTAS
# ======================================================
@app.route('/api/consultas', methods=['GET'])
def listar_consultas():
    consultas = DB.buscar_consultas()
    return jsonify(serializar_lista(consultas)), 200


@app.route('/api/consultas', methods=['POST'])
def criar_consulta():
    data = request.json or {}

    consulta_id = DB.inserir_consulta(
        data['paciente_id'],
        data['consulta'],
        data['data'],
        data['hora'],
        data.get('status', 'Agendada')
    )
    return jsonify({'id': consulta_id}), 201


@app.route('/api/consultas/<int:id>', methods=['PATCH'])
def atualizar_status_consulta(id):
    DB.atualizar_status_consulta(id, request.json.get('status'))
    return jsonify({'mensagem': 'Status atualizado'}), 200


@app.route('/api/consultas/<int:id>', methods=['DELETE'])
def deletar_consulta(id):
    DB.deletar_consulta(id)
    return jsonify({'mensagem': 'Consulta excluída'}), 200


# ======================================================
# AUDITORIA
# ======================================================
@app.route('/api/auditoria', methods=['GET'])
def listar_auditoria():
    registros = DB.buscar_auditoria()
    return jsonify(serializar_lista(registros)), 200


# 🔹 DELETE INDIVIDUAL (corrige o erro do frontend)
@app.route('/api/auditoria/<int:id>', methods=['DELETE'])
def excluir_auditoria(id):
    try:
        total = DB.excluir_auditoria_em_lote([id])

        if total == 0:
            return jsonify({'erro': 'Registro não encontrado'}), 404

        return jsonify({'mensagem': 'Registro de auditoria excluído'}), 200

    except Exception as e:
        print('Erro ao excluir auditoria:', e)
        return jsonify({'erro': 'Erro ao excluir auditoria'}), 500


# 🔹 DELETE EM LOTE
@app.route('/api/auditoria', methods=['DELETE'])
def excluir_auditoria_em_lote():
    dados = request.json or {}
    ids = dados.get('ids', [])

    if not ids or not isinstance(ids, list):
        return jsonify({'erro': 'Lista de IDs inválida'}), 400

    total = DB.excluir_auditoria_em_lote(ids)

    return jsonify({
        'mensagem': 'Registros de auditoria excluídos com sucesso',
        'total_excluidos': total
    }), 200


# ======================================================
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
