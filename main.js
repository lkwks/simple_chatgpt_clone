let API_KEY = localStorage.getItem("API_KEY");
if (API_KEY && API_KEY !== "null") document.querySelector("div.API_KEY").classList.add("hide");

document.getElementById("prompt").select();
document.querySelector("div.categories").classList.add("hide");

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }  

class Categories{
    constructor($target)
    {
        this.$target = $target;
        this.categories = JSON.parse(localStorage.getItem("categories"));
        this.threads = JSON.parse(localStorage.getItem("threads"));
        if (! this.categories) this.categories = ["ETC"];
        if (! this.threads) this.threads = [];
        this.show_category_list(-1);
    }


    add(category_name)
    {
        for (var i=0; i<this.categories.length; i++)
            if (this.categories[i] === category_name) return false;
        this.categories.push(category_name);
        localStorage.setItem("categories", JSON.stringify(this.categories));
        return true;
    }

    modify(old_name, new_name)
    {
        for (var i=0; i<this.categories.length; i++)
            if (this.categories[i] === old_name)
            {
                this.categories[i] = new_name;
                localStorage.setItem("categories", JSON.stringify(this.categories));
                return true;
            }
        return false;
    }

    add_this_thread()
    {
        this.threads.push({category_id: thread.category_id, title: thread.title});
        localStorage.setItem("threads", JSON.stringify(this.threads));
        localStorage.setItem(`thread_${thread.id}`, localStorage.getItem("thread_temp"));
    }

    render_icon(type, elem, i, clicked_id)
    {
        const div = document.createElement("div");
        div.classList.add(`${type}_icon`);
        div.setAttribute(`${type}_id`, i);
        div.innerHTML = `${elem}<p>x</p>`;
        if (parseInt(clicked_id) === parseInt(i))
            div.classList.add("clicked");
        return div;
    }

    delete_thread_icon(elem)
    {
        document.querySelector("div.categories_content").removeChild(elem);
        let thread_id = parseInt(elem.getAttribute("thread_id"));
        localStorage.setItem(`thread_${thread_id}`, "");
        this.threads[thread_id] = null;
        localStorage.setItem("threads", JSON.stringify(this.threads));
    }

    show_category_list(clicked_id)
    {
        this.$target.querySelector("div.categories_title").innerHTML = "";

        this.$target.querySelector("div.categories_title").appendChild(this.render_icon("category", "All", -1, clicked_id));
        this.categories.forEach( (elem, i) => {
            if (elem) //null인 경우 있음
            {
                const div = this.render_icon("category", elem, i, clicked_id);
                this.$target.querySelector("div.categories_title").appendChild(div);
            }
        });

        this.show_threads(clicked_id);
    }

    show_threads(category_id)
    {
        this.$target.querySelector("div.categories_content").innerHTML = "";

        this.threads.forEach((elem, i) => {
            if (elem && (parseInt(elem.category_id) === parseInt(category_id) || parseInt(category_id) === -1))
                this.$target.querySelector("div.categories_content").appendChild(this.render_icon("thread", elem.title, i));
        });
    }

    load_thread(thread_id)
    {
        document.querySelector("div.categories").classList.toggle("hide");
        document.querySelector("div.thread_title").innerText = this.threads[parseInt(thread_id)].title;
        thread.load_thread(thread_id);
    }

}


function make_codeblock(splitted1, splitted2)
{
    let result = "";
    let code_content = splitted2.split("\n");
    let language = code_content[0].trim();
    let result_inline = process_inline(splitted1);
    code_content.shift();

    if (language === "LaTeX")
        result = `${result_inline}$$\n${code_content.join("\n")}\n$$`;
    else
    {
        if (language === "")
            language = "plaintext";
        result = `${result_inline}<span class="block">\`\`\`</span><code class="language-${language}">${code_content.join("\n")}</code><span class="block">\`\`\`</span>`;
    }
    return result;
}


