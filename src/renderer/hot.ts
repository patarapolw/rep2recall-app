import Handsontable from "handsontable";
import "handsontable/dist/handsontable.min.css";
import "./hot.css";
import $ from "jquery";
import yaml from "js-yaml";
import showdown from "showdown";
import { fetchJSON } from "./util";

interface IPage {
    current: number;
    count: number;
    from: number;
    to: number;
    total: number;
    batchSize: number;
}

export class HotEditor {
    private apiEndPoint: string;
    private colHeaders: string[];
    private colWidths: number[];
    private dataModifier: (x: any[]) => any[];

    private hot?: Handsontable;
    private page: IPage;
    private colHeaderSettings: any;
    private el: any;

    constructor(apiEndPoint: string, colHeaders: string[], colWidths: number[],
                dataModifier?: (x: any[]) => any[]) {

        this.apiEndPoint = apiEndPoint;
        this.colHeaders = colHeaders;
        this.colWidths = colWidths;
        this.dataModifier = dataModifier || ((x) => x);

        this.page = {
            current: 1,
            count: 1,
            from: 0,
            to: 0,
            total: 0,
            batchSize: 10
        };
        this.colHeaderSettings = colHeaders
            .reduce((o, key) => ({ ...o, [key]: {type: "string"}}), {});

        this.el = {
            searchBar: document.getElementById("search-bar") as HTMLInputElement,
            prevAll: document.getElementById("prev-all") as HTMLButtonElement,
            prev: document.getElementById("prev") as HTMLButtonElement,
            next: document.getElementById("next") as HTMLButtonElement,
            nextAll: document.getElementById("next-all") as HTMLButtonElement,
            pageLabelCurrent: document.getElementById("page-label-current") as HTMLDivElement,
            pageLabelTotal: document.getElementById("page-label-total") as HTMLDivElement,
            hotContainer: document.getElementById("hot-container") as HTMLDivElement,
            hotArea: document.getElementById("hot-area") as HTMLDivElement,
            navArea: document.getElementById("nav-area") as HTMLDivElement
        };

        this.fetchCurrentPage();

        document.body.addEventListener("keydown", (e) => {
            e = e || window.event;
            const key = e.which || e.keyCode;
            const keyF = 102;
            const keyf = 70;

            if ((key === keyf || key === keyF) && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.el.searchBar.focus();
            }
        });

        this.el.searchBar.addEventListener("keyup", () => {
            const s = this.el.searchBar.value;

            try {
                const cond = yaml.safeLoad(s);
                if (typeof cond === "object") {
                    this.page.current = 1;
                    this.fetchCurrentPage(cond);
                } else {
                    throw new Error("YAML error");
                }
            } catch (e) {
                if (s === "") {
                    this.page.current = 1;
                    this.fetchCurrentPage();
                }
            }
        });

        $(".page-button").prop("disabled", true);

        this.el.prevAll.onclick = () => {
            this.page.current = 1;
            this.readSearchBarValue();
        };

        this.el.prev.onclick = () => {
            this.page.current--;
            this.readSearchBarValue();
        };

        this.el.next.onclick = () => {
            this.page.current++;
            this.readSearchBarValue();
        };

        this.el.nextAll.onclick = () => {
            this.page.current = this.page.count;
            this.readSearchBarValue();
        };

        window.addEventListener("resize", () => {
            const dimension = this.getTrueWindowDimension();
            const wtHolders = document.getElementsByClassName("wtHolder");

            Object.assign(this.el.hotContainer.style, dimension);

            if (wtHolders.length > 0) {
                Object.assign((wtHolders[0] as HTMLDivElement).style, dimension);
            }
        });
    }

    private async fetchCurrentPage(query?: any) {
        this.page.from = (this.page.current - 1) * this.page.batchSize + 1;

        const r = await fetchJSON(`${this.apiEndPoint}`, {
            query: query || {},
            offset: this.page.from,
            limit: this.page.batchSize
        });

        this.loadData(r.data);

        this.page.to = this.page.from - 1 + this.page.batchSize;
        this.page.total = r.total;
        this.page.count = Math.ceil(this.page.total / this.page.batchSize);
        this.setPageNav();
    }

    private setPageNav() {
        this.el.pageLabelCurrent.innerText = `${this.page.from}-${this.page.to}`;
        this.el.pageLabelTotal.innerText = this.page.total.toString();

        this.el.prevAll.disabled = this.el.prev.disabled = !(this.page.from > 1);
        this.el.nextAll.disabled = this.el.next.disabled = !(this.page.to < this.page.total);
    }

