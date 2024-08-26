from flask import Flask, send_from_directory, request, jsonify
import time
import jwt
import jwt.utils
import sqlFunctions as SQL_F

app = Flask(__name__)

SECRET_KEY = 'my-secrete-key'

# Not used in the program
tokens = []

def generate_token(user_id:int) -> str:
    exp_time = int(time.time()) + 1800
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

@app.route('/api/login', methods=['POST'])
def api_login():
    email = request.json.get('email', None)
    pass_hash = request.json.get('pass_hash', None)

    if(not email): return jsonify({"error":"email not provided", "code":"834"}), 400
    if(not pass_hash): return jsonify({"error":"pass_hash not provided", "code":"291"}), 400

    user = SQL_F.get_user_with_email(email)

    if(not user): return jsonify({"error":"No user found with the email provided", "msg":"Email not found", "code":"186"}), 401

    user_pass_hash = user['pass_hash']

    if(pass_hash != user_pass_hash): return jsonify({"error":"The hash provided does not match our systems","msg":"Password incorrect","code":"773"}), 401

    # At this point, the email and password are correct
    token = generate_token(email)
    print(f"User logged in '{email}'")
    return jsonify({"token":token}), 200

@app.route('/api/validate_token', methods=['POST'])
def api_validate_token():
    token = request.json.get('token', None)

    if(not token): return jsonify({"error":"Token was not provided", "code":"139"}), 400

    # TODO: Different error message for never created token vs. expired
    if(not is_token_valid(token)): return jsonify({"error":"Token is invalid", "code":"055"}), 401

    return jsonify({"success":"Token is valid"}), 200
    
@app.route('/api/get_time', methods=['POST'])
def api_get_time():
    token = request.json.get('token', None)

    if(not token): return jsonify({"error":"Token was not provided", "code":"574"}), 400

    if(not is_token_valid(token)): return jsonify({"error":"Token is not valid", "code":"510"}), 401

    user_id = get_id_from_token(token)

    user_time_rows = SQL_F.get_time(user_id)
    time_formatted = []
    for r in user_time_rows:
        time_formatted.append({
            "minutes":r.get('minutes', 0),
            "placements":r.get('placements',0),
            "date":r.get('date','0000-00-00'),
            "note":r.get('note','')
        })
    
    return jsonify({"time":time_formatted}), 200

@app.route('/api/add_time', methods=['POST'])
def api_add_time():
    pass

@app.route('/api/remove_time', methods=['POST'])
def api_remove_time():
    pass

@app.route('/api/clear_time', methods=['POST'])
def api_clear_time():
    pass

if __name__ == "__main__":
    SQL_F.set_db("myservicetime.db")
    SQL_F.setup_db()
    app.run(debug=True)