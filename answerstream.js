import { post_process, response_div } from "./common.js";

export class AnswerStream{
    constructor()
    {
        this.now_streaming = false;
        this.answer_set = "";
        this.answer_buffer = "";
        this.signal = false;
    }
    
    start()
    {
        if (this.now_streaming === false)
        {
            this.answer_set = "";
            this.answer_buffer = "";
            this.now_streaming = true;
            this.signal = false;
        }
    }
    
    async add_answer(answer)
    {
        this.answer_set += answer;
        this.answer_buffer += answer;
        post_process(response_div.$target.lastChild, this.answer_buffer);
    }
    
    end()
    {        
        post_process(response_div.$target.lastChild, this.answer_buffer + "\n\n");
        this.signal = false;
        this.now_streaming = false;
    }
}

