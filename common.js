import {Thread} from "./thread.js";
import {Messages} from "./messages.js";
import {ResponseDiv} from "./response_div.js";
import {Categories} from "./categories.js";
import {Textarea} from "./textarea.js";

export {post_process, chatgpt_api, sleep, thread, messages, response_div, categories, textarea};

const thread = new Thread();
const messages = new Messages();
const response_div = new ResponseDiv(document.querySelector("div.response"));
const categories = new Categories(document.querySelector("div.categories"));
const textarea = new Textarea(document.querySelector("div.prompt > textarea"));

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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
