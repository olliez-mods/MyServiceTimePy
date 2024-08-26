async function sendPOST(data, event){
    const url = `${window.location.origin}/api/${event}`;
    // Send a POST request to the server
    const response = await fetch(url, {
        method: "POST",
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'postevent' : 'true'
        },
        mode:'cors',
        body: JSON.stringify(data)
    });
    const result = await response.json();
    return result;
}