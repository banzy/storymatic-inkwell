# Local MongoDB

Storymatic now stores all application data in the local MongoDB database configured
by `MONGODB_URI` and `MONGODB_DB`.

## Start the app

Ensure MongoDB is running, then use the values in `.env` or copy
`.env.local.example` to `.env.local`:

```sh
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=storymatic
npm run dev
```

Collections are created automatically as you use the app. Existing projects and
manuscripts are preserved. The conversation engine adds a `book_engines` collection.

There is no login flow or cloud database connection in this local setup.
This is a local, single-user application; keep the development server on your own machine.

For the AI configuration, conversation workflow, verification commands and current
limits, see [the engine guide](./STORYMATIC_ENGINE.md). Persistence is local; AI
requests send selected book content to the configured provider.
