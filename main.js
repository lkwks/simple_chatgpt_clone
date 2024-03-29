import { messages, textarea, categories, model_option, API_KEY } from "./common.js";

if (API_KEY && API_KEY !== "null") document.querySelector("div.API_KEY").classList.add("hide");

document.getElementById("prompt").select();
document.querySelector("div.categories").classList.add("hide");

document.body.addEventListener("click", e=>{
    if (e.target.parentNode.classList.contains("model_option"))
        model_option.select(e.target.id, parseInt(e.target.getAttribute("token")));

    if (e.target.nodeName === "P" && e.target.classList.contains("closing_button"))
        messages.delete_message(e.target.parentNode);
    if (e.target === document.querySelector("div.prompt > input"))
    {
        if (document.querySelector("div.prompt > textarea").readOnly === false)
            textarea.send_message();
        else
            textarea.stop_stream = true;
    }

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

    if (e.target.classList.contains("title_wrapper") || e.target.classList.contains("thread_title"))
        e.target.classList.toggle("extended");

    if (e.target.nodeName === "P" && e.target.parentNode.classList.contains("thread_icon"))
        categories.delete_thread_icon(e.target.parentNode);

    if (e.target.classList.contains("category_icon"))
        categories.show_category_list(e.target.getAttribute("category_id"));
    if (e.target.classList.contains("thread_icon"))
        categories.load_thread(e.target.getAttribute("thread_id"));
});
