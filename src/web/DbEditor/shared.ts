export const dbEditorState = {
    cardEditor: {
        data: [] as any[],
        sortBy: "deck",
        desc: false
    },
    editor: {
        text: {} as any,
        html: {
            quill: {} as any
        } as any,
        list: {
            valueDict: {} as any
        } as any
    },
    counter: {
        page: {
            offset: 0,
            limit: 10,
            count: 0
        },
        instance: null as any,
        isActive: false,
        addEntry: false,
        canAddEntry: true
    },
    searchBar: {
        q: "",
        instance: null as any,
        isActive: false
    }
};

export default dbEditorState;
