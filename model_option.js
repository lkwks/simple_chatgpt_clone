export class ModelOption {
    constructor($target) {
        this.$target = $target;
        this.model = "";
        this.token = 0;
        this.select("gpt-3.5-turbo", 4096);
    }

    select(model, token) {
        this.$target.querySelector(`button[id="${this.model}"]`).classList.remove("selected");
        this.model = model;
        this.token = token;
        this.$target.querySelector(`button[id="${this.model}"]`).classList.add("selected");
    }
}