function process_inline(message)
{
    let splitted_inline = message.split("`"), result_inline="";
    for (var i=0; i < splitted_inline.length - 1; i+=2)
    {
        if (splitted_inline[i+1] === "") return message;
        splitted_inline[i] = splitted_inline[i].replace(/\$/g, "\\$");
        result_inline += `${splitted_inline[i]}<span class="block_inline">\`</span><span><code>${splitted_inline[i+1]}</code></span><span class="block_inline">\`</span>`;
    }
    if (splitted_inline.length % 2)
    {
        if (splitted_inline[splitted_inline.length-1] === "") return message;
        result_inline += splitted_inline[splitted_inline.length-1];
    } 
    return result_inline;
}




// stream으로 응답 받은 메시지가 DOM 엘리먼트에 담겨서 이 함수의 인자로 들어왔을 때, 
// 그 메시지 안 내용 중 코드블럭이 있다면 그 코드블럭을 렌더링해주는 함수.
// DOMelem으로는, 메시지가 담긴 <pre> 엘리먼트가 들어온다.
function post_process(DOMelem, message, system_message="")
{
    let result = ""; message = message.trim();
        
    if (system_message !== "")
        result = `${process_inline(`\`${system_message}\``)} "${message}"`;
    else
    {
        let splitted = message.split("```");

        // 아래 for문은 splitted.length가 3 이상일 때만 돌아간다.
        for (var i=0; i < splitted.length - 2; i+=2)
        {
            if (splitted[i+1].startsWith("</span>")) 
                result += splitted[i] + "```" + splitted[i+1] + "```";
            else
                result += make_codeblock(splitted[i], splitted[i+1]);
        }

        // 지금 splitted.length가 짝수냐 홀수냐에 따라 마지막 처리가 달라짐.
        // 짝수면 두 개 남은 거고, 홀수면 한 개 남은 거.
        if (splitted.length % 2 === 0)
        {
            if (message.endsWith("```"))
                result += make_codeblock(splitted[splitted.length-2], splitted[splitted.length-1]);
            else
                result += process_inline(splitted[splitted.length-2]) + "```" + process_inline(splitted[splitted.length-1]); 
        }
        else
            result += process_inline(splitted[splitted.length-1]);

        // 결과적으로, result는 메시지 내용 중 코드블럭을 렌더링한 결과가 담긴 문자열.  

    }
    DOMelem.innerHTML = `<pre class="tex2jax_process">${result}</pre><p>x</p>`;
    Array.from(DOMelem.querySelectorAll("pre > code")).forEach(elem => {
        if (elem.classList.contains("hljs") === false) hljs.highlightElement(elem);
    });
    
    try
    {
        MathJax.typesetPromise().then(() => MathJax.typesetPromise());
    }
    catch(e)
    {
        console.log(e);
    }
}


class Message{
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
        new_element.innerHTML = `<pre class="tex2jax_process">${message}</pre><p>x</p>`;
        post_process(new_element, message, system_message);
        return new_element;
    }
}

class Messages{
    constructor()
    {
        this.messages = [];
        this.message_objects = [];
        this.system_message = {};
        this.reset();
    }

