import moment from "moment";

export class QuizResource {
    public static srsMap = [
        moment.duration(4, "hour"),
        moment.duration(8, "hour"),
        moment.duration(1, "day"),
        moment.duration(3, "day"),
        moment.duration(1, "week"),
        moment.duration(2, "week"),
        moment.duration(1, "month"),
        moment.duration(4, "month")
    ];

    public static getNextReview(srsLevel: number): Date {
        const toAdd = QuizResource.srsMap[srsLevel - 1];
        const nextReview = moment();
        if (toAdd === undefined) {
            nextReview.add(10, "minute");
            return nextReview.toDate();
        }

        return nextReview.add(toAdd).toDate();
    }

    public static repeat(): Date {
        return moment().add(10, "minute").toDate();
    }
}

export default QuizResource;
