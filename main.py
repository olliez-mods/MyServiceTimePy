from flask import Flask, send_from_directory, request, jsonify
import time
import jwt
import jwt.utils
import sqlFunctions as SQL_F
from datetime import datetime
import re

app = Flask(__name__)

SECRET_KEY = 'my-secrete-key'

# Not used in the program
tokens = []

def generate_token(user_id:int) -> str:
    exp_time = int(time.time()) + 3600       # 1 hour
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
    SQL_F.set_db("myservicetime.db")
    SQL_F.setup_db()
    app.run(debug=True)