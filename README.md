# rep2recall

** _Further update is done at <https://github.com/patarapolw/rep2recall-py> as SQLite-based version._

Repeat until you can recall, as a Desktop app.

Download: <https://github.com/patarapolw/rep2recall/releases>

![](http://g.recordit.co/6qMffliqFv.gif)

## Features

- File-based
- Can be a single file, or can have a folder of images alongside (e.g. `filename.r2rdb` and `filename/image.png`). The default location of `*.r2r` is determined by `appdirs`, but can be set via `COLLECTION` environmental variable.
- Markdown enabled
- Decks, subdecks, tags supported
- Anki import enabled.
- Exposed API, can add cards via programming. The port is `41547` (can be set via `PORT` environmental variable). (See [/api.md](/api.md))

## Why not SQLite?

SQLite-based Rep2Recall is maintained at <https://github.com/patarapolw/rep2recall-py>
