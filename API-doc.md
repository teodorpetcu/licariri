# API documentation

All requests must have a valid `session` cookie, received upon logging in.

(you may also need a valid `cf_clearance` cookie?)

## Login, logout

### POST `/login`

Effect: add `session` cookie if login succeeds

#### body parameters

- `username`
- `password`
- `remember_me`

### POST `/admin/logout`

Effect: revokes validity of `session` cookie

#### Body parameters

(none)

## User management

### POST `/admin/user/add`

#### Body parameters

- `id` - username of the to-be created user
- `privilege` - privilege level of the new user

### POST `/admin/user/password`

Change password of the requesting user

#### Body parameters

- `original` - original password
- `password` - new password

### POST `/admin/user/suspend`

#### Body parameters

- `id` - username of user to be suspended
- `suspend` - if `1`, suspend user, otherwise UNsuspend user

## Articles & magazines

### POST `/admin/articles/:articleID`

Effect: if `articleID` isn't associated with any article already, create a new
article, otherwise modify an existing article

#### Body parameters

- `stage`
- `title`
- `subtitle`
- `language`
- `category`
- `authors[]`
- `tags[]`
- `content` - markdown text contents of the article
- `credit_editorial` - name of the editor
- `credit_dtp` - name of the designer
- `credit_thumbnail` - name of the illustrator of the thumbnail

### POST `/admin/articles/stage`

Effect: change processing stage of specified article

#### Body parameters

- `id` - article id
- `stage` - stage to set for the corresponding article (`trash`, `draft`, `public`)

### POST `/admin/articles/remove`

Effect: remove article

#### Body parameters

- `id` - ID of target article

### POST `/admin/magazines/add`

Effect: Add new entry for a magazine

#### Body parameters

- `date`
- `description` - practically, title of magazine

#### File parameters

- `pdffile`

### POST `/admin/magazines/remove`

Effect: remove specified magazine

#### Body parameters

- `description`
