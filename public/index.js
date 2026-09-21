function set_info_text(text){
    document.getElementById("regInfo").innerText = text;
}

let token = localStorage.getItem("token");

if(token){
    sendPOST({}, "validate_token", token).then(({status, ok, data}) => {
        if(ok){
            window.location.replace("addHours.html");
        }else{
            localStorage.removeItem("token");
        }
    });
}

let button = document.getElementById("enterButton");
button.addEventListener("click", async function(){
    email = document.getElementById("inputEmail").value;
    password = document.getElementById("inputPass").value;

    if (!str_has_content(email) || !str_has_content(password)) {
        set_info_text("Please fill in all fields", "#f5020b");
        return;
    }

    pass_hash = await hashPassword(password);

    data_out = {'email':email, 'pass_hash':pass_hash};
    sendPOST(data_out, "login").then(({status, ok, data}) => {
        if(ok){
            localStorage.setItem("token", data["token"]);
            set_info_text("");
            window.location.replace("addHours.html");
            return;
        }

        if('msg' in data){
            set_info_text(data['msg']);
        }else{
            set_info_text("Error logging in");
            alert(JSON.stringify(data));
            console.log("Error logging in\n", status, data);
        }
    });
});


if(localStorage.getItem("traveldedToLogin") == "true"){
    set_saved_background();
}else{
    set_random_background(localStorage.getItem("lastImage"));
}
localStorage.setItem("traveldedToLogin", "false");