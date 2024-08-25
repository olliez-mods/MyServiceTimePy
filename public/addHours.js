let token = localStorage.getItem("token");

document.getElementById("inputDate").valueAsDate = new Date();

function setZeroIfInvalid(obj){
    if(!obj.checkValidity()){
        obj.value = 0
    }
}

function clearTokenAndReturn(){
    localStorage.setItem("token", "");
    window.location.replace("index.html");
}

function removeDay(index){
    sendPOST({
        event:"removeDay",
        index:index,
        token:token
    }).then(response => {
        if(response.status == "success"){
            getHours();
        }else if(response.status == "failed" && response.reason == "invalidToken"){
            clearTokenAndReturn();
        }
    });
}

function getHours(){
    sendPOST({
        event:"getHours",
        token:token
    }).then(respose => {
            if(respose.status == "success"){
                let time = respose.time;

                let totalHours = 0;
                let totalMinutes = 0;
                let totalPlacements = 0;
            
                let daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
                
                let HTML = "";
                time.forEach((day, index) => {
                    totalHours += day["hours"];
                    totalMinutes += day["minutes"];
                    totalPlacements += day["placements"];
                    let date = new Date(day["date"]);
                    let dateStr = daysOfWeek[date.getUTCDay()] + ", " + date.getUTCDate();
                    let fileDis = 
                    `
                    <div class="dateBox">
                    <img src="close.png" onClick="removeDay(${index})" class="xButtonImg">
                            <H2 style="margin-top:0px; text-align: center;">${dateStr}</H2>
                            <H3 class="dateInfo">Time: ${day["hours"]}:${day["minutes"]}</H3>
                            <H3 class="dateInfo">Placements: ${day["placements"]}</H3>
                            <H4 class="dateInfo" style="word-wrap: break-word;">${day["notes"]}<H4>
                            
                  </div>`;
                    HTML = fileDis + HTML;
                });
            
                while(totalMinutes >= 60){
                    totalMinutes -= 60;
                    totalHours++;
                }
            
                document.getElementById("time").innerHTML = HTML;
                document.getElementById("totalTime").innerHTML = 
                `
                <div>
                <h1>Time: ${totalHours}:${totalMinutes}<br>Placements: ${totalPlacements}</h1>
                </div>
                `;
            }else if(response.status == "failed"){
                if(response.reason == "invalid token"){
                    clearTokenAndReturn();
                }
            }
    });
}

function CheckToken(){
    sendPOST({
        event:"checkToken",
        token:token
    }).then(respose => {
            if(respose.status == "failed"){
                clearTokenAndReturn();
            }
    });
}

function addHours(){
    setZeroIfInvalid(document.getElementById("inputHours"));
    setZeroIfInvalid(document.getElementById("inputMinutes"));
    setZeroIfInvalid(document.getElementById("inputPlacements"));

    sendPOST({
        event:"addHours",
        token:token,
        "hours":parseInt(document.getElementById("inputHours").value),
        "minutes":parseInt(document.getElementById("inputMinutes").value),
        "date":document.getElementById("inputDate").value,
        "placements":parseInt(document.getElementById("inputPlacements").value),
        "notes": document.getElementById("inputNote").value,
    }).then(response => {
        if(response.status != "success"){
            if(response.reason == "invalid token"){
                clearTokenAndReturn();
            }
        }else{
        document.getElementById("inputHours").value = "";
        document.getElementById("inputMinutes").value = "";
        document.getElementById("inputDate").valueAsDate = new Date();
        document.getElementById("inputPlacements").value = "";
        document.getElementById("inputNote").value = "";
        }
    });

    setTimeout(getHours(), 1000);
}

function clearHous(){
    sendPOST({
        event:"clearHours",
        token:token
    }).then(response => {
        if(response.status == "success"){
            getHours();
        }if(response.status == "failed" && response.reason == "invalid token"){
            clearTokenAndReturn();
        }
    });
getHours();
}

if(token){

    CheckToken();
    getHours();

    let button = document.getElementById("enterButton");
    button.addEventListener("click", function(){
        addHours();
    });

    let logOutButton = document.getElementById("logOut");
    logOutButton.addEventListener("click", function(){
        clearTokenAndReturn();
    });
    

    let confirmBox = document.getElementById("confirmBox");
    let clearButton = document.getElementById("clearTime");
    clearButton.addEventListener("click", function(){
        confirmBox.style.display = "block";
    });

    let cancelConfirmButton = document.getElementById("cancelConfirmButton");
    cancelConfirmButton.addEventListener("click", function(){
        confirmBox.style.display = "none";
    });

    let confirmConfirmButton = document.getElementById("confirmConfirmButton");
    confirmConfirmButton.addEventListener("click", function(){
        clearHous();
        confirmBox.style.display = "none";
    });

}