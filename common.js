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

// 하나 또는 셋 이상의 백틱으로 둘러싸인 안쪽 문자열 외에 그 바깥의 모든 문자열에 대해 \(, \[, \), \]가 있다면 이스케이프를 추가하는 코드가 필요. 이를 LaTex 처리를 위한 문자로 지정했는데 문자열을 이런 이스케이프 없이 마크다운 처리기에 넣었더니 그냥 (, [를 위한 이스케이프로 처리하기 때문.
function escapeParentheses(msg) {
    let isCodeBlock = false;
    let backtickCount = 0;
    let startBacktickCount = 0;
    let output = '';
    let prev_char = '';

    for (let i = 0; i < msg.length; i++) {
        const char = msg[i];

        if (char === '`') {
            backtickCount++;
            if (!isCodeBlock && backtickCount === 1)
                prev_char = i > 0 ? msg[i - 1] : " ";
        }
        else {
            if ((backtickCount === 1 || backtickCount >= 3) && !isCodeBlock) {
                // 코드블럭 시작 조건: 지금 코드블럭 밖이고, 묶음 내 백틱 개수는 1개 또는 3개 이상이고, 백틱묶음 앞에 "가 없을 것.
                if (prev_char !== `"`) {
                    isCodeBlock = true;
                    startBacktickCount = backtickCount;
                } else {
                    output = output.substring(0, output.length - backtickCount) + "\\`".repeat(backtickCount);
                }
            } else if (isCodeBlock && backtickCount === startBacktickCount) {
                // 코드블럭 종료 조건: 가장 최근 백틱 개수가 시작 때 백틱 개수랑 같을 것
                isCodeBlock = false;
                startBacktickCount = 0;
            }

            backtickCount = 0;

            if (!isCodeBlock && ['(', ')', '[', ']'].includes(char))
                output += '\\';
        }

        output += char;
    }

    return output;
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
        message = `\`${system_message}\` "${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}"`;

    var markdown_converter = new showdown.Converter();
    var splitMsg = [], prev_msg = "";
    for (const msg of message.split("\n\n")) {
        /*

        1. msg가 ```로 시작/끝 아니고, prev_msg도 없을 때: 그냥 splitMsg에 넣으면 됨
        2. msg가 ```로 시작/끝 아니지만, prev_msg가 있을 때: 현재 코드블럭 안에 있다는 이야기. prev_msg에 추가해줘야 한다.
        3. msg가 ```로 시작/끝인데, prev_msg가 없을 때: 코드블럭의 시작일 수도 있고, 시작과 끝이 다 들어있을 수 있다.
            시작만 한다면 prev_msg를 채워주는 걸로 충분. 시작과 끝이 다 들어 있다면 splitMsg에 넣어야 함.
        4. msg가 ```로 시작/끝이고, prev_msg가 있을 때: 확실히 코드블럭의 끝. prev_msg를 비워줘야 한다.

        */
        if (!(/`{3,}$/.test(msg) || /^`{3,}/.test(msg))) {
            if (!prev_msg)
                splitMsg.push(escapeParentheses(msg));
            else
                prev_msg += msg;
        } else {
            if (!prev_msg) {
                if (/`{3,}$/.test(msg))
                    splitMsg.push(escapeParentheses(msg));
                else
                    prev_msg = msg;
            } else {
                splitMsg.push(escapeParentheses(prev_msg + msg));
                prev_msg = "";
            }
        }
    }
    var empty_element = document.createElement("pre");
    if (!answer_stream.now_streaming) {
        var html = markdown_converter.makeHtml(message);
        var html_element = new DOMParser().parseFromString(html, 'text/html').body;
        html_element.childNodes.forEach(el => DOMelem.appendChild(el));
    } else if (splitMsg.length > 1) {
        DOMelem.removeChild(DOMelem.lastChild);

        empty_element.innerHTML = splitMsg[splitMsg.length - 1];
        answer_stream.answer_buffer = splitMsg[splitMsg.length - 1];

        splitMsg.pop();
        console.log(splitMsg.join("\n\n"));
        var html = markdown_converter.makeHtml(splitMsg.join("\n\n"));
        var html_element = new DOMParser().parseFromString(html, 'text/html').body;
        html_element.childNodes.forEach(el => {
            el.classList.add("tex2jax_process");
            el.querySelectorAll('code').forEach(el => el.classList.add("tex2jax_ignore"));
            DOMelem.appendChild(el)
        });
        DOMelem.appendChild(empty_element);
    } else if (DOMelem.childElementCount > 1)
        DOMelem.lastChild.innerHTML = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    else {
        empty_element.innerHTML = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        DOMelem.appendChild(empty_element);
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
