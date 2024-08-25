
imageURL = localStorage.getItem("lastImage");
document.body.style.backgroundImage = `URL(${imageURL})`

let hrefLink = document.getElementById("hrefLink");
hrefLink.addEventListener("click", function(){
    localStorage.setItem("traveldedToLogin", "true");
});


let button = document.getElementById("enterButton");
button.addEventListener("click", function(){
    if(document.getElementById("inputPass").value == document.getElementById("inputPassCon").value){

        sendPOST({
        event:"newUser",
        name:document.getElementById("inputName").value,
        pass:document.getElementById("inputPass").value
        }).then(response => {
            if(response.status == "success"){
                document.getElementById("regInfo").style.color = "#058015";
                document.getElementById("regInfo").innerText = "Account created";
                window.location.replace("index.html");
            }else if(response.status == "failed"){
                console.log(response.reason);
                document.getElementById("regInfo").style.color = "#f5020b";
                document.getElementById("regInfo").innerText = "Error: " + response.reason;
            }
        });
    }else{
        document.getElementById("regInfo").style.color = "#f5020b";
        document.getElementById("regInfo").innerText = "Error creating account: Passwords do not match";
    }
});