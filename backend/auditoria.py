from database.connection import get_db

def registrar_auditoria(usuario, modulo, acao, detalhes):
    conn = get_db()
    cursor = conn.cursor()

    sql = """
        INSERT INTO auditoria (usuario, modulo, acao, detalhes)
        VALUES (%s, %s, %s, %s)
    """
    cursor.execute(sql, (usuario, modulo, acao, detalhes))
    conn.commit()
