import GPS from "../location/GPS.js";

export default class MainPanel {
    constructor() {
        this.element = null;
        this.chatBox = null;
        this.input = null;
        this.#onCreate();
        this.enableGps();
        this.autoScrollEnabled = true;
    }

    enableGps() {
        GPS.getInstance().addListener({
            onSuccess: (position) => {
                this.addChat({ sender: "GPS", message: `lat : ${position.coords.latitude}, lng : ${position.coords.longitude}` });
            },
            onError: (error) => {
                this.addChat({ sender: "GPS", message: `error : ${error.message}` });
            }
        });
    }

    #onCreate() {
        this.element = document.getElementById("panel");

        this.element.classList.add("container-fluid");
        this.element.classList.add("border");
        this.element.classList.add("border-primary");
        this.element.classList.add("rounded");
        this.element.classList.add("p-1");
        this.element.style.height = "100%";
        this.element.style.overflow = "hidden";

        this.chatBox = document.createElement("div");
        this.chatBox.classList.add("container-fluid");
        this.chatBox.classList.add("border");
        this.chatBox.classList.add("border-primary");
        this.chatBox.classList.add("rounded");
        this.chatBox.classList.add("p-1");

        this.chatBox.style.height = "60%";
        this.chatBox.style.overflow = "auto";
        this.element.appendChild(this.chatBox);

        // 자동 스크롤 체크박스 생성
        const autoScrollCheckbox = document.createElement("input");
        autoScrollCheckbox.type = "checkbox";
        autoScrollCheckbox.checked = true; // 기본적으로 체크
        autoScrollCheckbox.style.marginTop = "10px";
        this.element.appendChild(autoScrollCheckbox);
        const autoScrollLabel = document.createElement("label");
        autoScrollLabel.textContent = "자동 스크롤 활성화";
        autoScrollLabel.style.marginLeft = "5px";
        autoScrollLabel.style.marginTop = "10px";

        this.element.appendChild(autoScrollLabel);

        // 스크롤 버튼 생성
        const scrollToBottomButton = document.createElement("button");
        // Bootstrap 클래스 추가
        scrollToBottomButton.classList.add("btn");
        scrollToBottomButton.classList.add("btn-primary");

        scrollToBottomButton.textContent = "맨 아래로 스크롤";
        scrollToBottomButton.style.marginTop = "10px";
        scrollToBottomButton.style.marginLeft = "10px";
        scrollToBottomButton.style.height = "30px";
        //padding을 0으로 설정
        scrollToBottomButton.style.padding = "0px";
        this.element.appendChild(scrollToBottomButton);

        autoScrollCheckbox.style.verticalAlign = "middle";
        autoScrollLabel.style.verticalAlign = "middle";

        // 체크박스 이벤트 리스너
        autoScrollCheckbox.addEventListener("change", () => {
            this.autoScrollEnabled = autoScrollCheckbox.checked;
        });

        // 버튼 클릭 이벤트 리스너
        scrollToBottomButton.addEventListener("click", () => {
            this.chatBox.scrollTop = this.chatBox.scrollHeight;
        });


        this.input = document.createElement("input");
        //set top margin
        this.input.style.marginTop = "10px";
        this.input.classList.add("form-control");
        this.element.appendChild(this.input);

        document.getElementById('toggleChatBtn').addEventListener('click', function () {
            var chatPanel = document.getElementById('panel');
            // 채팅창이 현재 숨겨진 상태인지 확인
            if (chatPanel.style.display === 'none') {
                // 채팅창 나타내기
                chatPanel.classList.remove('chat-panel-hide');
                chatPanel.classList.add('chat-panel-show');
                chatPanel.style.display = 'block'; // 애니메이션 시작 전에 채팅창을 블록으로 설정
                MainPanel.getInstance().adjustFloatingButton(true); // 나타나는 상태로 버튼 조정
            } else {
                // 채팅창 숨기기
                chatPanel.classList.remove('chat-panel-show');
                chatPanel.classList.add('chat-panel-hide');
                MainPanel.getInstance().adjustFloatingButton(true); // 사라지는 상태로 버튼 조정
            }
        });

        // 애니메이션 종료 후 채팅창 실제 숨기기
        document.getElementById('panel').addEventListener('animationend', function (e) {
            if (e.animationName === 'slideOut') {
                this.style.display = 'none'; // 애니메이션이 slideOut일 때만 채팅창을 숨깁니다.
                MainPanel.getInstance().adjustFloatingButton(false);
            }
        });
    }

    // 채팅창의 상태를 확인하는 함수
    adjustFloatingButton() {
        console.log('adjustFloatingButton() 호출됨!');
        const chatWindow = document.getElementById('panel'); // 채팅창의 ID 가정
        const floatingButton = document.querySelector('.btn-floating');

        if (chatWindow.style.display === 'none') {
            // 채팅창이 숨겨진 경우, 버튼을 하단으로 내립니다.
            floatingButton.style.bottom = '20px'; // 하단 간격 조정
            floatingButton.textContent = '+';
        } else {
            // 채팅창이 보이는 경우, 채팅창의 높이를 기준으로 버튼의 위치를 조정합니다.
            const chatWindowHeight = chatWindow.offsetHeight; // 채팅창의 높이
            const buttonHeight = 30; // 버튼의 높이, 필요에 따라 조정
            const bottomSpace = 20; // 버튼과 화면 하단 사이의 간격, 필요에 따라 조정

            // 버튼의 bottom 값을 채팅창 높이, 버튼 높이, 하단 간격을 고려하여 설정
            floatingButton.style.bottom = `${chatWindowHeight + buttonHeight + bottomSpace}px`;
            floatingButton.textContent = '-';
        }
    }

    addChat(message) {
        const chat = document.createElement("div");
        chat.classList.add("container-fluid");
        chat.classList.add("border");
        chat.classList.add("border-primary");
        chat.classList.add("rounded");
        chat.classList.add("p-1");
        chat.innerText = `[${message.sender}] : ${message.message}`;
        this.chatBox.appendChild(chat);
        chat.style.margin = "2px";
        chat.style.padding = "0px";

        // Apply CSS animation for gradual appearance
        chat.style.opacity = "0"; // Start with the element being transparent
        chat.style.transition = "opacity 1s"; // Transition effect for opacity change
        setTimeout(() => chat.style.opacity = "1", 10); // Change opacity to 1 after a short delay to trigger the transition

        if (this.autoScrollEnabled) {
            this.chatBox.scrollTop = this.chatBox.scrollHeight;
        }
    }

    setUserInfo(userInfo) {
        this.userInfo = userInfo;
    }

    addListener(listener) {
        this.input.addEventListener("keypress", (e) => {
            if (e.key === "Enter" && this.input.value && this.input.value.trim() !== "") {
                listener({ type: "chat", sender: this.userInfo.fullName, message: this.input.value });
                this.input.value = "";
            }
        });
    }

    static getInstance() {
        if (!MainPanel.instance) {
            MainPanel.instance = new MainPanel();
        }
        return MainPanel.instance;
    }
}

