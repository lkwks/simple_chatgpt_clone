import { Message } from "./message.js";
import { response_div, thread, model_option } from "./common.js";

export class Messages{
    constructor()
    {
        this.messages = [];
        this.message_objects = [];
        this.system_message = {};
        this.reset();
    }

    reset()
    {
        document.querySelector("div.response").innerHTML = "";
                
        localStorage.setItem("thread_temp", "[]");
        this.messages = []; // [{role: "user", content: ""}];
        this.message_objects = []; // [new Message("", "user")];
        this.system_message = {role: "system", content: "If your answer contains code blocks, you should specify their language in them. If your answer contains mathematical expressions, you should use LaTeX expressions."};
    }

    push_message(elem, reload_mode=false)
    {
        elem.content = elem.content.trim();
        const message = new Message(elem.content, elem.role);

        this.message_objects.push(message);
        this.messages.push(elem);
        response_div.render_message(message.element);

        // reload_mode가 true라는 건 스레드 이동 상황에서 기존 페이지를 싹 비우고 로컬 스토리지에 있었던 메시지를 하나씩 불러오는 상황이란 뜻.
        // 반대로 false라는 건 로컬 스토리지에 있는 메시지를 꺼내오는 게 아니라 API에서 받은 메시지를 렌더링하는 상황.
        if (reload_mode === false)
            thread.push(elem); 
            // elem.role이 user일 땐 이 코드가 여기 있어야 함.
            // elem.role이 assistant일 땐 여기가 아니라 메시지 stream을 받을 때마다 이게 실행돼야 함.

        if (elem.role === "user")
            this.flush_if_too_many_tokens();
    }

    set_system_message(prompt)
    {
        this.system_message = {role: "system", content: prompt};
    }

    flush_if_too_many_tokens()
    {
        let cutIndex = 0, now_count = 0;
        const token_sum = this.sum_of_tokens(0);
        const bucket_size = model_option.token - 1024;

        if (token_sum < bucket_size) return;
    
        /*

        gpt-3.5-turbo는 최대 4096개의 토큰을 반환하므로, 예를 들어 입력 토큰 개수가 3000개가 넘어가면 답변 길이가 1000토큰 이하로 줄어든다.
        이러면 기대한 답변을 얻기 어려울 수 있으므로 이런 상황에 대비해 미리미리 토큰을 비워줘야 한다. 

        */

        for (var i=0; i<this.messages.length; i++)
        {
            if (this.message_objects.length >= i)
                now_count += this.message_objects[i].token;
            if (now_count > token_sum - bucket_size)
            {
                cutIndex = i;
                break;
            }
        }

        if (cutIndex === this.messages.length-1) cutIndex--;
        this.messages = this.messages.slice(cutIndex, this.messages.length);
        this.message_objects = this.message_objects.slice(cutIndex, this.message_objects.length);
    }

    delete_message(elem)
    {
        response_div.remove(elem);
        for (var i=0; i<this.messages.length; i++)
            if (parseInt(this.message_objects[i].timestamp) === parseInt(elem.getAttribute("timestamp")))
            {
                this.messages.splice(i, 1);
                this.message_objects.splice(i, 1);
                return;
            }
    }


    update_last_token(token_n)
    {
        this.message_objects[this.message_objects.length-1].token = token_n;
    }

    scrollIntoView(i=1)
    {
        if (this.message_objects.length-i-1 >= 0)
            this.message_objects[this.message_objects.length-i-1].element.scrollIntoView({ behavior: 'smooth' });
    }

    get_last_element()
    {
        return this.messages[this.messages.length-2].content;                
    }

    sum_of_tokens(minus_num=2)
    {
        let count = 0;
        for (var i=0; i < this.messages.length-minus_num; i++)
            count += this.message_objects[i].token;
        return count;
    }
}
