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


class ChatGPTAPI{
    constructor()
    {
        this.messages = [{role:"system", content:""}];
    }

    set_system_message(prompt)
    {
        this.messages[0].content = prompt;
    }

    async api(messages)
    {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("API_KEY")}`
            },
            body: JSON.stringify({ model: "gpt-3.5-turbo", messages: messages })
        });
        return await response.json();
    }

    flush_messages()
    {
        const cutIndex = 2;
        this.messages = [{role:"system", content:this.system_message}, ...this.messages.slice(cutIndex, this.messages.length)];
    }
    
    delete(elem)
    {
        this.messages.forEach( (e, i) => {
            if (e.content === elem.getAttribute("original_content"))
            {
                this.messages.splice(i, 1);
                response_div.$target.removeChild(elem);
                return;
            }
        });
    }

    send(prompt)
    {
        if (!API_KEY || prompt.length === 0) return false;

        prompt = prompt.trim();
        if (prompt[0] === "/")
        {
            const splitted = prompt.split(" ");
            const command = splitted[0];
            let command_parameter = (splitted.length > 1 ? splitted[1] : false), command_message = "Command failed";

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

            return new Promise(resolve => resolve()).then(()=>{
                const new_prompt = document.createElement("div");
                new_prompt.classList.add("response_prompt");
                new_prompt.setAttribute("original_content", command_parameter);
                response_div.$target.appendChild(new_prompt);
                new_prompt.innerHTML = `<pre><code>${command_message}</code> ${command_parameter}</pre>`;
                return false;
            });
        }
        

        this.messages.push({ role: "user", content: prompt });
        
        return this.api(this.messages).then(outputJson => {
            this.messages.push({role: "assistant", content: outputJson.choices[0].message.content});
            if (outputJson.usage.total_tokens >= 4096) this.flush_messages();
            console.log(outputJson.usage.total_tokens);
            return true;
          }).catch(()=>{this.messages.pop(); return false;});
    }
}

const chatgpt_api = new ChatGPTAPI();


class ResponseDiv{
    constructor($target)
    {
        this.$target = $target;
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
                        const message = [{role: "assistant", content: code_content.join("\n")},
                                         {role: "user", content: "What is the language of this code? Answer only in one word. Or, just answer this word: plaintext."}];
                        const outputJson = await chatgpt_api.api(message);
                        language = outputJson.choices[0].message.content.trim().replace(".", ""); 
                        console.log(language);
                    }
                    catch(e)
                    {
                        language = "plaintext";
                    }
                }
                result += `${splitted[i]}<code class="language-${language}">${code_content.join("\n")}</code>`;
            }
            if (i % 2) result += splitted[splitted.length-1];

            return result;
        }
    }

    async update()
    {
        const new_prompt = document.createElement("div");
    
          new_prompt.classList.add("response_prompt");
          new_prompt.setAttribute("original_content", chatgpt_api.messages[chatgpt_api.messages.length-2].content);
          if (chatgpt_api.messages[chatgpt_api.messages.length-2].content !== "continue") 
          {
              this.$target.appendChild(new_prompt);
              new_prompt.innerHTML = `<pre class="tex2jax_process">${await this.preprocess(chatgpt_api.messages[chatgpt_api.messages.length-2].content)}</pre><p>x</p>`;
          }

          const new_response = document.createElement("div");

          new_response.classList.add("response_response");
          new_response.setAttribute("original_content", chatgpt_api.messages[chatgpt_api.messages.length-1].content);
          this.$target.appendChild(new_response);
          new_response.innerHTML = `<pre class="tex2jax_process">${await this.preprocess(chatgpt_api.messages[chatgpt_api.messages.length-1].content)}</pre><p>x</p>`;
          hljs.highlightAll();

          await MathJax.typesetPromise().then(async () => {
            MathJax.typesetPromise();
        }).catch((err) => console.log(err.message));

    }
}



const response_div = new ResponseDiv(document.querySelector("div.response"));

document.body.addEventListener("click", e=>{
    if (e.target.nodeName === "P")
        chatgpt_api.delete(e.target.parentNode);
});

document.querySelector("div.prompt > input").addEventListener("click", ()=>{
    if (document.querySelector("div.prompt > textarea").readOnly === false)
    {
        document.querySelector("div.prompt > textarea").readOnly = true;
        document.querySelector("div.prompt > textarea").classList.add("readOnly");
        chatgpt_api.send(document.querySelector("div.prompt > textarea").value).then( async (result) =>{
            if (result)
            {
                await response_div.update();
                document.querySelector("div.prompt > textarea").value = ""; 
            }
            document.querySelector("div.prompt > textarea").readOnly = false;
            document.querySelector("div.prompt > textarea").classList.remove("readOnly");
            document.getElementById("prompt").select();
            if (document.querySelectorAll("div.response > *").length > 1)
                document.querySelectorAll("div.response > *")[document.querySelectorAll("div.response > *").length - 2].scrollIntoView({ behavior: 'smooth' });
        });
    }
});
