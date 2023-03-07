let API_KEY = localStorage.getItem("API_KEY");
if (API_KEY && API_KEY !== "null") document.querySelector("div.API_KEY").classList.add("hide");

document.querySelector("div.API_KEY > input[type='submit']").addEventListener("click", ()=>{
    const API_KEY_candidate = document.querySelector("div.API_KEY > input[type='text']").value;
    if (API_KEY_candidate.length > 10)
    {
        localStorage.setItem("API_KEY", API_KEY_candidate);
        API_KEY = API_KEY_candidate;
        document.querySelector("div.API_KEY").classList.add("hide");        
    }
});
document.getElementById("prompt").select();


class ChatGPTAPI{
    constructor()
    {
        const system_message = localStorage.getItem("system_message");
        this.system_message = system_message ? system_message : "";
        this.messages = [{role:"system", content:this.system_message}];
    }

    async api(messages)
    {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({ model: "gpt-3.5-turbo", messages: messages })
        });
        return await response.json();
    }

    flush_messages()
    {
        const cutIndex = Math.ceil(this.messages.length / 3) * 2;
        this.messages = [{role:"system", content:this.system_message}, ...this.messages.slice(cutIndex, this.messages.length)];
    }
    
    delete(elem)
    {
        this.messages.forEach( (e, i) => {
            if (e.content === elem.getAttribute("original_content"))
            {
                this.messages = this.messages.splice(i, 1);
                response_div.$target.removeChild(elem);
                console.log(this.messages);
                return;
            }
        });
    }

    send(prompt)
    {
        if (!API_KEY) return false;
        this.messages.push({ role: "user", content: prompt });
        
        return this.api(this.messages).then(outputJson => {
            this.messages.push({role: "assistant", content: outputJson.choices[0].message.content});
            if (outputJson.usage.total_tokens > 3000) this.flush_messages();
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
            try{
                const message = [{role: "assistant", content: chatgpt_api.messages[chatgpt_api.messages.length-1].content},
                                 {role: "user", content: "What is the language(s) of this code? Write your answer only in a JSON array, each language to each code block. If you can't find it, just put \"plaintext\" at each code in the JSON array. Note that your answer should not contain ``` in any situations."}];
                const outputJson = await chatgpt_api.api(message);
                console.log(outputJson.choices[0].message.content, processed);
                
                const languages = JSON.parse(outputJson.choices[0].message.content);
                let splitted = processed.split("```");
                for (var i=0; i < splitted.length - 1; i+=2)
                {
                    let code_content = splitted[i+1].split("\n");
                    code_content[0] = "";
                    if (languages[parseInt(i/2)] !== "LaTeX")
                        result += `${splitted[i]}<code class="language-${languages[parseInt(i/2)]}">${code_content.join("\n")}</code>`;
                    else
                        result += `${splitted[i]}$$\n${code_content.join("\n")}\n$$`;
                }
                if (i % 2) result += splitted[splitted.length-1];
            }
            catch(e)
            {
                result = processed;
            }
            return result;
        }
    }

    async update()
    {
        const new_prompt = document.createElement("div");
        const new_response = document.createElement("div");

        new_prompt.classList.add("response_prompt");
        new_response.classList.add("response_response");
        
        new_prompt.setAttribute("original_content", chatgpt_api.messages[chatgpt_api.messages.length-2].content);
        new_response.setAttribute("original_content", chatgpt_api.messages[chatgpt_api.messages.length-1].content);

        new_prompt.innerHTML = `<pre>${await this.preprocess(chatgpt_api.messages[chatgpt_api.messages.length-2].content)}</pre><p>x</p>`;
        new_response.innerHTML = `<pre>${await this.preprocess(chatgpt_api.messages[chatgpt_api.messages.length-1].content)}</pre><p>x</p>`;

        if (chatgpt_api.messages[chatgpt_api.messages.length-2].content !== "continue") this.$target.appendChild(new_prompt);
        this.$target.appendChild(new_response);
        hljs.highlightAll();
        MathJax.typeset();
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
            document.querySelectorAll("div.response > *")[document.querySelectorAll("div.response > *").length - 2].scrollIntoView({ behavior: 'smooth' });
        });
    }
});


    window.onload = function() {
        MathJax.Hub.Config({
            tex2jax: {inlineMath: [['$','$']], displayMath: [['$$','$$']]},
            extensions: ['tex2jax.js'],
            jax: ['input/TeX', 'output/HTML-CSS'],
            showProcessingMessages: false,
            messageStyle: 'none'
        });
        MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
    }
