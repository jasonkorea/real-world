import io from "https://cdn.skypack.dev/socket.io-client";
export default class Socket {
    #socket;

    constructor() {
        this.#socket = null;
        this.#initSocket();
    }

    #initSocket() {
        this.#socket = io("https://projectj.tplinkdns.com:443");
    }

    addListener(listener) {
        this.#socket.on("message", listener);
    }

    sendMessage(message) {
        console.log("Socket.js send message", message);
        this.#socket.emit("message", message);
    }

    async sendMessageAwait(message) {
        return new Promise((resolve) => {
            this.#socket.emit("message", message, (response) => {
                resolve(response);
            });
        });
    }

    disconnect() {
        this.socket.disconnect();
    }

    static getInstance() {
        if (!Socket.instance) {
            Socket.instance = new Socket();
        }
        return Socket.instance;
    }
}