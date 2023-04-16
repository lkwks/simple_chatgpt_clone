import {messages, chatgpt_api, sleep} from "./common.js";

export class Thread{
    constructor()
    {
        this.title = "";
        this.id = null;
        this.category_id = 0;
        this.title_making = false;
    }

    async make_title()
    {
        if (this.title_making) return;
        this.title_making = true;
        await chatgpt_api([...messages.messages, 
            {role:"user", content: "By the way, which title would be the best \
that summarizes our conversation so far? Answer in less than five words, in the language you used."
            }]).then(outputJson => {
                console.log(outputJson.choices[0].message.content);
                this.title = outputJson.choices[0].message.content.split(" (")[0].replace("Title: ", "").trim().replace(/"/g, "");
                document.querySelector("div.thread_title").innerText = this.title;
            }).catch(e=>{console.log(e)});

        this.id = categories.threads.length;        
        
        const filteredArr = categories.categories.filter(el => el !== "");
        await chatgpt_api([...messages.messages, 
            {role:"user", content: `By the way, which category would be the best \
if you put the summary our conversation so far into it? \
You should find the category among the elements in this JS array: ${JSON.stringify(filteredArr)} \
Answer in this format: "The index of the category: {number}"`
            }]).then(outputJson => {
                console.log(outputJson.choices[0].message.content);

                let output_index = outputJson.choices[0].message.content.split("The index of the category: ")[1].replace(`"`, "").split(" ")[0];
                if (isNaN(output_index) === false)
                    categories.categories.forEach((elem, i) =>
                    {
                        if (elem === filteredArr[parseInt(output_index)])
                            this.category_id = i;
                    });

                categories.add_this_thread();
            }).catch(e=>{console.log(e); categories.add_this_thread();});
    }


    // 스레드 이동했을 때 싹 비우고 로컬 스토리지에 있었던 메시지를 하나씩 불러오는 코드
    async load_thread(thread_id)
    {
        messages.reset();

        const thread_temp = JSON.parse(localStorage.getItem(`thread_${thread_id}`));
        this.id = thread_id;
        for (var elem of thread_temp)
        {
            messages.push_message(elem, true);
            await sleep(10);
        }
    }

    // localStorage의 thread_{num}을 계속 업데이트 하는 코드
    push(elem, now_streaming=false)
    {
        let thread_id = (this.id || this.id === 0) ? `thread_${this.id}` : "thread_temp";
        let thread_temp = JSON.parse(localStorage.getItem(thread_id));
        if (thread_temp) 
        {
            if (now_streaming === false)
                thread_temp.push(elem);
            else
                thread_temp[thread_temp.length-1] = elem; // 현재 스트리밍 중이라면 마지막 메시지를 업데이트
        }
        else 
        {
            // 현재 thread_temp가 비어있다면 elem으로 초기화. 이 경우는 첫 엘리먼트의 role이 user일 때만 발생. 즉, 스트리밍이 시작되기 전에만 발생.
            thread_temp = [elem];
        }
        localStorage.setItem(thread_id, JSON.stringify(thread_temp));
    }

}
