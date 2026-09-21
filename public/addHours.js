let token = localStorage.getItem("token");
let lastTokenCheck = Date.now();


document.getElementById("inputDate").valueAsDate = new Date();

class TimeRecord {
    constructor(id, date, minutes, placements, note, is_credit) {
        this.id = id;
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

function removeEntry(id){
    data_out = {'id':id};
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

// If any credit is counted in a month, nothing above 55h counts that month.
// Credit is optional though, so a month can always fall back to claiming ministry alone.
const MAX_MONTHLY_MINUTES_WITH_CREDIT = 3300;

// The service year runs 1 September - 31 August, and is named after the year it ends in.
// September 2025 through August 2026 is the "2026 service year".
function get_service_year(date){
    return (date.getMonth() >= 8) ? date.getFullYear() + 1 : date.getFullYear();
}

function get_service_year_range(serviceYear){
    return `Sep ${serviceYear - 1} - Aug ${serviceYear}`;
}

// Works out what a month can claim toward the yearly 600.
// Counting credit caps the month at 55h, so when ministry alone already beats that
// we simply don't count the credit (it's still logged, it just doesn't apply).
function get_month_countable(ministryMinutes, creditMinutes){
    let withCredit = Math.min(ministryMinutes + creditMinutes, MAX_MONTHLY_MINUTES_WITH_CREDIT);
    let creditCounts = (creditMinutes > 0) && (withCredit > ministryMinutes);
    let countable = creditCounts ? withCredit : ministryMinutes;
    return {
        // Reportable time is whole hours, any spare minutes are lost
        reportable: align_minutes_to_multiple(countable, 60),
        creditCounts: creditCounts
    };
}

// "2h" when it lands on the hour, "2h15" when it doesn't
function format_hour_minute(minutes){
    let [h, m] = minutes_to_hour_minute(minutes);
    return (m === 0) ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

// Align minutes to the nearest multiple, default is an hour
function align_minutes_to_multiple(minutes, multiple=60) {
    if (multiple <= 0) return minutes;
    let remainder = minutes % multiple;
    return minutes - remainder;
}

function get_year_html_str(serviceYear, totalMinistryMinutes, totalCreditMinutes, totalMinutesCapped, totalPlacements){
    let [h, m] = minutes_to_hour_minute(totalMinutesCapped); // total (capped)

    let headerHtml = `<h3 class="totals" style="margin-bottom: 0;">${serviceYear} Service Year</h3>`
                   + `<h4 class="totals" style="margin-top: 0; font-weight: normal;">${get_service_year_range(serviceYear)}</h4>`;
    let totalsHtml = `<h1 class="totals">Total: ${h}h<br>Placements: ${totalPlacements}</h1>`;

    let detailsArr = [];
    if (totalCreditMinutes > 0) { // Show details if we have at least 1 minute of credit
        detailsArr.push(`[ Ministry ${format_hour_minute(totalMinistryMinutes)} ]`);
        detailsArr.push(`[ Credit ${format_hour_minute(totalCreditMinutes)} ]`);
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
        ${headerHtml}
        ${totalsHtml}
        ${detailsStr}
        </div>
    `;
}

// Heading for each service year in the list below the summary
function get_service_year_html_str(serviceYear, reportableMinutes, ministryMinutes, creditMinutes, placements){
    let [h, m] = minutes_to_hour_minute(reportableMinutes);

    let detailsStr = "";
    if(creditMinutes > 0){
        detailsStr = `<h4 class="totals" style="margin: 0;">[ Ministry ${format_hour_minute(ministryMinutes)} ]   [ Credit ${format_hour_minute(creditMinutes)} ]</h4>`;
    }

    return `<br></br><div class="serviceYearBox">`
         + `<h1 style="margin: 0; text-align: center;">${serviceYear} Service Year</h1>`
         + `<h4 class="totals" style="margin: 0; font-weight: normal;">${get_service_year_range(serviceYear)}</h4>`
         + `<h3 class="totals" style="margin: 0;">Total: ${h}h &nbsp;&nbsp; Placements: ${placements}</h3>`
         + `${detailsStr}</div>`;
}

function get_month_html_str(month_string, reportableMinutes, ministryMinutes, creditMinutes, creditCounts) {
    let [h, m] = minutes_to_hour_minute(reportableMinutes);
    let loggedMinutes = ministryMinutes + creditMinutes;

    // Say why the claimable time is lower than what was logged
    let cappedStr = "";
    if(creditCounts && loggedMinutes > MAX_MONTHLY_MINUTES_WITH_CREDIT){
        cappedStr = ` (capped, ${format_hour_minute(loggedMinutes)} logged)`;
    }else if(creditMinutes > 0 && !creditCounts){
        cappedStr = ` (credit not counted)`;
    }

    // Only break the month down when some of it actually came from credit
    let detailsStr = "";
    if(creditMinutes > 0){
        detailsStr = `<h4 class="totals" style="margin-top: 0; margin-bottom: 10px;">[ Ministry ${format_hour_minute(ministryMinutes)} ]   [ Credit ${format_hour_minute(creditMinutes)} ]</h4>`;
    }

    let timeMarginBottom = (creditMinutes > 0) ? "0" : "10px";
    return`<br></br><h2 style="margin-bottom: 0;">${month_string}</h2><h3 style="margin-top: 0; margin-bottom: ${timeMarginBottom};">Time: ${h}h ${cappedStr}</h3>${detailsStr}`;
}

function get_time_html_str(TimeRecord) {
    const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    let dateStr = daysOfWeek[TimeRecord.date.getDay()] + ", " + TimeRecord.date.getDate();
    let creditStr = TimeRecord.is_credit ? " (Credit)" : "";
    return `
    <div class="dateBox">
    <img src="close.png" onClick="removeEntry(${TimeRecord.id})" class="xButtonImg">
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
            record.id,
            record.date,
            record.minutes,
            record.placements,
            record.note,
            record.is_credit
        ));

        const reverseMonth = true;
        const reverseDays = true;


        timeRecords.sort((a, b) => {
            if(reverseDays) return b.date - a.date;
            else return a.date - b.date;
        });

        // Split time records into months. Keyed on year AND month, otherwise the same
        // month from two different years would be merged into one.
        let months = [];
        let temp_currentMonth = null; // No current month
        let temp_month = [];
        timeRecords.forEach((timeRecord) => {
            let monthKey = timeRecord.date.getFullYear() * 12 + timeRecord.date.getMonth();
            if(monthKey !== temp_currentMonth){
                temp_currentMonth = monthKey;
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

        // Gather the months into service years (1 September - 31 August)
        let serviceYears = [];
        months.forEach((month) => {
            let year = get_service_year(month[0].date);
            let bucket = serviceYears.find(s => s.year === year);
            if(!bucket){
                bucket = {year: year, months: []};
                serviceYears.push(bucket);
            }
            bucket.months.push(month);
        });

        serviceYears.sort((a, b) => {
            if(reverseMonth) return b.year - a.year;
            else return a.year - b.year;
        });

        let HTML = "";

        let currentYear = get_service_year(new Date());

        // Calculate and generate HTML for each service year, then each month inside it
        serviceYears.forEach((serviceYear, index) => {
            let yearMinistry = 0;
            let yearCredit = 0;
            let yearCapped = 0;
            let yearPlacements = 0;
            let monthsHTML = "";

            serviceYear.months.forEach((month) => {
                let monthHTML = "";
                let monthMinistry = 0;
                let monthCredit = 0;
                let monthPlacements = 0;
                let monthName = month[0].date.toLocaleString('default', { month: 'long' });

                month.forEach((record) => {
                    // Add to total month minutes
                    if(record.is_credit) monthCredit += record.minutes_raw;
                    else monthMinistry += record.minutes_raw;
                    monthPlacements += record.placements;

                    monthHTML += get_time_html_str(record);
                });

                let countable = get_month_countable(monthMinistry, monthCredit);
                monthsHTML += get_month_html_str(monthName, countable.reportable, monthMinistry, monthCredit, countable.creditCounts) + monthHTML;

                // Some totals aren't limited by credit caps or hour rounding
                yearMinistry += monthMinistry;
                yearCredit += monthCredit;
                yearCapped += countable.reportable; // The reportable figure, so floored and capped
                yearPlacements += monthPlacements;
            });

            serviceYear.ministry = yearMinistry;
            serviceYear.credit = yearCredit;
            serviceYear.capped = yearCapped;
            serviceYear.placements = yearPlacements;

            // The summary up top is already this year's heading, so don't repeat it
            let needsHeader = !(index === 0 && serviceYear.year === currentYear);
            if(needsHeader) HTML += get_service_year_html_str(serviceYear.year, yearCapped, yearMinistry, yearCredit, yearPlacements);
            HTML += monthsHTML;
        });

        // The summary up top always shows the service year we're currently in, even
        // when nothing has been logged in it yet
        let current = serviceYears.find(s => s.year === currentYear)
                      || {year: currentYear, ministry: 0, credit: 0, capped: 0, placements: 0};

        document.getElementById("time").innerHTML = HTML;
        document.getElementById("totalTime").innerHTML = get_year_html_str(current.year, current.ministry, current.credit, current.capped, current.placements);
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