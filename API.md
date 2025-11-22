
## API Documentation

This doc is me reverse engineering the notes on torn.com


I don't know of the limitations of the title and text fields of a note so currently both are uncapped


### Get notes

returns the user's notes

https://www.torn.com/chat/notes

Not sure how `id` differs from `_id` but the endpoints seem to use `_id` 

```JSON
{
  "notes": [
    {
      "_id": "564d98eefcf6a133a98b85fd",
      "id": "24299",
      "uid": "1514924", // user id
      "title": "Baby's First Note", // text title of the note
      "text": "The content of my note" // text body of the note
    },
  ]
}
```

### Create note

Create a note (Having stripped out all the optional HTTP Headers)

```JavaScript
fetch("https://www.torn.com/chat/notes", { 
  "headers": {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  },
  "referrer": "https://www.torn.com/profiles.php?XID=1514924", // if referrer isn't set then the request fails, defaulting to my profile for simplicity
  "body": "{\"title\":\"Note\",\"text\":\"\"}",
  "method": "POST",
  "mode": "cors",
  "credentials": "include"
});
```


### Update note

updates an existing note

```JavaScript
fetch("https://www.torn.com/chat/notes/<NOTE_ID>", {
  "headers": {
    'Content-Type': 'text/plain;charset=UTF-8'
  },
  "referrer": "https://www.torn.com/profiles.php?XID=1514924",
  "body": "{\"lastModifiedTimestamp\":1758586077936,\"title\":\"Note\",\"text\":\"hi mom\"}",
  "method": "PUT",
  "mode": "cors",
  "credentials": "include"
});
```

### Delete note

deletes a note

```JavaScript
fetch("https://www.torn.com/chat/notes/<NOTE_ID>", {
  "method": "DELETE",
  "credentials": "include"
});
```
