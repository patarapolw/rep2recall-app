# rep2recall

Repeat until you can recall, as a Desktop app.

Download: <https://github.com/patarapolw/rep2recall/releases>

![](/screenshots/front.png?raw=true)

![](/screenshots/deck.png?raw=true)

![](/screenshots/deck1.png?raw=true)

![](/screenshots/quiz1.png?raw=true)

![](/screenshots/quiz2.png?raw=true)

![](/screenshots/cardEditor.png?raw=true)

## Features

- File-based
- Can be a single file, or can have a folder of images alongside (e.g. `filename.r2rdb` and `filename/image.png`). The default location of `*.r2r` is determined by `appdirs`, but can be set via `COLLECTION` environmental variable.
- Markdown enabled
- Decks, subdecks, tags supported
- Anki import enabled.
- Exposed API, can add cards via programming. The port is `41547` (can be set via `PORT` environmental variable). (See [/api.md](/api.md))

## Why not SQLite?

SQLite-based Rep2Recall is maintained at <https://github.com/patarapolw/rep2recall-kt>
