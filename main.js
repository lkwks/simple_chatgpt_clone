let API_KEY = localStorage.getItem("API_KEY");
if (API_KEY && API_KEY !== "null") document.querySelector("div.API_KEY").classList.add("hide");

document.querySelector("div.API_KEY > input[type='submit']").addEventListener("click", ()=>{
    const API_KEY_candidate = document.querySelector("div.API_KEY > input[type='text']").value;
    if (API_KEY_candidate.length > 10)
    {
        localStorage.setItem("API_KEY", API_KEY_candidate);
        document.querySelector("div.API_KEY").classList.add("hide");        
    }
});
document.getElementById("prompt").select();
document.querySelector("div.categories").classList.add("hide");

document.querySelector("div.title > button.categories").addEventListener("click", ()=>{
    document.querySelector("div.categories").classList.toggle("hide");
});

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
    1. 대화 내용이 조금 길어진다 싶으면(500토큰 이상) 다음 처리를 한다.
    - 현재 대화내용에 관한 타래 제목을 얻어온다.
    - 그 제목에 해당하는 URI를 만들고, 타래 내용을 그 URI에 해당하는 로컬스토리지에 저장하고, 그 URI로 페이지를 넘긴다.
    - 넘어온 페이지에서는, URI에 해당하는 로컬 스토리지 내용을 긁어와 렌더링을 수행한다. messagges, messages_token, timestamps도 다 담는다.
    - 코드블럭의 언어를 얻어온 다음에 버릴 게 아니라 메시지에 삽입을 해야겠다. 그래야 렌더링이 빨라짐.
    - 그 URI 안에서는, 메시지 하나 생성될 때마다 로컬 스토리지에 담는다. 
    3. 구현을 위해 고려할 로컬 스토리지 구조
    - 카테고리 목록: `categories`. 카테고리명이 키고 그에 대한 URI 값이 딕셔너리로 저장돼있음. (카테고리 생성된 순서대로 숫자 매겨서.)
    - 각 카테고리에 있는 타래들 URI의 목록이 담긴 키값: `category_[카테고리 URI값]`. 배열이고, 각 인덱스마다 {URI:"", 제목:""}이 들어있음.
    - 각 타래의 내용이 담긴 키값: `thread_[타래 URI값]`. {messages:[], messages_token:[], timestamps:[]}가 다 있음. 
    4. 카테고리 목록에서 카테고리를 누르면 타래 목록이 뜬다. 각 타래는 아이콘 모양이고, x버튼이 귀퉁이에 있어 삭제가 쉽다. 
***
지금 구현해야 하는 게
1) 500토큰 이상 
    */
}


class ChatGPTAPI{
    constructor()
    {
        this.messages = [{role: "user", content: ""}];
        this.messages_token = [0];
        this.timestamps = [null];
        this.system_message = {role: "system", content: ""};
    }

    push_message(elem)
    {
        this.timestamps.push((new Date()).getTime());
        this.messages.push(elem);
    }

    set_system_message(prompt)
    {
        this.system_message = prompt;
        this.messages_token.push(parseInt(prompt.length/2));
        this.push_message({role: "system", content: prompt});
    }

