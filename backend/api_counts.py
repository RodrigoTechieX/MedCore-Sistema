
import os
from flask import Flask, jsonify
from flask_cors import CORS
import pymysql

app = Flask(__name__)
CORS(app)  #permite chamadas no front 

# lê variáveis de ambiente para facilitar o uso em Docker ou local
DB_HOST = os.environ.get('DB_HOST', 'db')       # padrão 'db' (quando Flask estiver em outro container)
DB_USER = os.environ.get('DB_USER', 'root')
DB_PASS = os.environ.get('DB_PASS', 'root')
DB_NAME = os.environ.get('DB_NAME', 'medcore')
DB_PORT = int(os.environ.get('DB_PORT', 3306))

def get_conn():
    return pymysql.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASS,
        db=DB_NAME,
        port=DB_PORT,
        charset='utf8mb4',
        cursorclass=pymysql.cursors.DictCursor
    )

@app.route('/api/counts', methods=['GET'])
def counts():
    try:
        conn = get_conn()
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS total FROM relatorios")
            row = cur.fetchone()
            relatorios_count = int(row['total']) if row and 'total' in row else 0
        return jsonify({'relatorios': relatorios_count})
    except Exception as e:
        # para debug rápido, retornamos mensagem de erro no JSON (em produção trate melhor)
        return jsonify({'error': str(e)}), 500
    finally:
        try:
            conn.close()
        except:
            pass

if __name__ == '__main__':
    # roda acessível na rede (0.0.0.0) para uso com Docker ou para ser chamado de outro host
    app.run(host='0.0.0.0', port=5000, debug=True)

