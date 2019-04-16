import { fetchJSON } from "../util";
import globalState from "../shared";
import dbEditorState from "./shared";

export async function updateServer(endpoint: string, id: number, fieldName: string, fieldData: any) {
    return await fetchJSON(endpoint, {
        id, fieldName, fieldData
    }, "PUT");
}
