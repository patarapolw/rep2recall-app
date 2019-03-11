import { HotEditor } from "./renderer/hot";

const hot = new HotEditor("/card/",
    ["id", "deck", "front", "back", "note", "tags", "srsLevel", "nextReview"],
    [100, 200, 300, 300, 300, 100, 100, 200]);