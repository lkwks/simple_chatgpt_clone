import {thread} from "./common.js";

export class Categories{
    constructor($target)
    {
        this.$target = $target;
        this.categories = JSON.parse(localStorage.getItem("categories"));
        this.threads = JSON.parse(localStorage.getItem("threads"));
        if (! this.categories) this.categories = ["ETC"];
        if (! this.threads) this.threads = [];
        this.show_category_list(-1);
    }


    add(category_name)
    {
        for (var i=0; i<this.categories.length; i++)
            if (this.categories[i] === category_name) return false;
        this.categories.push(category_name);
        localStorage.setItem("categories", JSON.stringify(this.categories));
        return true;
    }

    modify(old_name, new_name)
    {
        for (var i=0; i<this.categories.length; i++)
            if (this.categories[i] === old_name)
            {
                this.categories[i] = new_name;
                localStorage.setItem("categories", JSON.stringify(this.categories));
                return true;
            }
        return false;
    }

    add_this_thread()
    {
        this.threads.push({category_id: thread.category_id, title: thread.title});
        localStorage.setItem("threads", JSON.stringify(this.threads));
        localStorage.setItem(`thread_${thread.id}`, localStorage.getItem("thread_temp"));
    }

    render_icon(type, elem, i, clicked_id)
    {
        const div = document.createElement("div");
        div.classList.add(`${type}_icon`);
        div.setAttribute(`${type}_id`, i);
        div.innerHTML = `${elem}<p>x</p>`;
        if (parseInt(clicked_id) === parseInt(i))
            div.classList.add("clicked");
        return div;
    }

    delete_thread_icon(elem)
    {
        document.querySelector("div.categories_content").removeChild(elem);
        let thread_id = parseInt(elem.getAttribute("thread_id"));
        localStorage.setItem(`thread_${thread_id}`, "");
        this.threads[thread_id] = null;
        localStorage.setItem("threads", JSON.stringify(this.threads));
    }

    show_category_list(clicked_id)
    {
        this.$target.querySelector("div.categories_title").innerHTML = "";

        this.$target.querySelector("div.categories_title").appendChild(this.render_icon("category", "All", -1, clicked_id));
        this.categories.forEach( (elem, i) => {
            if (elem) //null인 경우 있음
            {
                const div = this.render_icon("category", elem, i, clicked_id);
                this.$target.querySelector("div.categories_title").appendChild(div);
            }
        });

        this.show_threads(clicked_id);
    }

    show_threads(category_id)
    {
        this.$target.querySelector("div.categories_content").innerHTML = "";

        this.threads.forEach((elem, i) => {
            if (elem && (parseInt(elem.category_id) === parseInt(category_id) || parseInt(category_id) === -1))
                this.$target.querySelector("div.categories_content").appendChild(this.render_icon("thread", elem.title, i));
        });
    }

    load_thread(thread_id)
    {
        document.querySelector("div.categories").classList.toggle("hide");
        document.querySelector("div.thread_title").innerText = this.threads[parseInt(thread_id)].title;
        thread.load_thread(thread_id);
    }

}
