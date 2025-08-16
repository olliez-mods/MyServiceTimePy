let token = localStorage.getItem("token");
let lastTokenCheck = Date.now();


document.getElementById("inputDate").valueAsDate = new Date();

class TimeRecord {
    constructor(date, minutes, placements, note, is_credit) {
        this.date_raw = date;
        const [year, month, day] = date.split('-').map(Number);
        this.date = new Date(year, month - 1, day);
        console.log(date, this.date);
        this.minutes_raw = minutes;
        this.placements = placements;
        this.note = note;
        this.is_credit = is_credit;

        [this.hours, this.minutes] = minutes_to_hour_minute(minutes);
    }
}

const creditToggle = document.getElementById('creditToggle');
let isCredit = false;

creditToggle.addEventListener('click', function() {
  setIsCredit(!isCredit);
});

function setIsCredit(value) {
  isCredit = value;
  creditToggle.classList.toggle('active', isCredit);
}

function setZeroIfInvalid(obj){
    if(!obj.checkValidity()){
        obj.value = 0;
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

function minutes_to_hour_minute(minutes){
    let h = Math.floor(minutes / 60);
    let m = minutes % 60;
    return([h,m]);
}

// Align minutes to the nearest multiple, default is an hour
function align_minutes_to_multiple(minutes, multiple=60) {
    if (multiple <= 0) return minutes;
    let remainder = minutes % multiple;
    return minutes - remainder;
}

function get_year_html_str(totalMinistryMinutes, totalCreditMinutes, totalMinutesCapped, totalPlacements){
    let [h, m] = minutes_to_hour_minute(totalMinutesCapped); // total (capped)
    let [hM, mM] = minutes_to_hour_minute(totalMinistryMinutes); // total ministry
    let [hCr, mCr] = minutes_to_hour_minute(totalCreditMinutes); // total credit

    let totalsHtml = `<h1 class="totals">Total: ${h}h<br>Placements: ${totalPlacements}</h1>`;

    let detailsArr = [];
    if (totalCreditMinutes > 0) { // Show details if we have at least 1 minute of credit
        detailsArr.push(`[ Ministry ${hM}h ]`);
        detailsArr.push(`[ Credit ${hCr}h ]`);
    }

    let detailsStr = "";
    if (detailsArr.length > 1) {
        detailsStr = `
            <h2 class="totals">
                ${detailsArr.join('   ')}
            </h2>
        `;
    }

    return `
        <div>
        ${totalsHtml}
        ${detailsStr}
        </div>
    `;
}

function get_month_html_str(month_string, minutes, minutesCapped) {
    let [h, m] = minutes_to_hour_minute(minutes);
    let [hC, mC] = minutes_to_hour_minute(minutesCapped);
    let cappedStr = (minutesCapped !== minutes) ? ` (${hC} capped)` : ""; // Don't show minutes (there's shouldn't be any)
    return`<br></br><h2 style="margin-bottom: 0;">${month_string}</h2><h3 style="margin-top: 0; margin-bottom: 10px;">Time: ${h}h ${cappedStr}</h3>`;
}

function get_time_html_str(TimeRecord) {
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let dateStr = daysOfWeek[TimeRecord.date.getDay()] + ", " + TimeRecord.date.getDate();
    let creditStr = TimeRecord.is_credit ? " (Credit)" : "";
    return `
    <div class="dateBox">
    <img src="close.png" onClick="removeDay('${TimeRecord.date_raw}')" class="xButtonImg">
            <H2 style="margin-top:0px; text-align: center;">${dateStr}${creditStr}</H2>
            <H3 class="dateInfo">Time: ${TimeRecord.hours}:${TimeRecord.minutes}</H3>
            <H3 class="dateInfo">Placements: ${TimeRecord.placements}</H3>
            <H4 class="dateInfo" style="word-wrap: break-word;">${TimeRecord.note}</H4>
    </div>`;
}

function getHours() {
    sendPOST({}, "get_time", token).then(({status, ok, data}) => {
        if(!ok){
            if(data['code'] == "510") clearTokenAndReturn();
            else alert(JSON.stringify(data));
            return;
        }
        let time_dicts = data['time'];
        let timeRecords = time_dicts.map(record => new TimeRecord(
            record.date,
            record.minutes,
            record.placements,
            record.note,
            record.is_credit
        ));

        const reverseMonth = true;
        const reverseDays = false;


        timeRecords.sort((a, b) => {
            if(reverseDays) return b.date - a.date;
            else return a.date - b.date;
        });

        let totalMinutesMinistry = 0;
        let totalMinutesCredit = 0;
        let totalMinutesCapped = 0;
        let totalPlacements = 0;

        // Split time records into months
        let months = [];
        let temp_currentMonth = -1; // No current month
        let temp_month = [];
        timeRecords.forEach((timeRecord) => {
            if(timeRecord.date.getMonth() !== temp_currentMonth){
                temp_currentMonth = timeRecord.date.getMonth();
                if(temp_month.length > 0) months.push(temp_month);
                temp_month = [];
            }
            temp_month.push(timeRecord);
        });
        if(temp_month.length > 0) months.push(temp_month); // Push the last month if it has records

        months.sort((a, b) => {
            if(reverseMonth) return b[0].date - a[0].date;
            else return a[0].date - b[0].date;
        });

        let HTML = "";

        const MAX_MONTHLY_MINUTES_WITH_CREDIT = 3300;

        // Calculate and generate HTML for each month
        months.forEach((month) => {
            let monthHTML = "";
            let monthMinistry = 0;
            let monthCredit = 0;
            let monthPlacements = 0;
            let monthName = month[0].date.toLocaleString('default', { month: 'long' });
            let isCreditMonth = false;

            month.forEach((record) => {
                if(record.is_credit) isCreditMonth = true;
                
                // Add to total month minutes
                if(record.is_credit) monthCredit += record.minutes_raw;
                else monthMinistry += record.minutes_raw;
                monthPlacements += record.placements;

                monthHTML += get_time_html_str(record);
            });

            let monthMinutes = align_minutes_to_multiple(monthMinistry + monthCredit, 60); // Months align to hours no minutes
            let monthMinutesCapped = Math.min(monthMinutes, (isCreditMonth ? MAX_MONTHLY_MINUTES_WITH_CREDIT : Infinity));
            HTML += get_month_html_str(monthName, monthMinutes, monthMinutesCapped) + monthHTML;

            // Some totals aren't limited by credit caps or hour rounding
            totalMinutesMinistry += monthMinistry;
            totalMinutesCredit += monthCredit;
            totalMinutesCapped += monthMinutesCapped;

            totalPlacements += monthPlacements;
        });

        document.getElementById("time").innerHTML = HTML;
        document.getElementById("totalTime").innerHTML = get_year_html_str(totalMinutesMinistry, totalMinutesCredit, totalMinutesCapped, totalPlacements);
    });
}

function addHours(){
    setZeroIfInvalid(document.getElementById("inputHours"));
    setZeroIfInvalid(document.getElementById("inputMinutes"));
    setZeroIfInvalid(document.getElementById("inputPlacements"));

    full_minutes = parseInt(document.getElementById("inputHours").value)*60 + parseInt(document.getElementById("inputMinutes").value);
    data_out = {
        'time':{
            'minutes':full_minutes,
            'placements':parseInt(document.getElementById("inputPlacements").value),
            'note':document.getElementById("inputNote").value,
            'date':document.getElementById("inputDate").value,
            'is_credit': isCredit
        }
    };
    sendPOST(data_out, "add_time", token).then(({status, ok, data}) => {
        if(!ok){
            if(data["code"] == "823"){
                clearTokenAndReturn();
            }else if(data["code"] == "561"){
                alert("Only one record per date is allowed");
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
        setIsCredit(false);

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
        console.log("exitng");
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

    setInterval(() => {
        CheckToken(); // No rate limiting here, checks every minute
    }, 120000);

    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible') {
            const now = Date.now();

            if(now - lastTokenCheck < 10000){
                return;
            }

            lastTokenCheck = now
            CheckToken();
        }
    });
}