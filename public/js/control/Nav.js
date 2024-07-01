import GPS from "../location/GPS.js";

export default class Nav {
    constructor() {      
    }

    addLog(text) {
        const logList = document.getElementById("logList");
        const newLogEntry = document.createElement("li");
        newLogEntry.style.color = "green";
        newLogEntry.textContent = `${new Date().toLocaleTimeString()} : ${text}`;
        logList.appendChild(newLogEntry);
        //스크롤을 최하단으로 이동시키기
        setTimeout(() => {
            logList.scrollTop = logList.scrollHeight;
        }, 0); 
    }
}