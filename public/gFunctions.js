async function sendPOST(data, event, token=null){
    const url = `${window.location.origin}/api/${event}`;
    // Send a POST request to the server
    const response = await fetch(url, {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'token':token,
            'Content-Type': 'application/json',
            'postevent' : 'true'
        },
        mode:'cors',
        body: JSON.stringify(data)
    });

    const j_data = await response.json();
    return {status:response.status, ok:response.ok, data:j_data}
}

const PASSWORD_SALT = "myservicetime";

async function hashPassword(password, salt=PASSWORD_SALT) {
    const encoder = new TextEncoder();
    const passwordData = encoder.encode(password);
    const saltData = encoder.encode(salt);
    
    // Combine the password and salt
    const passwordSalt = new Uint8Array([...passwordData, ...saltData]);

    // Hash the combined password and salt using SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', passwordSalt);

    // Convert the hash to a hex string for easy transmission
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
}

function str_has_content(str){
    return str !== null && str !== undefined && str.length > 0;
}