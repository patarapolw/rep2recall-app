import { mongoToFilter } from "../build/engine/search";

console.log([{data: {x: "Hanzi"}}].filter(mongoToFilter({x: {$regex: "hanzi"}})));

