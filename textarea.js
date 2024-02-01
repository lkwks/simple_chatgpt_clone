import { Message } from "./message.js";
import { SubmitButton } from "./submit_button.js";
import { messages, response_div, textarea, thread, API_KEY, chatgpt_api, model_option, answer_stream } from "./common.js";

const submit_button = new SubmitButton(document.querySelector("div.prompt > input"));

export class Textarea{
    constructor($target)
    {
        this.$target = $target;
        this.stop_stream = false;
    }

    process_command(prompt)
    {
        const splitted = Array.from(prompt.split(" "));
        const command = splitted[0]; splitted.shift();
        let command_parameter = splitted.join(" "), command_message = "Command failed";
        
        if (command === "/system" && command_parameter)
        {
            if (splitted[0] === "--show")
            {
                command_message = "Current system message";
                command_parameter = messages.system_message.content;
            }
            else
            {
                command_message = "System message changed";
                messages.set_system_message(command_parameter);
            }
        }
        if (command === "/api_key" && command_parameter)
        {
            command_message = "API key changed";
            localStorage.setItem("API_KEY", command_parameter);
        }
        if (command === "/category" && command_parameter)
        {
            command_parameter = command_parameter.split(" ");

            if (command_parameter[0] === "add" && command_parameter[1])
            {
                command_message = "Addition";
                if (categories.add(command_parameter[1]))
                    command_message += " Succeed.";
                else
                    command_message += " Failed.";
            }
            if (command_parameter[0] === "modify" && command_parameter[1] && command_parameter[2])
            {
                command_message = "Modification";
                if (categories.modify(command_parameter[1], command_parameter[2]))
                    command_message += " Succeed.";
                else
                    command_message += " Failed.";
            }
            if (command_parameter[0] === "delete" && command_parameter[1])
            {
                command_message = "Deletion";
                if (categories.modify(command_parameter[1], ""))
                    command_message += " Succeed.";
                else
                    command_message += " Failed.";
            }
            command_parameter.shift();
            command_parameter = command_parameter.join(" ");
        }
        if (command == "/t")
        {
            command_message = "The number of tokens that is sent to the API";
            command_parameter = messages.sum_of_tokens(0);
        }
        
        const message_obj = new Message(command_parameter, "system", command_message);
        response_div.render_message(message_obj.element);
        message_obj.element.scrollIntoView({behavior: "smooth"});
    }

    lock()
    {
        this.$target.readOnly = true;
        this.$target.classList.add("readOnly");
        submit_button.$target.value = "STOP";
        this.stop_stream = false;
    }

    unlock()
    {
        this.$target.readOnly = false;
        this.$target.classList.remove("readOnly");
        submit_button.$target.value = "SEND";
    }

    focus()
    {
        var device_width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        if (device_width >= 800) this.$target.select();
    }

    async end_stream() {
        this.$target.value = "";
        this.unlock();
        this.focus();
        messages.messages[messages.messages.length-1].content = answer_stream.answer_set;
        answer_stream.end();
        console.log(answer_stream.answer_set);
        try {
            await MathJax.typesetPromise();
        } catch(e) {
            console.log(e);
        }        
    }

    async send_message()
    {
        const prompt = this.$target.value.trim();
        if (!API_KEY || prompt.length === 0) return;
        if (prompt[0] === "/")
        {
            if (prompt !== "/c")
            {
                this.process_command(prompt);
                this.$target.value = "";
                this.focus();
                return;
            }
            else
                prompt = "continue";
        }
        if (prompt.split(" ").length * 5 > model_option.token - 1024) 
        {
            alert("메시지가 너무 깁니다.");
            return;
        }

        this.lock(); // 락 걸렸을 때 락 걸린 거 풀고 메시지 생성 중단시키는 버튼 만들고 싶음. 예를 들어 gpt-3.5로 리턴 받다가 끊고 gpt-4로 api를 변경한다든지.
        messages.push_message({role: "user", content: prompt});
        messages.push_message({role: "assistant", content: ""});
        this.$target.value = "Generating...";
        messages.scrollIntoView();

        await chatgpt_api([/*messages.system_message,*/ ...messages.messages], true).then(async response => {
            
            console.log(response);
            // return;
            const reader = response.body.getReader();
            let buffer = '';

            await reader.read().then(async function processResult(result) {
                if (answer_stream.signal) {
                    console.log(1);
                    return "";
                }
                buffer += new TextDecoder('utf-8').decode(result.value || new Uint8Array());
                  
                var messages_buffer = buffer.split('\n\n')
                buffer = messages_buffer.pop();
                console.log(buffer, messages_buffer);
                if (/*messages_buffer.length === 0 || */textarea.stop_stream) 
                {
                    textarea.end_stream();
                    console.log(1);
                    return;
                }

                let val;
                for (var message of messages_buffer)
                   if (message.includes("data: ") && message.includes("[DONE]") === false)
                   {
                       answer_stream.start();
                       val = JSON.parse(message.replace("data: ", ""));
                       if (val.choices[0].delta.content) {
                           console.log(val.choices[0].delta.content);
                           await answer_stream.add_answer(val.choices[0].delta.content);
                       }
                   }

                messages.update_last_token(answer_stream.answer_set.split(" ").length);
                if (thread.id === null && messages.sum_of_tokens(0) > 100) 
                    thread.make_title();
                thread.push({role: "assistant", content: answer_stream.answer_set}, true);

                if (!("choices" in val)) {
                }
                else if (val.choices[0].finish_reason === "length")
                {
                    // 여기서 continue를 추가하면 무슨 일이 일어나나?
                    // continue 메시지 객체가 만들어지고, 그게 메시지 배열에 푸시된다. (render는 안된다.) 
                    // 그리고 API로 continue 메시지가 보내지고, 그 응답이 stream으로 리턴된다. (위 answer_stream.add_answer 참조)
                    textarea.end_stream();
                    messages.push_message({role: "user", content: "continue"});
                    textarea.send_message();
                    console.log(1);
                    return;
                }
                else if (val.choices[0].finish_reason === "stop")
                {
                    textarea.end_stream();
                    console.log(1);
                    return;
                }
                
                reader.read().then(processResult);
              });
            })
        .catch(e=>{
            alert("API 에러 발생! 개발자 모드에서 에러 메시지를 확인하세요.");
            console.log(e);
            this.unlock();
            this.focus();
            this.$target.value = messages.get_last_element();
            messages.delete_message(response_div.$target.lastChild);
            messages.delete_message(response_div.$target.lastChild);
        });
    
    }
    
}
