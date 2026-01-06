-- cria DB (se ainda não existir)
CREATE DATABASE IF NOT EXISTS medcore
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE medcore;

-- cargos
CREATE TABLE IF NOT EXISTS cargos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  salario DECIMAL(10,2) NOT NULL,
  descricao TEXT,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- funcionarios
CREATE TABLE IF NOT EXISTS funcionarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  data_nascimento DATE,
  endereco TEXT,
  cpf VARCHAR(14) NOT NULL UNIQUE,
  email VARCHAR(255),
  telefone VARCHAR(20),
  cargo_id INT NOT NULL,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cargo_id) REFERENCES cargos(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE pacientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cpf TEXT NOT NULL,
    nascimento DATE,
    telefone TEXT,
    email TEXT,
    consulta TEXT NOT NULL,
    data_consulta DATE NOT NULL,
    hora_consulta TIME NOT NULL
);

CREATE TABLE consultas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paciente TEXT NOT NULL,
    consulta TEXT NOT NULL,
    data DATE NOT NULL,
    hora TIME NOT NULL,
    status TEXT DEFAULT 'Agendada'
);



-- relatorios
CREATE TABLE IF NOT EXISTS relatorios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- índices
CREATE INDEX idx_funcionarios_nome ON funcionarios(nome);
CREATE INDEX idx_cargos_nome ON cargos(nome);

CREATE TABLE auditoria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    usuario VARCHAR(100),
    modulo VARCHAR(100),
    acao VARCHAR(20),
    detalhes TEXT
);






