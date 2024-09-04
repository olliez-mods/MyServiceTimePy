from flask import Flask, send_from_directory, request, jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

import time
import jwt
import jwt.utils
import sqlFunctions as SQL_F
import iniParser as INI
from datetime import datetime
import re

# INI file =============================================================
ini_file = INI.load_data_from_file("config.ini")
s_key = ini_file.get("secrete_key", "myservicetime-SECRETE")
token_exp_time = ini_file.get("token_exp_time", 3600)
db_path = ini_file.get("db_path", "myservicetime.db")
cert_path = ini_file.get("cert_file_path", "./cert.pem")
key_path = ini_file.get("key_file_path", "./key.pem")
server_port = ini_file.get("port", 80)
run_as_secure = ini_file.get("run_as_secure", False)
use_redirection_server = ini_file.get("use_redirection_server", False)
redirection_listen = ini_file.get("redirection_listen_port", 80)
redirection_send = ini_file.get("redirection_send_port", 443)
redirect_prefix = ini_file.get("redirect_prefix", "https://")
rate_limit_per_hour = ini_file.get("rate_limit_per_hour", 120)
rate_limit_per_day = ini_file.get("rate_limit_per_day", 250)
# ======================================================================

# Redirection server ===================================================
if(use_redirection_server):
    print("=============================\nStarting redirection server")
    redirection_app = Flask(__name__)
    import threading
    from flask import redirect
    @redirection_app.route('/', defaults={'path':''})
    @redirection_app.route('/<path:path>')
    def redirect_to_new_port(path):
        # If the prefix is a standard and the port iven matches that, we don't need to add it
        need_port = (redirect_prefix == "http://" and redirection_send != 80) or (redirect_prefix == "https://" and redirection_send != 443)
        port_str = f":{redirection_send}" if need_port else ""
        redirect_url = f"{redirect_prefix}{request.host.split(':')[0]}{port_str}/{path}"
        return redirect(redirect_url, code=301)
    def run_redirect_server():
        redirection_app.run(host='0.0.0.0', port=redirection_listen)
    # start redurect server in a seperate thread
    redirect_app_thread = threading.Thread(target=run_redirect_server)
    redirect_app_thread.daemon = True
    redirect_app_thread.start()
    print("=============================")
    print("Starting Main server:")
# ======================================================================

app = Flask(__name__)

SECRET_KEY = s_key

# Not used in the program
tokens = []

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=[f"{rate_limit_per_day} per day", f"{rate_limit_per_hour} per hour"]
)

def generate_token(user_id:int) -> str:
    exp_time = int(time.time()) + token_exp_time       # 1 hour
    token = jwt.encode({'user_id': user_id, 'exp': exp_time}, SECRET_KEY, algorithm='HS256')
    tokens.append(token)
    return token

def is_token_valid(token:str) -> bool:
    try:
        jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return True
    except jwt.ExpiredSignatureError:
        # Token has expired
        return False
    except jwt.InvalidTokenError:
        # Token is invalid
        return False

def get_id_from_token(token:str) -> int:
    if(is_token_valid(token)):
        decoded_token = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return decoded_token.get('user_id')
    return None

@app.route('/')
def serve_index():
    return send_from_directory('public', 'index.html')

@app.route('/<path:path>')
def serve_file(path):
    return send_from_directory('public', path)

def filter_string(string) -> str:
    """
    Filter out scary charecters
    """
    try:
        if(string == None): return None
        pattern = r'[^a-zA-Z0-9\s@#$%^&*()_+!\-=\[\]{};:\'",.|<>\/?]'
        return re.sub(pattern, '', string)
    except Exception as e:
        print(e)
        return None

@app.route('/api/create_account', methods=['POST'])
def api_create_account():
    email = filter_string(request.json.get('email', None))
    email = email.lower()
    pass_hash = filter_string(request.json.get('pass_hash', None))

    if(not email): return jsonify({"error":"email not provided", "code":"771"}), 400
    if(not pass_hash): return jsonify({"error":"pass_hash not provided", "code":"989"}), 400

    existing_account = SQL_F.get_user_with_email(email)

    if(existing_account != None): return jsonify({"error":"An existing account exists with that email", "msg":"Email taken", "code":"989"}), 400
    if(len(email) <= 4): return jsonify({"error":"Email is too short, must be at least length 5", "msg":"Email too short", "code":"166"}), 400
    if(len(pass_hash) <= 5): return jsonify({"error":"Password hash is too short. It should NEVER be shorter then 6 chars","code":"653"}), 400

    SQL_F.create_user(email, pass_hash)
    return jsonify({"success":"account was created successfully"}), 200

@app.route('/api/login', methods=['POST'])
def api_login():
    email = filter_string(request.json.get('email', None))
    email = email.lower()
    pass_hash = filter_string(request.json.get('pass_hash', None))

    if(not email): return jsonify({"error":"email not provided", "code":"834"}), 400
    if(not pass_hash): return jsonify({"error":"pass_hash not provided", "code":"291"}), 400

    user = SQL_F.get_user_with_email(email)

    if(not user): return jsonify({"error":"No user found with the email provided", "msg":"Email not found", "code":"186"}), 400

    user_pass_hash = user['pass_hash']
    user_id = user['id']

    if(pass_hash != user_pass_hash): return jsonify({"error":"The hash provided does not match our systems","msg":"Password incorrect","code":"773"}), 400

    # At this point, the email and password are correct
    token = generate_token(user_id)
    print(f"User logged in '{email}'")
    return jsonify({"token":token}), 200

