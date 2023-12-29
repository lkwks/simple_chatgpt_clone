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
// 더불어, answer_stream.answer_buffer 내용도 적당히 지워준다.
function post_process(DOMelem, message, system_message="") {
    let result = ""; 
    if (message.endsWith("\n-"))
        message = message.substring(0, message.length - 2);

    if (system_message)
        message = `\`${system_message}\` "${message}"`;
    
    var markdown_converter = new showdown.Converter();
    var html = document.createElement("p");
    html.innerHTML = markdown_converter.makeHtml(message);
    console.log(message);
    console.log(html.innerHTML);

    // html(answer_stream.answer_buffer을 마크다운 포매팅)의 자식 엘리먼트가 둘 이상인 경우.
    if (html.childElementCount > 1) {
        let lastIdx = answer_stream.answer_buffer.lastIndexOf(html.lastChild.textContent);
        let remain = answer_stream.answer_buffer.substring(0, lastIdx);
        console.log(answer_stream.answer_buffer);
        console.log(remain);
        if (answer_stream.answer_buffer !== remain && answer_stream.answer_buffer.split("```").length % 2 !== 0 && answer_stream.answer_buffer.split("```")[0].split("`").length % 2 !== 0) {
            // DOMelem의 마지막 자식은 텍스트 스트림이 일어나고 있었던 엘리먼트.
            // html의 자식 엘리먼트가 둘 이상이란 이야기는, DOMelem의 기존 마지막 자식에 관한 스트림이 끝났단 이야기. 기존 미완성품 지워줘야.
            console.log(DOMelem.lastChild);
            DOMelem.removeChild(DOMelem.lastChild);

            // answer_stream.answer_buffer에서는 이미 엘리먼트가 다 완성된 부분의 텍스트를 지워준다.
            // 이로써 answer_stream.answer_buffer에는 DOMelem의 마지막 자식 내 텍스트 스트림을 위한 텍스트만 남는다.
            answer_stream.answer_buffer = answer_stream.answer_buffer.replace(remain, "");

            html.childNodes.forEach(el => {
                console.log(el);
                if (el.classList)
                    el.classList.add("tex2jax_process");
            });
            DOMelem.innerHTML += html.innerHTML;
        }
    } else if (DOMelem.childElementCount === 1 && html.lastChild) {
        console.log("append one");
        DOMelem.appendChild(html.lastChild);
    } else if (html.lastChild) {
        DOMelem.lastChild.innerHTML = html.lastChild.innerHTML;
    } else {
        DOMelem.appendChild(html);
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
