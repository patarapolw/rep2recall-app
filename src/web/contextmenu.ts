import $ from "jquery";
import "jquery-contextmenu";
import "jquery-contextmenu/dist/jquery.contextMenu.css";
// @ts-ignore
import smalltalk from "smalltalk";

// @ts-ignore
$.contextMenu({
    selector: ".tree-text",
    items: {
        rename: {
            name: "Rename",
            callback(key: any, opt: any) {
                const item = opt.$trigger.data();
                console.log(item);
            }
        },
        export: {
            name: "Export",
            callback(key: any, opt: any) {
                const item = opt.$trigger.data();
                console.log(item);
            }
        },
        delete: {
            name: "Delete Deck",
            callback(key: any, opt: any) {
                const item = opt.$trigger.data();
                smalltalk.confirm("", "Are you sure you want to delete?").then(() => {
                    item.delete();
                });
            }
        }
    }
});