@app.route('/api/validate_token', methods=['POST'])
def api_validate_token():
    token = filter_string(request.headers.get('token', None))

    if(not token): return jsonify({"error":"Token was not provided", "code":"139"}), 400

    # TODO: Different error message for never created token vs. expired
    if(not is_token_valid(token)): return jsonify({"error":"Token is invalid", "code":"055"}), 400

    return jsonify({"success":"Token is valid"}), 200
    
@app.route('/api/get_time', methods=['POST'])
def api_get_time():
    token = filter_string(request.headers.get('token', None))

    if(not token): return jsonify({"error":"Token was not provided", "code":"574"}), 400

    if(not is_token_valid(token)): return jsonify({"error":"Token is not valid", "code":"510"}), 400

    user_id = get_id_from_token(token)

    user_time_rows = SQL_F.get_time(user_id)
    time_formatted = []

    if(user_time_rows):
        for r in user_time_rows:
            row = dict(r)
            time_formatted.append({
                "minutes":row.get('minutes', 0),
                "placements":row.get('placements',0),
                "date":row.get('date','0000-00-00'),
                "note":row.get('note','')
            })
    
    return jsonify({"time":time_formatted}), 200

def is_date_valid(date_string:str) -> bool:
    """
    returns tru if string is in format YYYY-MM-DD
    """
    try:
        datetime.strptime(date_string, '%Y-%m-%d')
        return True
    except ValueError:
        return False

@app.route('/api/add_time', methods=['POST'])
def api_add_time():
    token = filter_string(request.headers.get('token', None))
    if(not token): return jsonify({"error":"Token was not provided", "code":"130"}), 400
    if(not is_token_valid(token)): return jsonify({"error":"Token is invalid", "code":"823"}), 400

    # TODO validate user_id
    user_id = get_id_from_token(token)

    time_slot:dict = request.json.get('time', None)

    if(not time_slot): return jsonify({"error":"Time information was not provided", "code":"609"}), 400

    try:
        minutes = int(time_slot.get('minutes', 0))
        placements = int(time_slot.get('placements', 0))
        date = filter_string(time_slot.get('date', None))
        note = str(filter_string(time_slot.get('note', '')))
    except (ValueError, TypeError) as e:
        print(e)
        return jsonify({"error":"Exception caught handling data sent", "exception":str(e), "code":"139"}), 400 
    
    # Confirm date is provided and is in correct format
    if(not date): return jsonify({"error":"Date was not provided in time object", "code":"992"}), 400
    date = str(date)
    if(not is_date_valid(date)): return jsonify({"error":"Date must be provided in format YYYY-MM-DD", "code":"435"}), 400

    # Make sure there are no other records for today
    existing_time_on_date = SQL_F.get_time_by_date(user_id, date)
    if(existing_time_on_date != None): return jsonify({"error":"Given date already has a time record", "code":"561"}), 400

    try:
        # All data we have is valid, token is valid, date is empty... time to add it to our database
        result = SQL_F.add_time_to_user(user_id, minutes, placements, date, note)
    except OverflowError:
        return jsonify({"error":"A value was too large to be used", "code":"110"}), 400

    # TODO confirm that it was really added
    return jsonify({"success":"Time was inserted into our database"}), 200

@app.route('/api/remove_time', methods=['POST'])
def api_remove_time():
    token = filter_string(request.headers.get('token', None))

    if(not token): return jsonify({"error":"Token was not provided", "code":"184"}), 400
    if(not is_token_valid(token)): return jsonify({"error":"Token is invalid", "code":"099"}), 400

    user_id = get_id_from_token(token)

    date = request.json.get('date', None)
    # Confirm date is provided and is in correct format
    if(not date): return jsonify({"error":"Date was not provided", "code":"543"}), 400
    date = str(date)
    if(not is_date_valid(date)): return jsonify({"error":"Date must be provided in format YYYY-MM-DD", "code":"712"}), 400

    current_times = SQL_F.get_time_by_date(user_id, date)

    if(current_times == None): return jsonify({"error":"No time is recorded on the given date", "code":"431"}), 400

    result = SQL_F.remove_time_by_date(user_id, date)
    return jsonify({"success":"Removed all records for the givin date"}), 200

@app.route('/api/clear_time', methods=['POST'])
def api_clear_time():
    token = filter_string(request.headers.get('token', None))

    if(not token): return jsonify({"error":"Token was not provided", "code":"532"}), 400
    if(not is_token_valid(token)): return jsonify({"error":"Token is invalid", "code":"989"}), 400

    user_id = get_id_from_token(token)
    SQL_F.remove_all_time(user_id)
    return jsonify({"success":"Cleared all time"}), 200

if __name__ == "__main__":
    SQL_F.set_db(db_path)
    SQL_F.setup_db()

    # Don't provide ssl certificate if we don't want to
    ssl_context = (cert_path, key_path) if run_as_secure else None
    app.run(ssl_context=ssl_context, host='0.0.0.0', port=server_port)