    reset()
    {
        let model = localStorage.getItem("model");
        if (!model || model === "null") localStorage.setItem("model", "gpt-3.5-turbo");
        
        let max_token = localStorage.getItem("max_token");
        if (!max_token || max_token === "null") localStorage.setItem("max_token", "4096");

        document.querySelector("div.response").innerHTML = "";
                
        localStorage.setItem("thread_temp", "[]");
        this.messages = [{role: "user", content: ""}];
        this.message_objects = [new Message("", "user")];
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
        const bucket_size = parseInt(localStorage.getItem("max_token")) - 1024;

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


async function chatgpt_api(messages, stream_mode=false)
{
    const api_url = "https://api.openai.com/v1/chat/completions";
    let param = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("API_KEY")}`
        }
    };
    let body_param = {model: localStorage.getItem("model"), messages: messages};

    if (stream_mode) 
    {
        body_param.stream = true;
        param.body = JSON.stringify(body_param);
        return fetch(api_url, param);
    }
    else
    {
        param.body = JSON.stringify(body_param);
        const response = await fetch(api_url, param);
        return await response.json();
    }
}



class AnswerStream{
    constructor()
    {
        this.now_streaming = false;
        this.answer_set = "";
        this.signal = false;
    }
    
    start()
    {
        if (this.now_streaming === false)
        {
            this.answer_set = "";
            this.now_streaming = true;
            this.signal = false;
        }
    }
    
    add_answer(answer)
    {
        this.answer_set += answer.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        post_process(response_div.$target.lastChild, this.answer_set);
    }
    
    end()
    {        
        this.signal = false;
        this.now_streaming = false;
    }
}


const answer_stream = new AnswerStream();



class Textarea{
    constructor($target)
    {
        this.$target = $target;
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
        if (command == "/model" && command_parameter)
        {
            if (splitted[0] === "--show")
            {
                command_message = "Current model";
                command_parameter = localStorage.getItem("model");
            }
            else
            {
                command_message = "Model changed";
                localStorage.setItem("model", command_parameter);
           }
        }
        if (command == "/max_token" && command_parameter)
        {
            if (splitted[0] === "--show")
            {
                command_message = "Current maximum token you receive";
                command_parameter = localStorage.getItem("max_token");
            }
            else 
            {
                if(parseInt(command_parameter))
                {
                    command_message = "Maximum token you recieve changed";
                    localStorage.setItem("max_token", command_parameter);
                }
                else
                    command_message = "Maximum token change failed"    
            }
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
    }

    unlock()
    {
        this.$target.readOnly = false;
        this.$target.classList.remove("readOnly");
    }

    focus()
    {
        var device_width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        if (device_width >= 800) this.$target.select();
    }

    end_stream()
    {
        this.$target.value = "";
        this.unlock();
        this.focus();
        messages.messages[messages.messages.length-1].content = answer_stream.answer_set;
        console.log(answer_stream.answer_set);
        answer_stream.end();
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
        if (prompt.split(" ").length * 5 > 3072) 
        {
            alert("메시지가 너무 깁니다.");
            return;
        }

        this.lock();
        messages.push_message({role: "user", content: prompt});
        messages.push_message({role: "assistant", content: ""});
        this.$target.value = "Generating...";
        messages.scrollIntoView();

        await chatgpt_api([messages.system_message, ...messages.messages], true).then(async response => {
            const reader = response.body.getReader();
            let buffer = '';

            await reader.read().then(async function processResult(result) {
                if (answer_stream.signal) return "";
                buffer += new TextDecoder('utf-8').decode(result.value || new Uint8Array());
                  
                var messages_buffer = buffer.split('\n\n')
                buffer = messages_buffer.pop();
                if (messages_buffer.length === 0) 
                {
                    textarea.end_stream();
                    return;
                }
      
                let val;
                for (var message of messages_buffer)
                   if (message.includes("data: ") && message.includes("[DONE]") === false)
                   {
                       answer_stream.start();
                       val = JSON.parse(message.replace("data: ", ""));
                       if (val.choices[0].delta.content)
                           answer_stream.add_answer(val.choices[0].delta.content);
                   }

                messages.update_last_token(answer_stream.answer_set.split(" ").length);
                if (thread.id === null && messages.sum_of_tokens(0) > 100) 
                    thread.make_title();
                thread.push({role: "assistant", content: answer_stream.answer_set}, true);
                
                if (val.choices[0].finish_reason === "length")
                {
                    messages.push_message({role: "user", content: "continue"});
                    textarea.send_message();
                    return;
                }
                else if (val.choices[0].finish_reason === "stop")
                {
                    textarea.end_stream();
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

class ResponseDiv{
    constructor($target)
    {
        this.$target = $target;
    }

    remove(elem)
    {
        this.$target.removeChild(elem);
    }

    render_message(elem)
    {
        if (elem.content === "continue") return;

        this.$target.appendChild(elem);
    }
}

class Thread{
    constructor()
    {
        this.title = "";
        this.id = null;
        this.category_id = 0;
        this.title_making = false;
    }

    async make_title()
    {
        if (this.title_making) return;
        this.title_making = true;
        await chatgpt_api([...messages.messages, 
            {role:"user", content: "By the way, which title would be the best \
that summarizes our conversation so far? Answer in less than five words, in the language you used."
            }]).then(outputJson => {
                console.log(outputJson.choices[0].message.content);
                this.title = outputJson.choices[0].message.content.split(" (")[0].replace("Title: ", "").trim().replace(/"/g, "");
                document.querySelector("div.thread_title").innerText = this.title;
            }).catch(e=>{console.log(e)});

        this.id = categories.threads.length;        
        
        const filteredArr = categories.categories.filter(el => el !== "");
        await chatgpt_api([...messages.messages, 
            {role:"user", content: `By the way, which category would be the best \
if you put the summary our conversation so far into it? \
You should find the category among the elements in this JS array: ${JSON.stringify(filteredArr)} \
Answer in this format: "The index of the category: {number}"`
            }]).then(outputJson => {
                console.log(outputJson.choices[0].message.content);

                let output_index = outputJson.choices[0].message.content.split("The index of the category: ")[1].replace(`"`, "").split(" ")[0];
                if (isNaN(output_index) === false)
                    categories.categories.forEach((elem, i) =>
                    {
                        if (elem === filteredArr[parseInt(output_index)])
                            this.category_id = i;
                    });

                categories.add_this_thread();
            }).catch(e=>{console.log(e); categories.add_this_thread();});
    }


    // 스레드 이동했을 때 싹 비우고 로컬 스토리지에 있었던 메시지를 하나씩 불러오는 코드
    async load_thread(thread_id)
    {
        messages.reset();

        const thread_temp = JSON.parse(localStorage.getItem(`thread_${thread_id}`));
        this.id = thread_id;
        for (var elem of thread_temp)
        {
            messages.push_message(elem, true);
            await sleep(10);
        }
    }

    // localStorage의 thread_{num}을 계속 업데이트 하는 코드
    push(elem, now_streaming=false)
    {
        let thread_id = (this.id || this.id === 0) ? `thread_${this.id}` : "thread_temp";
        let thread_temp = JSON.parse(localStorage.getItem(thread_id));
        if (thread_temp) 
        {
            if (now_streaming === false)
                thread_temp.push(elem);
            else
                thread_temp[thread_temp.length-1] = elem; // 현재 스트리밍 중이라면 마지막 메시지를 업데이트
        }
        else 
        {
            // 현재 thread_temp가 비어있다면 elem으로 초기화. 이 경우는 첫 엘리먼트의 role이 user일 때만 발생. 즉, 스트리밍이 시작되기 전에만 발생.
            thread_temp = [elem];
        }
        localStorage.setItem(thread_id, JSON.stringify(thread_temp));
    }

}


