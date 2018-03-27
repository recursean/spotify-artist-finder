import mysql.connector

def connect_to_database(config):
    print("Connecting to database...")
    try:
        conn = mysql.connector.connect(**config)
    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_ACCESS_DENIED_ERROR:
            print("ACCESS DENIED TO DATABASE")
        elif err.errno == errorcode.ER_BAD_DB_ERROR:
            print("DATABASE DOES NOT EXIST")
        else:
            print(err)
    else:
        print("Connected to database");
        return conn

config = {
    'user': 'root',
    'password': '6ThpY6TgW2/',
    'host': 'localhost',
    'port': '3306',
    'database': 'spotify_artist_finder_db',
    'raise_on_warnings': True
}

conn = connect_to_database(config)
cursor = conn.cursor()

cursor.execute("select ")
conn.commit()

conn.close()
