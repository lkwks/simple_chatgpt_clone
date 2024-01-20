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
const blinking_element = document.createElement("span");
blinking_element.classList.add("blinking-element");
setInterval(() => { blinking_element.style.opacity = blinking_element.style.opacity === '1' ? '0' : '1'; }, 500);
const availableLanguages = hljs.listLanguages();

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
        let char = msg[i];
        let prev_char = i > 0 ? msg[i - 1] : "";

        if (char === '`') {
            backtickCount++;
            if (!isCodeBlock && backtickCount === 1)
                prev_char = i > 0 ? msg[i - 1] : " ";
        }
        else {
            if ((backtickCount === 1 || backtickCount >= 3) && !isCodeBlock) {
                // 코드블럭 시작 조건: 지금 코드블럭 밖이고, 묶음 내 백틱 개수는 1개 또는 3개 이상이고, 백틱묶음 앞에 ", (가 없을 것.
                if (prev_char !== `"` && prev_char !== `(`) {
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

            if (!isCodeBlock) {
                if (['(', ')', '[', ']'].includes(char) && prev_char === "\\")
                    char = '\\' + char;
            } else if (char.includes('*')) {
                char = '\\' + char;
            }
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
    /*

    현재 어려운 점
    1. 마크다운은 `\n\n`을 기준으로 문단 구분이 이뤄지고, 따라서 이걸 기준으로 streaming이 일어나는 부분과 streaming이 종료된 부분을 구분하고 있음.
    2. 그런데 `\n\n`이 나왔다 하더라도 코드블럭 안이라면 streaming 일어나고 있는 중으로 파악해야 함. 이것 때문에 아래 코드가 매우 길고 복잡해짐.
    3. 한편 `\n\n`으로 구분한 다음에 바로 각 덩어리들을 마크다운 스타일링 할 게 아니라, MathJax 구분문자를 포함하는지 확인하고 만약 포함한다면 MathJax 적용을 먼저 하고 그 다음으로 마크다운 스타일링을 해야 함.
    4. MathJax 구분문자로 둘러 쌓인 부분이 있는지 확인하는 코드는 코드블럭 안인지 여부 확인하는 코드만큼 길고 복잡해질 듯. 그 부분을 깔끔하게 구현했으면 이것도 쉬운데, 지금 코드 구조가 전체적으로 조잡한 느낌이 있어서 굉장히 문제가 귀찮아진 점이 있음. 시간 많아지면 리팩토링 하고 다시 봐야 할 듯.
    
    */
    let codeblock_start = false, codeblock_end = false;
    for (const msg of message.split("\n\n")) {
        /*

        1. msg가 ```로 시작/끝 아니고, prev_msg도 없을 때: 그냥 splitMsg에 넣으면 됨
        2. msg가 ```로 시작/끝 아니지만, prev_msg가 있을 때: 현재 코드블럭 안에 있다는 이야기. prev_msg에 추가해줘야 한다.
        3. msg가 ```로 시작/끝인데, prev_msg가 없을 때: 코드블럭의 시작일 수도 있고, 시작과 끝이 다 들어있을 수 있다.
            시작만 한다면 prev_msg를 채워주는 걸로 충분. 시작과 끝이 다 들어 있다면 splitMsg에 넣어야 함.
        4. msg가 ```로 시작/끝이고, prev_msg가 있을 때: 확실히 코드블럭의 끝. prev_msg를 비워줘야 한다.

        */

        const pattern = /(\s*```)/g;
        let match;
        codeblock_start = false, codeblock_end = false;
        while ((match = pattern.exec(msg)) !== null) {
            console.log(match);
            if ((match.index > 0 && msg[match.index - 1] === '\n' || match.index === 0) && !codeblock_start) {
                codeblock_start = true;
                console.log("codeblock start");
            } else if (msg.length >= match.index + match[0].length && (msg[match.index + match[0].length] === '\n' || msg.length === match.index + match[0].length)) {
                codeblock_end = true;
                console.log("codeblock end");
            }
        }

        if (!codeblock_start && !codeblock_end) {
            if (prev_msg === "")
                splitMsg.push(escapeParentheses(msg));
            else
                prev_msg += "\n\n" + msg;
        } else {
            if (prev_msg === "") {
                if (codeblock_end)
                    splitMsg.push(escapeParentheses(msg));
                else
                    prev_msg = msg;
            } else {
                splitMsg.push(escapeParentheses(prev_msg + "\n\n" + msg));
                prev_msg = "";
            }
        }
    }
    var empty_element = document.createElement("pre");
    if (!answer_stream.now_streaming || splitMsg.length > 1) {
        let html = "";

        if (answer_stream.now_streaming) {
            DOMelem.removeChild(DOMelem.lastChild);

            empty_element.innerHTML = splitMsg[splitMsg.length - 1];
            answer_stream.answer_buffer = splitMsg[splitMsg.length - 1];

            splitMsg.pop();
            const message_joined = splitMsg.join("\n\n")
            html = markdown_converter.makeHtml(message_joined);
        } else {
            console.log(message);
            html = markdown_converter.makeHtml(message);
        }

        var html_element = new DOMParser().parseFromString(html, 'text/html').body;
        html_element.childNodes.forEach(async el => {
            if (el.tagName === "P") el.innerHTML = el.innerHTML.replace(/\n/g, "<br>");
            if (el.tagName === "PRE" && el.querySelector("code")) {
                const code_el = el.querySelector("code");
                if (!Array.from(code_el.classList).some(cls => availableLanguages.includes(cls)))
                    code_el.className = '';
                hljs.highlightElement(code_el);
            }
            el.querySelectorAll('code').forEach(el => el.classList.add("tex2jax_ignore"));
            el.classList.add("tex2jax_process");
            DOMelem.appendChild(el);
        });

        if (answer_stream.now_streaming && !empty_element.innerText.includes("ENDOFSTREAM")) DOMelem.appendChild(empty_element);
    } else if (DOMelem.childElementCount > 1)
        DOMelem.lastChild.innerHTML = `${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}${blinking_element.outerHTML}`;
    else {
        empty_element.innerHTML = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        DOMelem.appendChild(empty_element);
    }
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
