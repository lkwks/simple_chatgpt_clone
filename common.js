import {Thread} from "./thread.js";
import {Messages} from "./messages.js";
import {ResponseDiv} from "./response_div.js";
import {Categories} from "./categories.js";
import {Textarea} from "./textarea.js";
import {ModelOption} from "./model_option.js";
import {AnswerStream} from "./answerstream.js";

export {post_process, chatgpt_api, sleep, thread, messages, response_div, categories, textarea, API_KEY, model_option, answer_stream};

let API_KEY = localStorage.getItem("API_KEY");

const thread = new Thread();
const messages = new Messages();
const response_div = new ResponseDiv(document.querySelector("div.response"));
const categories = new Categories(document.querySelector("div.categories"));
const textarea = new Textarea(document.querySelector("div.prompt > textarea"));
const model_option = new ModelOption(document.querySelector("div.model_option"));
const answer_stream = new AnswerStream();
const markdown_converter = new showdown.Converter();

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
// 더불어, answer_stream.answer_set의 내용도 적당히 지워준다.
function post_process(DOMelem, message, system_message="") {
    let result = ""; 
    let message = message.trim();

    if (system_message)
        message = `\`${system_message}\` "${message}";
    
    var html = markdown_converter.makeHtml(message);

    if (html.childElementCount > 1) {
        let remain = answer_stream.answer_set.replace(html.lastChild.textContent, "");
        answer_stream.answer_set = answer_stream.answer_set.replace(remain, "");
        DOMelem.removeChild(DOMelem.lastChild);
        html.childNodes.forEach(el => {
            el.classList.add("tex2jax_process");
            DOMelem.appendChild(el);
        });
    } else if (DOMelem.childElementCount === 1) {
        DOMelem.appendChild(html.lastChild);
    } else {
        DOMelem.lastChild.innerHTML = html.lastChild.innerHTML;
    }

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
    console.log(`Model: ${model_option.model}`);
    let body_param = {model: model_option.model, messages: messages};

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