const messages = new Messages();
const textarea = new Textarea(document.querySelector("div.prompt > textarea"));
const response_div = new ResponseDiv(document.querySelector("div.response"));
const categories = new Categories(document.querySelector("div.categories"));
const thread = new Thread();


document.body.addEventListener("click", e=>{
    if (e.target.nodeName === "P" && e.target.parentNode.parentNode.classList.contains("response"))
        messages.delete_message(e.target.parentNode);
    if (e.target === document.querySelector("div.prompt > input") && document.querySelector("div.prompt > textarea").readOnly === false)
        textarea.send_message();

    if (e.target === document.querySelector("div.title > button.categories"))
        document.querySelector("div.categories").classList.toggle("hide");

    if (e.target == document.querySelector("div.API_KEY > input[type='submit']"))
    {
        const API_KEY_candidate = document.querySelector("div.API_KEY > input[type='text']").value;
        if (API_KEY_candidate.length > 10)
        {
            localStorage.setItem("API_KEY", API_KEY_candidate);
            document.querySelector("div.API_KEY").classList.add("hide");        
        }
    }

    if (e.target.nodeName === "P" && e.target.parentNode.classList.contains("thread_icon"))
        categories.delete_thread_icon(e.target.parentNode);

    if (e.target.classList.contains("category_icon"))
        categories.show_category_list(e.target.getAttribute("category_id"));
    if (e.target.classList.contains("thread_icon"))
        categories.load_thread(e.target.getAttribute("thread_id"));
});
