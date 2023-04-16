export class ResponseDiv{
    constructor($target)
    {
        this.$target = $target;
    }

    remove(elem)
    {
        this.$target.removeChild(elem);
    }

    render_message(elem)
    {
        if (elem.content === "continue") return;

        this.$target.appendChild(elem);
    }
}
