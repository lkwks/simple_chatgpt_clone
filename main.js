let API_KEY = localStorage.getItem("API_KEY");
if (API_KEY && API_KEY !== "null") document.querySelector("div.API_KEY").classList.add("hide");

let model = localStorage.getItem("model");
if (!model || model === "null") localStorage.setItem("model", "gpt-3.5-turbo");

document.getElementById("prompt").select();
document.querySelector("div.categories").classList.add("hide");


class Categories{
    constructor()
    {
        this.categories = localStorage.getItem("categories");
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
    1. ?????? ????????? ?????? ???????????? ?????????(500?????? ??????) ?????? ????????? ??????.
    - ????????? ??????????????????, URI??? ???????????? ?????? ???????????? ????????? ????????? ???????????? ????????????. messagges, messages_token, timestamps??? ??? ?????????.

    3. ????????? ?????? ????????? ?????? ???????????? ??????
    - ???????????? ??????: `categories`. ?????????????????? ?????? ?????? ?????? URI ?????? ??????????????? ???????????????. (???????????? ????????? ???????????? ?????? ?????????.)
    - ??? ??????????????? ?????? ????????? URI??? ????????? ?????? ??????: `category_[???????????? URI???]`. ????????????, ??? ??????????????? {URI:"", ??????:""}??? ????????????.
    - ??? ????????? ????????? ?????? ??????: `thread_[?????? URI???]`. {messages:[], messages_token:[], timestamps:[]}??? ??? ??????. 

    4. ???????????? ???????????? ??????????????? ????????? ?????? ????????? ??????. ??? ????????? ????????? ????????????, x????????? ???????????? ?????? ????????? ??????. 
    - ?????? ????????? ????????????... 
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
        if (system_message !== "")
            message = `${system_message}: "${message}"`;

        const new_element = document.createElement("div");
        new_element.setAttribute("timestamp", this.timestamp);
        new_element.classList.add(class_name);

        let splitted = message.replace(/</g, "&lt;").replace(/>/g, "&gt;").split("```");
        let result = "";

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

        for (var i=0; i<this.messages.length; i++)
        {
            now_count += this.message_objects[i].token;
            if (now_count > 1024 && cutIndex === 0) 
                cutIndex = i;
        }
        
        if (now_count > 3072) //???????????? ??? ?????? ?????? ???????????? ?????? ??????????????? flush
        {
            if (cutIndex === this.messages.length-1) cutIndex--;
            this.messages = this.messages.slice(cutIndex, this.messages.length);
            this.message_objects = this.message_objects.slice(cutIndex, this.messages.length);
        }
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
            command_message = "System message changed";
            messages.set_system_message(command_parameter);
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
        }
        if (command == "/model" && command_parameter)
        {
            command_message = "Model changed";
            localStorage.setItem("model", command_parameter);
        }
        
        const message_obj = new Message(command_parameter, "system", command_message);
        response_div.render_message(message_obj.element);
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
            alert("???????????? ?????? ?????????.");
            return;
        }

        this.lock();
        messages.push_message({role: "user", content: prompt});
        this.$target.value = "?????????...";
        messages.scrollIntoView();
        messages.flush_if_too_many_tokens();

        chatgpt_api([messages.system_message, ...messages.messages]).then(outputJson => {
            console.log(outputJson);
            messages.update_last_token(outputJson.usage.prompt_tokens);
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
            alert("API ?????? ??????! ????????? ???????????? ?????? ???????????? ???????????????.");
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
        //?????? URI ???????????? ?????? ??????????????? ?????? ????????? ???????????? ????????? ?????? ?????? ?????? ??????. 
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
        const thread_id = (new URLSearchParams(window.location.search)).get('thread_id');
        if (thread_id)
        {
            this.id = thread_id;
            this.title = JSON.parse(localStorage.getItem(`thread_${thread_id}`)).title;
        }
    }

    make_title()
    {
        chatgpt_api([...messages.messages, 
            {role:"user", content: "By the way, which title would be the best \
that summarizes our conversation so far? Answer in less than five words. \
If you can't summarize, you should answer this word: Untitled."
            }]).then(outputJson => {
                console.log(outputJson);
                this.title = outputJson.choices[0].message.content.replace("Title: ", "");
                // ????????? ????????? ?????? ???????????? ?????? ?????? ???????????? ?????? ????????? ????????? ??????
            }).catch(()=>{});
    }

    save()
    {
        const thread_dict = {title: this.title, messages: messages.messages};
        localStorage.setItem(`thread_${this.id}`, JSON.stringify(thread_dict));
    }
}


const messages = new Messages();
const textarea = new Textarea(document.querySelector("div.prompt > textarea"));
const response_div = new ResponseDiv(document.querySelector("div.response"));
const categories = new Categories();
const thread = new Thread();


document.body.addEventListener("click", e=>{
    if (e.target.nodeName === "P")
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
});
