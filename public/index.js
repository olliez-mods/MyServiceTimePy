

let token = localStorage.getItem("token");
if(token){
    sendPOST({
        event:"checkToken",
        token:token
    }).then(respose => {
        if(respose.status == "success"){
            window.location.replace("addHours.html");
        }
    });
}

let button = document.getElementById("enterButton");
button.addEventListener("click", function(){

    sendPOST({
        event:"login",
        name:document.getElementById("inputName").value,
        pass:document.getElementById("inputPass").value
    }).then(response => {
        console.log("Got something back,", response);
        if(response.status == "success"){
            localStorage.setItem("token", response.token);
            window.location.replace("addHours.html");
        }else if(response.status == "failed"){
            document.getElementById("regInfo").innerText = "Error: " + response.reason;
        }
    });
});


if(localStorage.getItem("traveldedToLogin") == "true"){
    let imageURL = localStorage.getItem("lastImage");
    document.body.style.backgroundImage = `URL(${imageURL})`;
}else{
    imageURL = localStorage.getItem("lastImage");
    while(localStorage.getItem("lastImage") == imageURL){
        var images=['https://assetsnffrgf-a.akamaihd.net/assets/m/202019453/univ/art/202019453_univ_lsr_lg.jpg',
                    'https://wol.jw.org/en/wol/mp/r1/lp-e/mwb21/2021/868',
                    'https://wol.jw.org/pis/wol/mp/r103/lp-sp/mwb19/2019/1009',
                    'https://wol.jw.org/en/wol/mp/r1/lp-e/mwb16/2016/621',
                    'https://wol.jw.org/en/wol/mp/r1/lp-e/rr/2018/257',
                    'https://wol.jw.org/pis/wol/mp/r103/lp-sp/mwb19/2019/189',
                    'https://assetsnffrgf-a.akamaihd.net/assets/m/402018684/univ/art/402018684_univ_lsr_lg.jpg',
                    'https://assetsnffrgf-a.akamaihd.net/assets/m/402014687/univ/art/402014687_univ_lsr_lg.jpg',
                    'https://assetsnffrgf-a.akamaihd.net/assets/m/202018407/univ/art/202018407_univ_cnt_1_xl.jpg',
                    'https://assetsnffrgf-a.akamaihd.net/assets/m/2018488/univ/art/2018488_univ_lsr_lg.jpg',
                    'https://assetsnffrgf-a.akamaihd.net/assets/m/202020213/univ/art/202020213_univ_cnt_2_xl.jpg',
                    'https://wol.jw.org/sfs/wol/mp/r443/lp-sas/mwb18/2018/762',
                    'https://assetsnffrgf-a.akamaihd.net/assets/m/2013448/univ/art/2013448_univ_lsr_lg.jpg',
                    'https://assetsnffrgf-a.akamaihd.net/assets/m/202022326/univ/art/202022326_univ_lsr_lg.jpg',
                    'https://wol.jw.org/en/wol/mp/r1/lp-e/yb17/2017/307',
                    'https://assetsnffrgf-a.akamaihd.net/assets/m/202020449/univ/art/202020449_univ_lsr_lg.jpg',
                    'https://assetsnffrgf-a.akamaihd.net/assets/m/202018410/univ/art/202018410_univ_lsr_lg.jpg',
                    'https://assetsnffrgf-a.akamaihd.net/assets/m/2016448/univ/art/2016448_univ_cnt_2_xl.jpg',
                    'https://assetsnffrgf-a.akamaihd.net/assets/m/702019243/univ/art/702019243_univ_gal_02_xl.jpg',
                    'https://assetsnffrgf-a.akamaihd.net/assets/m/502015514/univ/art/502015514_univ_lsr_lg.jpg',
                    'https://assetsnffrgf-a.akamaihd.net/assets/m/502018104/univ/art/502018104_univ_cnt_2_xl.jpg',
                    'https://assetsnffrgf-a.akamaihd.net/assets/m/402017604/univ/art/402017604_univ_lsr_md.jpg',
                    'https://assetsnffrgf-a.akamaihd.net/assets/m/702018126/univ/art/702018126_univ_cnt_01_xl.jpg',
                    'https://assetsnffrgf-a.akamaihd.net/assets/m/1102022815/univ/art/1102022815_univ_lsr_lg.jpg',
                    'https://assetsnffrgf-a.akamaihd.net/assets/m/502019150/univ/art/502019150_univ_cnt_3_xl.jpg',
                    'https://assetsnffrgf-a.akamaihd.net/assets/m/1102018985/univ/art/1102018985_univ_lsr_md.jpg',
                    'https://assetsnffrgf-a.akamaihd.net/assets/m/202021090/univ/art/202021090_univ_lsr_xl.jpg',
                    'https://assetsnffrgf-a.akamaihd.net/assets/m/501400101/univ/art/501400101_univ_cnt_5_xl.jpg',
                    'https://i0.wp.com/hrwf.eu/wp-content/uploads/2021/09/Germany-2021-0914.png'];

        let randomNumber = Math.floor(Math.random() * images.length);
        imageURL = images[randomNumber];
    }
    localStorage.setItem("lastImage", imageURL);
    document.body.style.backgroundImage = `URL(${imageURL})`;
}
localStorage.setItem("traveldedToLogin", "false");