    private loadData(data: any[]) {
        if (this.hot) {
            this.hot.destroy();
        }

        Object.assign(this.el.hotContainer.style, this.getTrueWindowDimension());

        const colHeaders = this.colHeaders;
        const dataArray = this.dataModifier(data).map((item) => {
            return colHeaders.map((colName) => {
                const d = item[colName];

                if (Array.isArray(d)) {
                    this.colHeaderSettings[colName].type = "array";
                    return d.join("\n");
                } else {
                    return d;
                }
            });
        });
        dataArray.push([]);
        this.hot = new Handsontable(this.el.hotArea, {
            colHeaders,
            minSpareRows: 1,
            minCols: colHeaders.length,
            minRows: 1,
            colWidths: this.colWidths,
            manualColumnResize: true,
            renderer: wrappingRenderer,
            contextMenu: [
                "copy",
                "remove_row",
                "---------",
                "undo",
                "redo"
            ],
            data: dataArray,
            afterChange: (changes, source) => {
                if (source !== "loadData") {
                    changes!.forEach((c) => {
                        if (c[2] !== c[3] && c[1] !== 0) {
                            const id = this.hot!.getDataAtCell(c[0], 0);
                            const fieldName = colHeaders[c[1] as number];
                            const oldData = c[2];
                            const _fieldData = c[3];

                            let fieldData: string[] | string;
                            if (this.colHeaderSettings[fieldName].type === "array") {
                                fieldData = _fieldData.toString().split("\n");
                            } else {
                                fieldData = _fieldData;
                            }

                            fetchJSON(this.apiEndPoint, {
                                id,
                                fieldName,
                                fieldData
                            }, "PUT")
                            .then((r) => {
                                if (typeof r === "object") {
                                    [r] = this.dataModifier([r]);

                                    Object.keys(r).forEach((k) => {
                                        const colNumber = colHeaders.indexOf(k);
                                        if (colNumber !== -1) {
                                            this.hot!.setDataAtCell(c[0], colNumber, r[k]);
                                        }
                                    });
                                } else if (r === 201) {
                                } else {
                                    alert("Not modified");
                                    this.hot!.setDataAtCell(c[0], fieldName, oldData);
                                }
                            })
                            .catch((e) => {
                                alert(`Not modified: ${e}`);
                                this.hot!.setDataAtCell(c[0], fieldName, oldData);
                            });
                        }
                    });
                }
            },
            beforeRemoveRow: (index, amount) => {
                if (amount > 1) {
                    return false;
                }

                const _id = this.hot!.getDataAtCell(index, 0);
                fetchJSON(this.apiEndPoint, {_id}, "DELETE")
                .then((r) => {
                    if (r !== 201) {
                        alert("Not modified");
                        // hot!.setDataAtCell(c[0], fieldEdited, c[2]);
                    }
                })
                .catch((e) => {
                    alert(`Not modified: ${e}`);
                    // hot!.setDataAtCell(c[0], fieldEdited, c[2]);
                });

                return true;
            },
            afterCreateRow: () => {
                this.page.to++;
                this.page.total++;
            }
        });
    }

    private readSearchBarValue() {
        const s = this.el.searchBar.value;

        try {
            const cond = yaml.safeLoad(s);
            if (typeof cond === "object") {
                this.fetchCurrentPage(cond);
            } else {
                throw new Error("YAML error");
            }
        } catch (e) {
            this.fetchCurrentPage();
        }
    }

    private getTrueWindowDimension() {
        return {
            height: (window.innerHeight
                - this.el.navArea.offsetHeight
                - 10) + "px",
            width: window.innerWidth + "px"
        };
    }
}

const mdMarkerRegex = /^@md[^\n]*\n(.+)/s;
const mdConverter = new showdown.Converter();

function wrappingRenderer(
        instance: any, td: HTMLElement, row: any, col: any, prop: any, value: any, cellProperties: any) {
    const escaped = Handsontable.helper.stringify(value);
    const cellWrapperDiv = document.createElement("div");
    cellWrapperDiv.className = "cell-wrapper";

    mdMarkerRegex.lastIndex = 0;
    const m = mdMarkerRegex.exec(escaped);

    if (m) {
        cellWrapperDiv.innerHTML = mdConverter.makeHtml(m[1]);
    } else {
        const cellWrapperPre = document.createElement("pre");
        cellWrapperPre.innerText = escaped;
        cellWrapperDiv.appendChild(cellWrapperPre);
    }

    td.innerHTML = "";
    td.appendChild(cellWrapperDiv);

    return td;
}
