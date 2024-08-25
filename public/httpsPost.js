async function sendPOST(data){
    const url = `${window.location.origin}`;
    // Send a POST request to the server
    const response = await fetch(url, {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'mode': 'cors',
            'postevent' : 'true'
        },
        body: JSON.stringify(data)
    });
    const result = await response.json();
    return result;
}