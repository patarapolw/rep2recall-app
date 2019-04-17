# Rep2Recall API

The API is automatically started when the program started running. The default PORT is `41547`, which can be set via environmental variables.

## Inserting cards

- Endpoint: `http://localhost:PORT/card/insertMany`
- Method: `POST`
- Sample body:

```json
{
    "cards": [
        {
            "front": "foo",
            "back": "bar"
        },
        {
            "front": "baz",
            "note": "baaq"
        }
    ]
}
```

## Inserting templates

- Endpoint: `http://localhost:PORT/template/insertMany`
- Method: `POST`
- Sample body:

```json
{
    "templates": [
        {
            "name": "vocab",
            "front": "{{english}}",
            "back": "{{japanese}}",
            "note": "![]({{imageUrl}})"
        }
    ],
    "data": [
        {
            "english": "love",
            "japanese": "愛",
            "imageUrl": "/img/love.png"
        }
    ]
}
```
