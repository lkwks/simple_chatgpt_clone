import { post_process } from "./common.js";

export class Message{
    constructor(message, class_name, system_message="")
    {
        this.timestamp = (new Date()).getTime();
        this.element = this.make_element(class_name, message, system_message);
        this.token = (message !== "") ? message.split(" ").length*5 : 0;
    }

    make_element(class_name, message, system_message)
    {
        const new_element = document.createElement("div");
        new_element.setAttribute("timestamp", this.timestamp);
        new_element.classList.add(class_name);
        new_element.innerHTML = `<p class='closing_button'>x</p>`;
        if (class_name === "user") {
            const message_element = document.createElement("p");
            message_element.innerHTML = message;
            new_element.appendChild(message_element);
        } else {
            post_process(new_element, message, system_message);
        }
        return new_element;
    }
}
