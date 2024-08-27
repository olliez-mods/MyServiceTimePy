
imageURL = localStorage.getItem("lastImage");
document.body.style.backgroundImage = `URL(${imageURL})`

let account_created_freeze = false

let hrefLink = document.getElementById("hrefLink");
hrefLink.addEventListener("click", function(){
    localStorage.setItem("traveldedToLogin", "true");
});

function set_info_text(text, color){
    document.getElementById("regInfo").style.color = color;
    document.getElementById("regInfo").innerText = text;
}

let button = document.getElementById("enterButton");
button.addEventListener("click", async function(){

    // If we just created an account within the last couple seconds, don't try and send again
    if(account_created_freeze) return;

    let email = document.getElementById("inputEmail").value;
    let password1 = document.getElementById("inputPass").value;
    let password2 = document.getElementById("inputPassCon").value;

    if (!str_has_content(email) || !str_has_content(password1) || !str_has_content(password2)) {
        set_info_text("Please fill in all fields", "#f5020b");
        return;
    }
    if (password1 !== password2) {
        set_info_text("Passwords do not match", "#f5020b");
        return;
    }
    if(password1.length <= 6){
        set_info_text("Password length must be more then 6", "#f5020b");
        return;
    }

    let pass_hash = await hashPassword(password1);
    let data_out = { 'email':email, 'pass_hash':pass_hash };
    let r = sendPOST(data_out, "create_account").then(({status, ok, data}) => {
        // If we created the account do this ->
        if(ok){
            set_info_text("Account created, redirecting to login", "#058015")
            account_created_freeze = true;
            setTimeout(() => {
                account_created_freeze = false;
                window.location.replace("index.html");
            }, 2000);
            return;
        }
        // If account creation failed ->
        if("msg" in data){
            set_info_text(`${data['msg']}`, "#f5020b");
        }else{
            set_info_text("Error creating account", "#f5020b");
            alert(JSON.stringify(data));
            console.log("Error creating account, got response form server:\n", data)
        }
    });
});