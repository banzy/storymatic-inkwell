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

Collections are created automatically as you use the app. To start over during
development, drop the `storymatic` database from MongoDB, then reload the app.

There is no login flow or cloud database connection in this local setup.
