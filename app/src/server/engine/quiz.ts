import moment from "moment";

export const srsMap = [
    moment.duration(4, "hour"),
    moment.duration(8, "hour"),
    moment.duration(1, "day"),
    moment.duration(3, "day"),
    moment.duration(1, "week"),
    moment.duration(2, "week"),
    moment.duration(4, "week"),
    moment.duration(16, "week")
];

export function getNextReview(srsLevel: number): Date {
    let toAdd = srsMap[srsLevel];
    toAdd = toAdd === undefined ? moment.duration(10, "minute") : toAdd;
    return moment().add(toAdd).toDate();
}

export function repeatReview(): Date {
    return moment().add(10, "minute").toDate();
}
