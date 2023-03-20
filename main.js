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
        console.log(this.threads[parseInt(thread_id)].title);
        document.querySelector("div.thread_title").innerText = this.threads[parseInt(thread_id)].title;
        thread.load_thread(thread_id);
    }

}

class Message{
    constructor(message, class_name, system_message="")
    {
        this.timestamp = (new Date()).getTime();
        this.element = this.make_element(message, class_name, system_message);
        this.token = message.split(" ").length * 5;
    }

    process_inline(message)
    {
        let splitted_inline = message.split("`"), result_inline="";
        for (var i=0; i < splitted_inline.length - 1; i+=2)
            result_inline += `${splitted_inline[i]}<span class="block_inline">\`</span><span><code>${splitted_inline[i+1]}</code></span><span class="block_inline">\`</span>`;
        if (splitted_inline.length % 2) result_inline += splitted_inline[splitted_inline.length-1];
        return result_inline;
    }

    make_element(message, class_name, system_message="")
    {

        const new_element = document.createElement("div");
        new_element.setAttribute("timestamp", this.timestamp);
        new_element.classList.add(class_name);

        let result = "";
        
        if (system_message !== "")
            result = `${this.process_inline(`\`${system_message}\``)} "${message}"`;
        else
        {
            let splitted = message.replace(/</g, "&lt;").replace(/>/g, "&gt;").split("```");
            for (var i=0; i < splitted.length - 1; i+=2)
            {
                let code_content = splitted[i+1].split("\n");
                let language = code_content[0].trim();
                let result_inline = this.process_inline(splitted[i]);
                code_content.shift();
    
                if (language === "LaTeX")
                    result += `${result_inline}$$\n${code_content.join("\n")}\n$$`;
                else
                {
                    if (language === "")
                        language = "plaintext";
                    result += `${result_inline}<span class="block">\`\`\`</span><code class="language-${language}">${code_content.join("\n")}</code><span class="block">\`\`\`</span>`;
                }
            }
            if (splitted.length % 2) result += this.process_inline(splitted[splitted.length-1]);    
        }


        new_element.innerHTML = `<pre class="tex2jax_process">${result}</pre><p>x</p>`;
       
 
        Array.from(new_element.querySelectorAll("pre > code")).forEach(elem => hljs.highlightElement(elem));
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
        this.system_message = {role: "system", content: "If your answer have code blocks, you should specify their language in them."};
    }

    push_message(elem, reload_mode=false)
    {
        elem.content = elem.content.trim();
        this.message_objects.push(new Message(elem.content, elem.role));
        this.messages.push(elem);
        if (reload_mode === false) thread.push(elem);
        let k = this.message_objects[this.message_objects.length-1].element;
        response_div.render_message(k);

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

    scrollIntoView(i=0)
    {
        this.message_objects[this.message_objects.length-i-1].element.scrollIntoView({ behavior: 'smooth' });
    }

    get_last_element()
    {
        return this.messages[this.messages.length-1].content;                
    }

    sum_of_tokens(minus_num=1)
    {
        let count = 0;
        for (var i=0; i < this.messages.length-minus_num; i++)
            count += this.message_objects[i].token;
        return count;
    }
}


async function chatgpt_api(messages)
{
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("API_KEY")}`
        },
        body: JSON.stringify({ model: localStorage.getItem("model"), messages: messages})
    });
    return await response.json();
}



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

    send_message()
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
        this.$target.value = "Generating...";
        messages.scrollIntoView();

        chatgpt_api([messages.system_message, ...messages.messages]).then( outputJson => {
            console.log(outputJson);
            messages.update_last_token(outputJson.usage.prompt_tokens - messages.sum_of_tokens());
            messages.push_message({role: "assistant", content: outputJson.choices[0].message.content});
            messages.update_last_token(outputJson.usage.completion_tokens);
            
            if (thread.id === null && outputJson.usage.total_tokens > 100)
                thread.make_title();
            
            console.log(outputJson.choices[0].message.content);
            console.log(outputJson.usage.total_tokens);

            if (outputJson.choices[0].finish_reason === "length") 
            {
                messages.push_message({role: "user", content: "continue"});
                this.send_message();
            }
            else
            {
                this.$target.value = "";
                this.unlock();
                this.focus();
                if (prompt !== "continue" || prompt.split(" ").length > 200) messages.scrollIntoView(1);
            }
        }).catch(e=>{
            alert("API 에러 발생! 개발자 모드에서 에러 메시지를 확인하세요.");
            console.log(e);
            this.unlock();
            this.focus();
            this.$target.value = messages.get_last_element();
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
        MathJax.typesetPromise().then(() => MathJax.typesetPromise()).catch((err) => console.log(err.message));
    }
}

class Thread{
    constructor()
    {
        this.title = "";
        this.id = null;
        this.category_id = null;
    }

    async make_title()
    {
        await chatgpt_api([...messages.messages, 
            {role:"user", content: "By the way, which title would be the best \
that summarizes our conversation so far? Answer in less than five words, in the language you used."
            }]).then(outputJson => {
                console.log(outputJson.choices[0].message.content);
                this.title = outputJson.choices[0].message.content.split(" (")[0].replace("Title: ", "").trim().replace(/"/g, "");
                document.querySelector("div.thread_title").innerText = this.title;
            }).catch(e=>{console.log(e)});

        const filteredArr = categories.categories.filter(el => el !== "");
        await chatgpt_api([...messages.messages, 
            {role:"user", content: `By the way, which category would be the best \
if you put the summary our conversation so far into it? \
I'll give you a JS array: ${filteredArr} \
You should answer in this format: "The index of the category: [[number]]"`
            }]).then(outputJson => {
                console.log(outputJson.choices[0].message.content);

                this.id = categories.threads.length;

                let output_index = outputJson.choices[0].message.content.split("The index of the category: ")[1].replace(`"`, "").split(" ")[0];
                this.category_id = 0;
                if (isNaN(output_index) === false)
                    categories.categories.forEach((elem, i) =>
                    {
                        if (elem === filteredArr[parseInt(output_index)])
                            this.category_id = i;
                    });

                categories.add_this_thread();
            }).catch(e=>{console.log(e)});
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
    push(elem)
    {
        let thread_id = (this.id || this.id === 0) ? `thread_${this.id}` : "thread_temp";
        let thread_temp = JSON.parse(localStorage.getItem(thread_id));
        if (thread_temp) thread_temp.push(elem);
        else thread_temp = [elem];
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
