import moment from "moment";

export class QuizResource {
    public static srsMap = ["4h", "8h", "1d", "3d", "1w", "2w", "1M", "4M"];

    public static getNextReview(srsLevel: number): Date {
        const toAdd = QuizResource.srsMap[srsLevel - 1];
        const nextReview = moment();
        if (toAdd === undefined) {
            nextReview.add(10, "minute");
            return nextReview.toDate();
        }
        const toAddNumber = parseInt(toAdd[0]);

        switch (toAdd[1]) {
            case "h":
                nextReview.add(toAddNumber, "hour");
                break;
            case "d":
                nextReview.add(toAddNumber, "day");
                break;
            case "w":
                nextReview.add(toAddNumber, "week");
                break;
            case "M":
                nextReview.add(toAddNumber, "month");
        }

        return nextReview.toDate();
    }

    public static repeat(): Date {
        return moment().add(10, "minute").toDate();
    }
}

export default QuizResource;
