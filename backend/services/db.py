import pymysql
import time
from datetime import datetime, timedelta
from pymysql.cursors import DictCursor
from pymysql.err import IntegrityError


class Database:
    def __init__(self, host, port, user, password, database, retries=10, delay=3):
        attempt = 0
        while True:
            try:
                self.conn = pymysql.connect(
                    host=host,
                    port=int(port),
                    user=user,
                    password=password,
                    database=database,
                    cursorclass=DictCursor,
                    autocommit=False  # 🔥 CONTROLE MANUAL
                )
                break
            except Exception as e:
                attempt += 1
                if attempt >= retries:
                    raise
                print(f"[DB] Falha ao conectar ({attempt}/{retries}): {e}")
                time.sleep(delay)

        self.criar_tabelas()

    # ======================================================
    # CRIAÇÃO DE TABELAS
    # ======================================================
    def criar_tabelas(self):
        with self.conn.cursor() as cur:

            cur.execute("""
                CREATE TABLE IF NOT EXISTS cargos (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    nome VARCHAR(100) NOT NULL,
                    salario DECIMAL(10,2),
                    descricao TEXT
                )
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS funcionarios (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    nome VARCHAR(150),
                    data_nascimento DATE,
                    endereco VARCHAR(255),
                    cpf VARCHAR(14) UNIQUE,
                    email VARCHAR(150),
                    telefone VARCHAR(20),
                    cargo_id INT,
                    FOREIGN KEY (cargo_id) REFERENCES cargos(id)
                )
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS pacientes (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    nome VARCHAR(150) NOT NULL,
                    cpf VARCHAR(14) UNIQUE NOT NULL,
                    data_nascimento DATE,
                    telefone VARCHAR(20),
                    email VARCHAR(150)
                )
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS consultas (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    paciente_id INT NOT NULL,
                    consulta VARCHAR(100) NOT NULL,
                    data DATE NOT NULL,
                    hora TIME NOT NULL,
                    status VARCHAR(30) DEFAULT 'Agendada',
                    FOREIGN KEY (paciente_id)
                        REFERENCES pacientes(id)
                        ON DELETE CASCADE
                )
            """)

            # ✅ REMOVIDO O DEFAULT CURRENT_TIMESTAMP PARA EVITAR CONFLITO DE FUSO DO SERVIDOR
            cur.execute("""
                CREATE TABLE IF NOT EXISTS auditoria (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    data_hora DATETIME,
                    usuario VARCHAR(100),
                    modulo VARCHAR(100),
                    acao VARCHAR(20),
                    detalhes TEXT
                )
            """)

        self.conn.commit()

    # ======================================================
    # AUDITORIA
    # ======================================================
    def registrar_auditoria(self, usuario, modulo, acao, detalhes):
        try:
            # ✅ FORÇA O HORÁRIO DE BRASÍLIA (UTC-3)
            # Pegamos a hora UTC e subtraímos 3 horas
            agora_brasilia = datetime.utcnow() - timedelta(hours=3)
            
            with self.conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO auditoria (data_hora, usuario, modulo, acao, detalhes)
                    VALUES (%s, %s, %s, %s, %s)
                """, (agora_brasilia, usuario, modulo, acao, detalhes))
            self.conn.commit()
        except Exception as e:
            print(f"[DB] Erro ao registrar auditoria: {e}")
            self.conn.rollback()

    def buscar_auditoria(self):
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT id, data_hora, usuario, modulo, acao, detalhes
                FROM auditoria
                ORDER BY data_hora DESC
            """)
            return cur.fetchall()

    def excluir_auditoria_em_lote(self, ids):
        if not ids:
            return 0
        ids = [int(i) for i in ids if str(i).isdigit()]
        if not ids:
            return 0
        placeholders = ','.join(['%s'] * len(ids))
        try:
            with self.conn.cursor() as cur:
                cur.execute(f"DELETE FROM auditoria WHERE id IN ({placeholders})", ids)
                total = cur.rowcount
            self.conn.commit()
            return total
        except Exception as e:
            self.conn.rollback()
            print('[DB] Erro ao excluir auditoria:', e)
            return 0

    # ======================================================
    # CARGOS
    # ======================================================
    def buscar_cargos_por_nome(self, nome=''):
        with self.conn.cursor() as cur:
            cur.execute("SELECT * FROM cargos WHERE nome LIKE %s ORDER BY id DESC", (f"%{nome}%",))
            return cur.fetchall()

    def inserir_cargo(self, nome, salario, descricao, usuario='Sistema'):
        with self.conn.cursor() as cur:
            cur.execute("INSERT INTO cargos (nome, salario, descricao) VALUES (%s,%s,%s)", (nome, salario, descricao))
            cargo_id = cur.lastrowid
        self.conn.commit()
        self.registrar_auditoria(usuario, 'Cargos', 'INSERT', f'Cadastro do cargo "{nome}" (ID {cargo_id})')
        return cargo_id

    def atualizar_cargo(self, id, nome, salario, descricao, usuario='Sistema'):
        with self.conn.cursor() as cur:
            cur.execute("UPDATE cargos SET nome=%s, salario=%s, descricao=%s WHERE id=%s", (nome, salario, descricao, id))
            sucesso = cur.rowcount > 0
        self.conn.commit()
        if sucesso:
            self.registrar_auditoria(usuario, 'Cargos', 'UPDATE', f'Atualização do cargo ID {id}')
        return sucesso

    def deletar_cargo(self, id, usuario='Sistema'):
        with self.conn.cursor() as cur:
            cur.execute("DELETE FROM cargos WHERE id=%s", (id,))
            sucesso = cur.rowcount > 0
        self.conn.commit()
        if sucesso:
            self.registrar_auditoria(usuario, 'Cargos', 'DELETE', f'Exclusão do cargo ID {id}')
        return sucesso

    # ======================================================
    # FUNCIONÁRIOS
    # ======================================================
    def buscar_funcionarios(self, nome='', cpf=''):
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT f.*, c.nome AS cargo_nome
                FROM funcionarios f
                JOIN cargos c ON f.cargo_id = c.id
                WHERE f.nome LIKE %s AND f.cpf LIKE %s
                ORDER BY f.id DESC
            """, (f"%{nome}%", f"%{cpf}%"))
            return cur.fetchall()

    def inserir_funcionario(self, nome, data_nascimento, endereco, cpf, email, telefone, cargo_id, usuario='Sistema'):
        if not self.validar_cpf(cpf):
            raise ValueError("CPF inválido")
        with self.conn.cursor() as cur:
            cur.execute("""
                INSERT INTO funcionarios (nome, data_nascimento, endereco, cpf, email, telefone, cargo_id)
                VALUES (%s,%s,%s,%s,%s,%s,%s)
            """, (nome, data_nascimento, endereco, cpf, email, telefone, cargo_id))
            funcionario_id = cur.lastrowid
        self.conn.commit()
        self.registrar_auditoria(usuario, 'Funcionários', 'INSERT', f'Cadastro do funcionário "{nome}" (ID {funcionario_id})')
        return funcionario_id

    def atualizar_funcionario(self, id, data, usuario='Sistema'):
        try:
            with self.conn.cursor() as cur:
                cur.execute("""
                    UPDATE funcionarios SET nome=%s, data_nascimento=%s, endereco=%s, cpf=%s, email=%s, telefone=%s, cargo_id=%s
                    WHERE id=%s
                """, (data.get('nome'), data.get('data_nascimento'), data.get('endereco'), data.get('cpf'), data.get('email'), data.get('telefone'), data.get('cargo_id'), id))
                sucesso = cur.rowcount > 0
            self.conn.commit()
            if sucesso:
                self.registrar_auditoria(usuario, 'Funcionários', 'UPDATE', f'Atualização do funcionário ID {id}')
            return sucesso
        except Exception as e:
            self.conn.rollback()
            return False

    def deletar_funcionario(self, id, usuario='Sistema'):
        try:
            with self.conn.cursor() as cur:
                cur.execute("DELETE FROM funcionarios WHERE id=%s", (id,))
                sucesso = cur.rowcount > 0
            self.conn.commit()
            if sucesso:
                self.registrar_auditoria(usuario, 'Funcionários', 'DELETE', f'Exclusão do funcionário ID {id}')
            return sucesso
        except Exception as e:
            self.conn.rollback()
            return False

    # ======================================================
    # CPF
    # ======================================================
    def validar_cpf(self, cpf):
        if not cpf: return False
        cpf = ''.join(filter(str.isdigit, str(cpf)))
        if len(cpf) != 11 or cpf == cpf[0] * 11: return False
        def calc(cpf, peso):
            soma = sum(int(cpf[i]) * (peso - i) for i in range(peso - 1))
            resto = (soma * 10) % 11
            return resto if resto < 10 else 0
        try:
            return calc(cpf, 10) == int(cpf[9]) and calc(cpf, 11) == int(cpf[10])
        except: return False

    # ======================================================
    # PACIENTES
    # ======================================================
    def buscar_pacientes(self, nome='', cpf=''):
        with self.conn.cursor() as cur:
            cur.execute("SELECT id, nome, cpf, data_nascimento, telefone, email FROM pacientes WHERE nome LIKE %s AND cpf LIKE %s ORDER BY id DESC", (f"%{nome}%", f"%{cpf}%"))
            return cur.fetchall()

    def buscar_paciente_por_id(self, id):
        with self.conn.cursor() as cur:
            cur.execute("SELECT id, nome, cpf, data_nascimento, telefone, email FROM pacientes WHERE id=%s", (id,))
            return cur.fetchone()

    def inserir_paciente(self, nome, cpf, data_nascimento, telefone, email, usuario='Sistema'):
        if not self.validar_cpf(cpf): raise ValueError("CPF inválido")
        try:
            with self.conn.cursor() as cur:
                cur.execute("INSERT INTO pacientes (nome, cpf, data_nascimento, telefone, email) VALUES (%s, %s, %s, %s, %s)", (nome, cpf, data_nascimento, telefone, email))
                paciente_id = cur.lastrowid
            self.conn.commit()
            self.registrar_auditoria(usuario, 'Pacientes', 'INSERT', f'Cadastro do paciente "{nome}" (ID {paciente_id})')
            return paciente_id
        except IntegrityError:
            self.conn.rollback()
            raise IntegrityError("CPF já cadastrado")
        except Exception as e:
            self.conn.rollback()
            raise

    def atualizar_paciente(self, id, data, usuario='Sistema'):
        try:
            with self.conn.cursor() as cur:
                cur.execute("UPDATE pacientes SET nome=%s, cpf=%s, data_nascimento=%s, telefone=%s, email=%s WHERE id=%s", (data.get('nome'), data.get('cpf'), data.get('data_nascimento'), data.get('telefone'), data.get('email'), id))
                sucesso = cur.rowcount > 0
            self.conn.commit()
            if sucesso:
                self.registrar_auditoria(usuario, 'Pacientes', 'UPDATE', f'Atualização do paciente ID {id}')
            return sucesso
        except Exception as e:
            self.conn.rollback()
            return False

    def deletar_paciente(self, id, usuario='Sistema'):
        try:
            with self.conn.cursor() as cur:
                cur.execute("DELETE FROM pacientes WHERE id=%s", (id,))
                sucesso = cur.rowcount > 0
            self.conn.commit()
            if sucesso:
                self.registrar_auditoria(usuario, 'Pacientes', 'DELETE', f'Exclusão do paciente ID {id}')
            return sucesso
        except Exception as e:
            self.conn.rollback()
            return False

    # ======================================================
    # CONSULTAS
    # ======================================================
    def buscar_consultas(self):
        with self.conn.cursor() as cur:
            cur.execute("""
                SELECT c.id, c.paciente_id, c.consulta, c.data, c.hora, c.status, p.nome AS paciente_nome, p.cpf AS paciente_cpf
                FROM consultas c JOIN pacientes p ON c.paciente_id = p.id
                ORDER BY c.data DESC, c.hora DESC
            """)
            return cur.fetchall()

    def inserir_consulta(self, paciente_id, consulta, data, hora, status='Agendada', usuario='Sistema'):
        try:
            with self.conn.cursor() as cur:
                cur.execute("INSERT INTO consultas (paciente_id, consulta, data, hora, status) VALUES (%s, %s, %s, %s, %s)", (paciente_id, consulta, data, hora, status))
                consulta_id = cur.lastrowid
            self.conn.commit()
            self.registrar_auditoria(usuario, 'Consultas', 'INSERT', f'Agendamento de consulta ID {consulta_id} para paciente ID {paciente_id}')
            return consulta_id
        except Exception as e:
            self.conn.rollback()
            raise

    def atualizar_status_consulta(self, id, status, usuario='Sistema'):
        try:
            with self.conn.cursor() as cur:
                cur.execute("UPDATE consultas SET status=%s WHERE id=%s", (status, id))
                sucesso = cur.rowcount > 0
            self.conn.commit()
            if sucesso:
                self.registrar_auditoria(usuario, 'Consultas', 'UPDATE', f'Atualização de status da consulta ID {id} para "{status}"')
            return sucesso
        except Exception as e:
            self.conn.rollback()
            return False

    def deletar_consulta(self, id, usuario='Sistema'):
        try:
            with self.conn.cursor() as cur:
                cur.execute("DELETE FROM consultas WHERE id=%s", (id,))
                sucesso = cur.rowcount > 0
            self.conn.commit()
            if sucesso:
                self.registrar_auditoria(usuario, 'Consultas', 'DELETE', f'Exclusão da consulta ID {id}')
            return sucesso
        except Exception as e:
            self.conn.rollback()
            return False
