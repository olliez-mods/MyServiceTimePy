from flask import Flask, send_from_directory, request, jsonify
import time
import jwt
import jwt.utils
import sqlFunctions as SQL_F

app = Flask(__name__)

SECRET_KEY = 'my-secrete-key'

tokens = {}

def generate_token(email) -> str:
    exp_time = int(time.time()) + 1800
    token = jwt.encode({'email': email, 'exp': exp_time}, SECRET_KEY, algorithm='HS256')
    tokens[token] = exp_time
    return token

def is_token_valid(token) -> bool:
    current_time = int(time.time)
    return (token in tokens and tokens[token] > current_time)

@app.route('/')
def serve_index():
    return send_from_directory('public', 'index.html')

@app.route('/<path:path>')
def serve_file(path):
    return send_from_directory('public', path)

@app.route('/api/login', methods=['POST'])
def login():
    email = request.json.get('email', None)
    pass_hash = request.json.get('pass_hash', None)

    if(not email): return jsonify({"error":"email not provided"}), 401
    if(not pass_hash): return jsonify({"error":"pass_hash not provided"}), 401

    user = SQL_F.get_user_with_email(email)

    if(not user): return jsonify({"error":"No user found with the email provided", "msg":"Email not found"}), 401

    user_pass_hash = user['pass_hash']

    if(pass_hash != user_pass_hash): return jsonify({"error":"The hash provided does not match our systems","msg":"Password incorrect"}), 401

    # At this point, the email and password are correct
    token = generate_token(email)

    print(f"User logged in '{email}'")

    return jsonify({"token":token}), 201

if __name__ == "__main__":
    app.run(debug=True)