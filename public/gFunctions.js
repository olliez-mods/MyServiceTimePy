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

// Backgrounds shown on the login / sign up pages
const BACKGROUND_IMAGES = ['https://wol.jw.org/en/wol/mp/r1/lp-e/mwb21/2021/868',
                           'https://wol.jw.org/pis/wol/mp/r103/lp-sp/mwb19/2019/1009',
                           'https://wol.jw.org/en/wol/mp/r1/lp-e/mwb16/2016/621',
                           'https://wol.jw.org/en/wol/mp/r1/lp-e/rr/2018/257',
                           'https://wol.jw.org/pis/wol/mp/r103/lp-sp/mwb19/2019/189',
                           'https://wol.jw.org/sfs/wol/mp/r443/lp-sas/mwb18/2018/762',
                           'https://wol.jw.org/en/wol/mp/r1/lp-e/yb17/2017/307'];

function apply_background(url){
    document.body.style.backgroundImage = `url("${url}")`;
}

// Picks a random background, avoiding `avoid`, and only applies it once the image
// has really loaded. Dead links are skipped so we never end up with a blank page.
function set_random_background(avoid=null){
    let pool = BACKGROUND_IMAGES.filter(url => url != avoid);
    if(pool.length == 0) pool = BACKGROUND_IMAGES.slice();

    function attempt(){
        if(pool.length == 0) return; // Everything failed, leave the plain background
        const url = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        const img = new Image();
        img.onload = function(){
            localStorage.setItem("lastImage", url);
            apply_background(url);
        };
        img.onerror = attempt;
        img.src = url;
    }
    attempt();
}

// Re-uses the last background so it stays put between the login and sign up pages,
// falling back to a new one if that link has since died.
function set_saved_background(){
    const url = localStorage.getItem("lastImage");
    if(!url){
        set_random_background();
        return;
    }
    const img = new Image();
    img.onload = function(){ apply_background(url); };
    img.onerror = function(){ set_random_background(url); };
    img.src = url;
}