    async api(messages)
    {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("API_KEY")}`
            },
            body: JSON.stringify({ model: "gpt-3.5-turbo", messages: messages})
        });
        return await response.json();
    }

    flush_messages()
    {
        let cutIndex = 0, now_count = 0;

        for (; cutIndex<this.messages.length; cutIndex++)
        {
            now_count += this.messages_token[i];
            if (now_count > 1024) break;
        }
        
        this.messages = this.messages.slice(cutIndex, this.messages.length);
        this.messages_token = this.messages_token.slice(cutIndex, this.messages_token.length);
        this.timestamps = this.timestamps.slice(cutIndex, this.timestamps.length);
        this.set_system_message(this.system_message);
    }

    delete_message(i)
    {
        this.messages.splice(i, 1);
        this.timestamps.splice(i, 1);
        this.messages_token.splice(i, 1);
    }
    
    delete(elem)
    {
        response_div.$target.removeChild(elem);
        for (var i=0; i<this.timestamps.length; i++)
        {
            if (parseInt(this.timestamps[i]) === parseInt(elem.getAttribute("timestamp")))
            {
                this.delete_message(i);
                return;
            }
        }
    }

    send(prompt)
    {
        if (!API_KEY || prompt.length === 0) return new Promise(resolve => resolve()).then(()=> {return false});

        prompt = prompt.trim();
        if (prompt[0] === "/")
        {
            const splitted = Array.from(prompt.split(" "));
            const command = splitted[0]; splitted.shift();
            let command_parameter = splitted.join(" "), command_message = "Command failed";
            
            if (command === "/system" && command_parameter)
            {
                command_message = "System message changed";
                this.set_system_message(command_parameter);
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
            
            

            return new Promise(resolve => resolve()).then(()=>{
                const new_prompt = document.createElement("div");
                new_prompt.classList.add("response_prompt");
                new_prompt.setAttribute("timestamp", (new Date()).getTime());
                response_div.$target.appendChild(new_prompt);
                new_prompt.innerHTML = `<pre><span style="display:inline"><code class="language-plaintext">${command_message}</code></span>"${command_parameter}"</pre>`;
                document.querySelector("div.prompt > textarea").value = ""; 
                return false;
            });
        }
        

        this.push_message({ role: "user", content: prompt });
        
        return this.api(this.messages).then(outputJson => {
            this.push_message({role: "assistant", content: outputJson.choices[0].message.content});
            this.messages_token.push(outputJson.usage.prompt_tokens);
            this.messages_token.push(outputJson.usage.completion_tokens);
            
            // 로컬스토리지 업데이트, 500토큰 넘을 시 타이틀 구해서 카테고리에 넣고 새 URI로 이동하는  여기 구현. 
            
            console.log(outputJson.choices[0].message.content);
            console.log(outputJson.usage.total_tokens);
            if (outputJson.usage.total_tokens > 4000) this.flush_messages();
            console.log(outputJson);
            return outputJson.choices[0].finish_reason;
        }).catch(e=>{console.log("error", e); this.messages.pop(); return false;});
    }
}

const chatgpt_api = new ChatGPTAPI();


class ResponseDiv{
    constructor($target)
    {
        this.$target = $target;
        //현재 URI 파싱해서 로컬 스토리지에 있는 부분은 가져와서 렌더링 하는 코드 여기 추가. 
    }
    
    async preprocess(content)
    {
        let processed = content.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        if (processed.split("```").length === 1)
            return processed;
        else
        {
            let result = "";
            let splitted = processed.split("```");
            for (var i=0; i < splitted.length - 1; i+=2)
            {
                let code_content = splitted[i+1].split("\n");
                let language = code_content[0].trim();
                code_content[0] = "";
                if (language === "LaTeX")
                    result += `${splitted[i]}$$\n${code_content.join("\n")}\n$$`;
                else if (language === "")
                {
                    try{
                        const message = [{role: "assistant", content: `${splitted[i]} \`\`\`${code_content.join("\n")}\`\`\` }`},
                                         {role: "user", content: "What is the language of this code? Answer only in one word. If you can't find its language, just answer this word: plaintext."}];
                        const outputJson = await chatgpt_api.api(message);
                        language = outputJson.choices[0].message.content.trim().replace(".", ""); 
                        console.log(language);
                    }
                    catch(e)
                    {
                        language = "plaintext";
                    }
                }
                if (language in ["Bash", "C", "C#", "C++", "CSS", "Diff", "Go", "GraphQL", "HTML, XML", "JSON", "Java", "JavaScript", "Kotlin", "Less", "Lua", "Makefile", "Markdown", "Objective-C", "PHP", "PHPT", "Perl", "Python", "IPython", "R", "Ruby", "Rust", "SCSS", "SQL", "Shell", "Session", "Swift", "TOML", "INI", "TypeScript", "VB.NET", "WebAssembly", "YAML"] === false)
                    language = "plaintext";
                result += `${splitted[i]}<code class="language-${language}"><p class="block">\`\`\`</p>${code_content.join("\n")}<p class="block">\`\`\`</p></code>`;
                // language를 얻어온 다음에 chatgpt_api.messages의 내용을 수정하는 코드가 필요.
            }
            if (splitted.length % 2) result += splitted[splitted.length-1];

            return result;
        }
    }

    async update()
    {
        const new_prompt = document.createElement("div");
    
          new_prompt.classList.add("response_prompt");
          new_prompt.setAttribute("timestamp", chatgpt_api.timestamps[chatgpt_api.messages.length-2]);
          if (chatgpt_api.messages[chatgpt_api.messages.length-2].content !== "continue") 
          {
              this.$target.appendChild(new_prompt);
              new_prompt.innerHTML = `<pre class="tex2jax_process">${await this.preprocess(chatgpt_api.messages[chatgpt_api.messages.length-2].content)}</pre><p>x</p>`;
          }
          else
          {
              chatgpt_api.delete_message(chatgpt_api.messages.length-2);
          }
          if (new_prompt.querySelector("code")) 
                Array.from(new_prompt.querySelectorAll("pre > code")).forEach(elem => hljs.highlightElement(elem));

          const new_response = document.createElement("div");

          new_response.classList.add("response_response");
          new_response.setAttribute("timestamp", chatgpt_api.timestamps[chatgpt_api.messages.length-1]);
          this.$target.appendChild(new_response);
          new_response.innerHTML = `<pre class="tex2jax_process">${await this.preprocess(chatgpt_api.messages[chatgpt_api.messages.length-1].content)}</pre><p>x</p>`;
          if (new_response.querySelector("code")) 
                Array.from(new_response.querySelectorAll("pre > code")).forEach(elem => hljs.highlightElement(elem));

        MathJax.typesetPromise().then(() => MathJax.typesetPromise()).catch((err) => console.log(err.message));

    }
}



const response_div = new ResponseDiv(document.querySelector("div.response"));

document.body.addEventListener("click", e=>{
    if (e.target.nodeName === "P")
        chatgpt_api.delete(e.target.parentNode);
});

document.querySelector("div.prompt > input").addEventListener("click", ()=>{
    if (document.querySelector("div.prompt > textarea").readOnly === false)
        send_message(document.querySelector("div.prompt > textarea").value);
});


function send_message(prompt)
{
    document.querySelector("div.prompt > textarea").readOnly = true;
    document.querySelector("div.prompt > textarea").classList.add("readOnly");
    chatgpt_api.send(prompt).then( async (result) =>{
        console.log(result);
        if (result)
        {
            await response_div.update();
            document.querySelector("div.prompt > textarea").value = ""; 
        }
        document.querySelector("div.prompt > textarea").readOnly = false;
        document.querySelector("div.prompt > textarea").classList.remove("readOnly");
        var device_width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
        if (device_width >= 800) document.getElementById("prompt").select();
        if (result === "length") send_message("continue");
        else if (document.querySelectorAll("div.response > *").length > 1)
        {
            for (var i=0; i<document.querySelectorAll("div.response > *").length; i++)
                if (chatgpt_api.messages[chatgpt_api.messages.length-i-1].role === "user")
                {
                    document.querySelectorAll("div.response > *")[document.querySelectorAll("div.response > *").length - i - 1].scrollIntoView({ behavior: 'smooth' });
                    break;
                }
        }
    });
}
