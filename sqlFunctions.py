import sqlite3
import threading
from typing import Any, List, Optional

DATABASE = "database.db"
lock = threading.Lock()

class User:
    def __init__(self, id:int, email:str, pass_hash:str):
        self.id = id
        self.email = email
        self.pass_hash = pass_hash

    @staticmethod
    def from_row(row: sqlite3.Row) -> 'User':
        return User(
            id=row['id'],
            email=row['email'],
            pass_hash=row['pass_hash']
        )

class TimeEntry:
    def __init__(self, user_id:int, minutes:int, placements:int, date:str, note:str, is_credit:bool=False):
        self.user_id = user_id
        self.minutes = minutes
        self.placements = placements
        self.date = date
        self.note = note
        self.is_credit = is_credit

    @staticmethod
    def from_row(row: sqlite3.Row) -> 'TimeEntry':
        return TimeEntry(
            user_id=row['user_id'],
            minutes=row['minutes'],
            placements=row['placements'],
            date=row['date'],
            note=row['note'],
            is_credit=row['is_credit']
        )

def set_db(name:str) -> None:
    global DATABASE
    DATABASE = name

def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DATABASE, timeout=30.0)  # Increase timeout to 30 seconds
    conn.row_factory = sqlite3.Row
    return conn

def setup_db() -> None:
    conn:sqlite3.Connection = get_db()
    cursor = conn.cursor()

    # Set up tables if they don't exist

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL UNIQUE,
            pass_hash TEXT NOT NULL
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS time (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            minutes INTEGER,
            placements INTEGER,
            date DATE NOT NULL,
            note TEXT,
            is_credit INTEGER DEFAULT 0, -- 0 for False, 1 for True
            removed INTEGER DEFAULT 0, -- 0 for False, 1 for True
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')

    cursor.close()
    conn.close()

def db_read(query: str, params: Optional[tuple] = None) -> List[sqlite3.Row]:
    with lock:  # Add thread safety to reads (previously missing)
        conn:sqlite3.Connection = get_db()
        cursor = None
        try:
            cursor = conn.cursor()
            cursor.execute(query, params)
            result = cursor.fetchall()

            if(not result): return None
            return result

        except sqlite3.OperationalError as e:
            print(f"Database read error: {e}")
            return None
        finally:
            if(cursor): cursor.close()
            if(conn): conn.close()


def db_write(query: str, params: Optional[tuple] = None) -> int:
    with lock:
        conn:sqlite3.Connection = get_db()
        cursor = None
        try:
            cursor = conn.cursor()
            cursor.execute(query, params)
            conn.commit()
            return cursor.lastrowid
        finally:
            if(cursor): cursor.close()
            if(conn): conn.close()

def create_user(email:str, pass_hash:str):
    """
    Creates a new user, with an email and password hash
    """
    q = 'INSERT INTO users (email, pass_hash) VALUES (?, ?)'
    return db_write(q, (email, pass_hash))

def get_user_with_email(email:str) -> User|None:
    """
    Returns the user given their email
    """
    q = 'SELECT id, email, pass_hash FROM users WHERE email = ? LIMIT 1'
    r = db_read(q, (email,))
    if(r): return User.from_row(r[0])
    return None

def get_user_with_id(id:int) -> User|None:
    """
    Returns a user given its id
    """
    q = 'SELECT id, email, pass_hash FROM users WHERE id = ? LIMIT 1'
    r = db_read(q, (id,))
    if(r): return User.from_row(r[0])
    return None

def get_users_with_pass_hash(pass_hash:str) -> List[User]:
    """
    Returns users with the given password hash
    """
    q = 'SELECT id, email, pass_hash FROM users WHERE pass_hash = ?'
    r = db_read(q, (pass_hash,))
    if(r): return [User.from_row(row) for row in r]
    return []

def update_user_email(id:int, n_email:str):
    """
    Updates an existing users email address
    """
    q = "UPDATE users SET email = ? WHERE id = ?"
    return db_write(q, (n_email, id))

def update_user_hash(id:int, n_pass_hash:str):
    """
    Updates an existing users password hash
    """
    q = "UPDATE users SET pass_hash = ? WHERE id = ?"
    return db_write(q, (n_pass_hash, id))

def add_time_to_user(user_id:int, minutes:int, placements:int, date:str, note:str, is_credit:bool=False):
    """
    Adds a time connected to a user:
    Note: date should be in 'YYYY-MM-DD' format
    """
    print(f"Adding time for user {user_id} on {date} with {minutes} minutes and {placements} placements, is_credit={is_credit}")
    q = 'INSERT INTO time (user_id, minutes, placements, date, note, is_credit) VALUES (?, ?, ?, ?, ?, ?)'
    return db_write(q, (user_id, minutes, placements, date, note, is_credit))

def get_time(user_id:int) -> List[TimeEntry]:
    """
    Returns all active time of a user
    """
    q = 'SELECT * FROM time WHERE user_id = ? AND removed = 0'
    r = db_read(q, (user_id,))
    if(r): return [TimeEntry.from_row(row) for row in r]
    return []

def get_all_time(user_id:int) -> List[TimeEntry]:
    """
    Returns all time (removed and active) of a user
    """
    q = 'SELECT * FROM time WHERE user_id = ?'
    r = db_read(q, (user_id,))
    if(r): return [TimeEntry.from_row(row) for row in r]
    return []

def get_all_time_by_date(user_id:int, date:str) -> List[TimeEntry]:
    """
    Returns all time on a given date
    """
    q = 'SELECT * FROM time WHERE user_id = ? AND date = ?'
    r = db_read(q, (user_id, date))
    if(r): return [TimeEntry.from_row(row) for row in r]
    return []

def get_time_by_date(user_id:int, date:str) -> List[TimeEntry]:
    """
    Returns time on a given date
    """
    q = 'SELECT * FROM time WHERE user_id = ? AND date = ? AND removed = 0'
    r = db_read(q, (user_id, date))
    if(r): return [TimeEntry.from_row(row) for row in r]
    return []

def get_removed_time(user_id:int) -> List[TimeEntry]:
    """
    Returns all removed time of a user
    """
    q = 'SELECT * FROM time WHERE user_id = ? AND removed = 1'
    r = db_read(q, (user_id,))
    if(r): return [TimeEntry.from_row(row) for row in r]
    return []

def perm_delete_time_by_id(id:int):
    """
    PERMENENTLY remove a time slot based on its id
    """
    q = "DELETE FROM time WHERE id = ?"
    return db_write(q, (id,))

def remove_time_by_id(id:int):
    """
    Remove a time slot based on its id
    """
    q = "UPDATE time SET removed = 1 WHERE id = ?"
    return db_write(q, (id,))

def perm_delete_user_time_by_date(user_id:int, date:str):
    """
    PERMENENTLY remove all time logs of a user for a specific day (must be formatted YYYY-MM-DD)
    """
    q = "DELETE FROM time WHERE user_id = ? AND date = ?"
    return db_write(q, (user_id, date))

def remove_time_by_date(user_id:int, date:str):
    """
    Removes all time logs of a user for a specific day (must be formatted YYYY-MM-DD)
    """
    q = "UPDATE time SET removed = 1 WHERE user_id = ? AND date = ?"
    return db_write(q, (user_id, date))

def remove_all_time(user_id:int):
    """
    Removes all time by a user
    """
    q = "UPDATE time SET removed = 1 WHERE user_id = ?"
    return db_write(q, (user_id,))

def perm_delete_all_time(user_id:int):
    """
    PERMENENTLY removes all time of a user
    """
    q = "DELETE FROM time WHERE user_id = ?"
    return db_write(q, (user_id,))