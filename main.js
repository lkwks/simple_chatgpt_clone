let API_KEY = localStorage.getItem("API_KEY");
if (API_KEY && API_KEY !== "null") document.querySelector("div.API_KEY").classList.add("hide");

let model = localStorage.getItem("model");
if (!model || model === "null") localStorage.setItem("model", "gpt-3.5-turbo");

let max_token = localStorage.getItem("max_token");
if (!max_token || max_token === "null") localStorage.setItem("max_token", "4096");

document.getElementById("prompt").select();
document.querySelector("div.categories").classList.add("hide");


class Categories{
    constructor($target)
    {
        this.$target = $target;
        this.categories = JSON.parse(localStorage.getItem("categories"));
        if (! this.categories) this.categories = [];
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


    show_category_list()
    {
        this.$target.querySelector("div.categories_title").innerText = "Categories";
        this.$target.querySelector("div.categories_content").innerHTML = "";

        this.categories.forEach( (elem, i) => {
            if (elem)
            {
                const div = document.createElement("div");
                div.classList.add("category_icon");
                div.setAttribute("category_id", i);
                div.innerText = elem;
                this.$target.querySelector("div.categories_content").appendChild(div);
            }
        });
    }

    move_category(category_id)
    {
        this.$target.querySelector("div.categories_title").innerText = this.categories[category_id];
        const child = JSON.parse(localStorage.getItem(`category_${category_id}`));

        child.forEach( elem => {
            if (elem)
            {
                const div = document.createElement("div");
                div.classList.add("thread_icon");
                div.setAttribute("thread_id", elem.id);
                div.innerHTML = `${elem.title}<p>x</p>`;
                this.$target.querySelector("div.categories_content").appendChild(div);
            }
        });
    }        

    /*
    1. 대화 내용이 조금 길어진다 싶으면(500토큰 이상) 다음 처리를 한다.
    - 넘어온 페이지에서는, URI에 해당하는 로컬 스토리지 내용을 긁어와 렌더링을 수행한다. messagges, messages_token, timestamps도 다 담는다.

    3. 구현을 위해 고려할 로컬 스토리지 구조
    - 카테고리 목록: `categories`. 카테고리명이 키고 그에 대한 URI 값이 딕셔너리로 저장돼있음. (카테고리 생성된 순서대로 숫자 매겨서.)
    - 각 카테고리에 있는 타래들 URI의 목록이 담긴 키값: `category_[카테고리 URI값]`. 배열이고, 각 인덱스마다 {URI:"", 제목:""}이 들어있음.
    - 각 타래의 내용이 담긴 키값: `thread_[타래 URI값]`. {messages:[], messages_token:[], timestamps:[]}가 다 있음. 

    4. 카테고리 목록에서 카테고리를 누르면 타래 목록이 뜬다. 각 타래는 아이콘 모양이고, x버튼이 귀퉁이에 있어 삭제가 쉽다. 
    - 이거 구현이 귀찮은데... 

    카테고리 아이콘 클릭 시 스레드 목록 나오게 만들어야됨
    
    */
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
        this.messages = [{role: "user", content: ""}];
        this.message_objects = [new Message("", "user")];
        this.system_message = {role: "system", content: ""};
    }

    push_message(elem)
    {
        elem.content = elem.content.trim();
        this.message_objects.push(new Message(elem.content, elem.role));
        this.messages.push(elem);
        let k = this.message_objects[this.message_objects.length-1].element;
        response_div.render_message(k);
    }

    set_system_message(prompt)
    {
        this.system_message = {role: "system", content: prompt};
    }

    flush_if_too_many_tokens()
    {
        let cutIndex = 0, now_count = 0;
        const token_sum = this.sum_of_tokens() + this.message_objects[this.message_objects.length-1].token;
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
            if (parseInt(this.message_objects[i]) === parseInt(elem.getAttribute("timestamp")))
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

    sum_of_tokens()
    {
        let count = 0;
        for (var i=0; i < this.messages.length-1; i++)
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
            if (splitted[1] === "--show")
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
            if (splitted[1] === "--show")
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
            if (splitted[1] === "--show")
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
            this.process_command(prompt);
            this.$target.value = "";
            this.focus();
            return;
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
        messages.flush_if_too_many_tokens();

        chatgpt_api([messages.system_message, ...messages.messages]).then( outputJson => {
            console.log(outputJson);
            messages.update_last_token(outputJson.usage.prompt_tokens - messages.sum_of_tokens());
            messages.push_message({role: "assistant", content: outputJson.choices[0].message.content});
            messages.update_last_token(outputJson.usage.completion_tokens);
            
            if (thread.title === "" && outputJson.usage.total_tokens > 150)
                thread.make_title();
            thread.save();
            
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
        //현재 URI 파싱해서 로컬 스토리지에 있는 부분은 가져와서 렌더링 하는 코드 여기 추가. 
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

    make_title()
    {
        chatgpt_api([...messages.messages, 
            {role:"user", content: "By the way, which title would be the best \
that summarizes our conversation so far? Answer in less than five words. \
If you can't summarize, you should answer this word: Untitled."
            }]).then(outputJson => {
                this.title = outputJson.choices[0].message.content.replace("Title: ", "").trim().replace(/"/g, "");
                console.log(this.title);

                this.id = parseInt(localStorage.getItem("thread_num"));
                if (!this.id || this.id === "null") this.id = 0;
                localStorage.setItem("thread_num", this.id+1);

                this.save();
            }).catch(e=>{console.log(e)});


        let categories_list = [];
        //categories.categories.forEach(elem => {categories_list.push(localStorage.getItem(`category_${elem}`).name)});
        chatgpt_api([...messages.messages, 
            {role:"user", content: `By the way, which category would be the best \
if you put the summary our conversation so far into it? Answer between these categories: ${JSON.stringify(categories_list)} \
If you can't put, you should answer this word: ETC.`
            }]).then(outputJson => {
                console.log(outputJson);

                /*categories_list.forEach((e, i) => {
                    if (output === e)
                    {
                        let temp = JSON.parse(localStorage.getItem(`category_${i}`));
                        temp.push();
                    }
                });*/
                // 그 단어에 해당하는 카테고리에 삽입.. 

                this.save();
            }).catch(e=>{console.log(e)});
    }

    save()
    {
        const thread_dict = {title: this.title, messages: messages.messages, category_id: this.category_id};
        localStorage.setItem(`thread_${this.id}`, JSON.stringify(thread_dict));
    }
}


const messages = new Messages();
const textarea = new Textarea(document.querySelector("div.prompt > textarea"));
const response_div = new ResponseDiv(document.querySelector("div.response"));
const categories = new Categories(document.querySelector("div.categories"));
const thread = new Thread();


document.body.addEventListener("click", e=>{
    if (e.target.nodeName === "P")
        messages.delete_message(e.target.parentNode);
    if (e.target === document.querySelector("div.prompt > input") && document.querySelector("div.prompt > textarea").readOnly === false)
        textarea.send_message();


    if (e.target === document.querySelector("div.title > button.categories"))
    {
        document.querySelector("div.categories").classList.toggle("hide");
        if (document.querySelector("div.categories").classList.contains("hide") === false)
            categories.show_category_list();
    }

    if (e.target == document.querySelector("div.API_KEY > input[type='submit']"))
    {
        const API_KEY_candidate = document.querySelector("div.API_KEY > input[type='text']").value;
        if (API_KEY_candidate.length > 10)
        {
            localStorage.setItem("API_KEY", API_KEY_candidate);
            document.querySelector("div.API_KEY").classList.add("hide");        
        }
    }
});
