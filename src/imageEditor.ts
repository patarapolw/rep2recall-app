import { HotEditor } from "./renderer/hot";

const hot = new HotEditor("/img/",
    ["guid", "image", "url", "note", "tags", "md5"],
    [100, 300, 300, 300, 100, 300],
    (data) => data.map((el) => {
        el.image = `@md\n![](/img/${el.guid})`;
        return el;
    }));
