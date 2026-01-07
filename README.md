# 🏥 MedCore — Sistema de Gestão de Saúde

O **MedCore** é um sistema web completo e full-stack desenvolvido para a gestão administrativa e operacional de clínicas, hospitais e unidades de saúde.

Este projeto demonstra a construção de uma solução robusta, com foco em **organização de dados, rastreabilidade e eficiência** no fluxo de trabalho.

---

## 🚀 Arquitetura e Tecnologias

O sistema é construído com uma arquitetura de microsserviços simples, totalmente conteinerizada para garantir a portabilidade e facilidade de execução.

| Camada | Tecnologia | Descrição |
| :--- | :--- | :--- |
| **Backend (API)** | Python (Flask) | API RESTful responsável pela lógica de negócio e comunicação com o banco de dados. |
| **Banco de Dados** | MySQL | Persistência de dados segura e relacional. |
| **Frontend (UI)** | HTML, CSS, JavaScript | Interface de usuário intuitiva e responsiva. |
| **Infraestrutura** | Docker e Docker Compose | Orquestração e padronização do ambiente de desenvolvimento e produção. |

---

## ✨ Funcionalidades Principais

O MedCore abrange as seguintes áreas de gestão:

| Módulo | Funcionalidades |
| :--- | :--- |
| **Dashboard (Home)** | Visão geral com contadores em tempo real de pacientes, funcionários e consultas agendadas. |
| **Gestão de Pacientes** | Cadastro completo de pacientes, incluindo dados pessoais e CPF. |
| **Gestão de Consultas** | Agendamento de consultas por especialidade, data e hora. Permite a alteração de status (Agendada, Confirmada, Realizada, Cancelada). |
| **Gestão de Funcionários** | Cadastro, edição e exclusão de colaboradores, com vínculo obrigatório ao seu cargo. |
| **Gestão de Cargos** | Criação e manutenção da estrutura organizacional, definindo nome, salário e descrição de cada cargo. |
| **Auditoria** | Módulo de segurança que registra detalhadamente todas as ações (CRUD) realizadas no sistema, garantindo rastreabilidade e conformidade. |

---

## 🎯 Quickstart — Execução Rápida com Docker

A maneira mais fácil de testar o sistema é utilizando o Docker Compose, que irá configurar e iniciar o banco de dados, a API e o frontend automaticamente.

### 📋 Pré-requisitos

Você precisa ter o **Docker** e o **Docker Compose** instalados em sua máquina.

### ▶️ Passo a Passo

#### 1️⃣ Clonar o repositório
# 1. Clonar o repositório
```bash
git clone https://github.com/RodrigoTechieX/MedCore-Sistema.git
```

#### 2️⃣ Entrar na pasta correta (respeitando o hífen )

```bash
cd MedCoreSistema
```

#### 3️⃣ Lembre que o Docker desktop deve estar aberto antes de executar o comando do passo 4 !


#### 4️⃣ Subir toda a aplicação

Execute o comando abaixo no diretório raiz do projeto. O Docker Compose irá construir as imagens e iniciar os três serviços (DB, API e Frontend).

```bash
docker compose up -d
```

#### 5️⃣Verificar se está rodando 


```bash
docker compose ps
```

Aguarde alguns segundos até que todos os containers estejam prontos.
---

## 🌐 Acessos do Sistema

Após a inicialização, o sistema estará acessível nos seguintes endereços:

- **Frontend (Interface Web):**
  👉 [http://localhost:8080](http://localhost:8080)

- **Backend (API Flask):**
  👉 [http://localhost:5000](http://localhost:5000)

---

## 🧱 Banco de Dados (MySQL)

O banco de dados é inicializado automaticamente na primeira execução, utilizando o script de criação de tabelas.

### 🔐 Credenciais Padrão

| Parâmetro | Valor |
| :--- | :--- |
| **Usuário** | `root` |
| **Senha** | `root` |
| **Banco** | `medcore` |
| **Host** | `db` (para conexão entre containers) |
| **Porta** | `3306` |

### 🔄 Recriar o Banco do Zero

Para limpar todos os dados e recriar o banco de dados:

```bash
docker compose down -v
docker compose up -d
```

---

## 🧪 Como Testar a API (Exemplos cURL)

Você pode testar as rotas da API diretamente usando ferramentas como cURL, Postman ou Insomnia.

| Rota | Método | Descrição | Exemplo cURL |
| :--- | :--- | :--- | :--- |
| `/api/cargos` | `GET` | Lista todos os cargos. | `curl http://localhost:5000/api/cargos` |
| `/api/funcionarios` | `GET` | Lista todos os funcionários. | `curl http://localhost:5000/api/funcionarios` |
| `/api/pacientes` | `GET` | Lista todos os pacientes. | `curl http://localhost:5000/api/pacientes` |
| `/api/consultas` | `GET` | Lista todas as consultas. | `curl http://localhost:5000/api/consultas` |
| `/api/auditoria` | `GET` | Lista os registros de auditoria. | `curl http://localhost:5000/api/auditoria` |

---

## 👨‍💻 Autor

**[Seu Nome Completo]**

📧 **Email:** [contato.rodrigo.tech@gmail.com](contato.rodrigo.tech@gmail.com)

🔗 **LinkedIn:** [https://www.linkedin.com/in/rodrigo-ferreira-325527272/](https://www.linkedin.com/in/rodrigo-ferreira-325527272/)

---

## 📝 Licença

Este projeto está sob a licença **MIT**. Sinta-se à vontade para usar, modificar e distribuir.
