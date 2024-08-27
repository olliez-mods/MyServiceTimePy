let token = localStorage.getItem("token");

document.getElementById("inputDate").valueAsDate = new Date();

function setZeroIfInvalid(obj){
    if(!obj.checkValidity()){
        obj.value = 0
    }
}

function clearTokenAndReturn(){
    localStorage.removeItem("token");
    window.location.replace("index.html");
}

function CheckToken(){
    sendPOST({}, "validate_token", token).then(({status, ok, data}) => {
        if(!ok){
            if(data["code"] = "055"){
            clearTokenAndReturn();
            }else{
                alert(JSON.stringify(data));
            }
        }
    });
}

function removeDay(date_str){
    console.log(date_str)
    data_out = {'date':date_str};
    sendPOST(data_out, "remove_time", token).then(({status, ok, data}) => {
        if(!ok){
            if(data["code"] == "099"){
                clearTokenAndReturn();
            }else{
                alert(JSON.stringify(data));
            }
            return;
        }
        setTimeout(getHours(), 500);
    });
}

function getHours(){
    sendPOST({}, "get_time", token).then(({status, ok, data}) => {
        if(!ok){
            if(data['code'] == "510"){
                clearTokenAndReturn();
            }else{
                alert(JSON.stringify(data));
            }
            return;
        }

        let time = data['time']

        // Sort by date first, so we add them in order
        const reverse = false
        time.sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            if(reverse){
                return dateB - dateA;
            }else{
            return dateA - dateB;
            }
        });

        let totalHours = 0;
        let totalMinutes = 0;
        let totalPlacements = 0;
    
        const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const monthsOfYear = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        
        let HTML = "";

        time.forEach((time_record, index) => {
            let m_raw = time_record['minutes']
            let p = time_record['placements']
            let d_raw = time_record['date']
            let n = time_record['note']

            let d = new Date(d_raw)

            let h = Math.floor(m_raw / 60);
            let m = m_raw % 60;

            totalHours += h
            totalMinutes += m
            totalPlacements += p

            dateStr = daysOfWeek[d.getUTCDay()] + ", " + d.getUTCDate(); 
            let fileDis = 
            `
            <div class="dateBox">
            <img src="close.png" onClick="removeDay('${d_raw}')" class="xButtonImg">
                    <H2 style="margin-top:0px; text-align: center;">${dateStr}</H2>
                    <H3 class="dateInfo">Time: ${h}:${m}</H3>
                    <H3 class="dateInfo">Placements: ${p}</H3>
                    <H4 class="dateInfo" style="word-wrap: break-word;">${n}<H4>
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

    });
}

function addHours(){
    setZeroIfInvalid(document.getElementById("inputHours"));
    setZeroIfInvalid(document.getElementById("inputMinutes"));
    setZeroIfInvalid(document.getElementById("inputPlacements"));

    full_minutes = parseInt(document.getElementById("inputHours").value)*60 + parseInt(document.getElementById("inputMinutes").value);
    console.log(full_minutes)
    data_out = {
        'time':{
            'minutes':full_minutes,
            'placements':parseInt(document.getElementById("inputPlacements").value),
            'note':document.getElementById("inputNote").value,
            'date':document.getElementById("inputDate").value
        }
    };
    sendPOST(data_out, "add_time", token).then(({status, ok, data}) => {
        if(!ok){
            if(data["code"] == "823"){
                clearTokenAndReturn();
            }else if(data["code"] == "561"){
                alert("Only one record per date is allowed")
            }else{
                alert(JSON.stringify(data));
            }
            return;
        }
        document.getElementById("inputHours").value = "";
        document.getElementById("inputMinutes").value = "";
        document.getElementById("inputDate").valueAsDate = new Date();
        document.getElementById("inputPlacements").value = "";
        document.getElementById("inputNote").value = "";

        setTimeout(getHours(), 500);
    });
}

function clearHous(){
    sendPOST({}, "clear_time", token).then(({status, ok, data}) => {
        if(!ok){
            if(data['code'] == "989"){
                clearTokenAndReturn()
            }else{
                alert(JSON.stringify(data));
            }
            return;
        }
        getHours();
    });
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
        console.log("exitng")
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