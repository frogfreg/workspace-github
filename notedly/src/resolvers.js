const { v4: uuidv4 } = require("uuid");
const { GraphQLDateTime } = require("graphql-iso-date");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const { getPokemonSprite } = require("./utils.js");

const resolvers = {
  Query: {
    hello: (parent, args, { db }) => {
      return "Hello World!";
    },
    notes: async (parent, args, { db }) => {
      try {
        const res = await db.query("SELECT * FROM notes LIMIT 100");
        return res.rows;
      } catch (err) {
        throw new Error(err);
      }
    },
    note: async (parent, args, { db }) => {
      try {
        const res = await db.query("SELECT * FROM notes WHERE id = $1", [
          args.id,
        ]);
        return res.rows[0];
      } catch (err) {
        throw new Error(err);
      }
    },
    user: async (parent, args, { db }) => {
      const queryResult = await db.query(
        "SELECT * FROM users WHERE username = $1",
        [args.username]
      );

      if (queryResult.rowCount === 0) {
        throw new Error("User not found");
      }

      const userData = queryResult.rows[0];

      const userNotes = await db.query(
        'SELECT notes.id, notes.content, notes."authorId", notes."createdAt", notes."updatedAt" FROM notes, users WHERE notes."authorId" = $1',
        [userData.id]
      );

      userData.notes = userNotes.rows;

      return userData;
    },
    users: async (parent, args, { db }) => {
      const queryResult = await db.query("SELECT * FROM users");
      return queryResult.rows;
    },
    me: async (parent, args, { db, user }) => {
      if (!user) {
        throw new Error("You must be logged in to see this data");
      }

      const queryResult = await db.query("SELECT * FROM users WHERE id = $1", [
        user.id,
      ]);

      return queryResult.rows[0];
    },
  },
  Mutation: {
    newNote: async (parent, args, { db, user }) => {
      if (!user) {
        throw new Error("You must be signed in to create a note");
      }

      const noteId = uuidv4();

      await db.query("INSERT INTO notes VALUES ($1,$2,$3)", [
        noteId,
        args.content,
        user.id,
      ]);

      const result = await db.query("SELECT * FROM notes WHERE id = $1", [
        noteId,
      ]);

      return result.rows[0];
    },
    updateNote: async (parent, args, { db, user }) => {
      if (!user) {
        throw new Error("You must be signed in to edit a note");
      }

      try {
        const res = await db.query(
          'UPDATE notes SET content = $1, "updatedAt" = NOW()  WHERE id = $2 AND "authorId" = $3',
          [args.content, args.id, user.id]
        );

        if (res.rowCount === 0) {
          throw new Error(
            "note was not updated, maybe note does not exist or you do not have the permission"
          );
        }

        const updatedNote = await db.query(
          "SELECT * from notes WHERE id = $1",
          [args.id]
        );

        return updatedNote.rows[0];
      } catch (err) {
        throw new Error(err);
      }
    },
    deleteNote: async (parent, args, { db, user }) => {
      if (!user) {
        throw new Error("You must be signed in to delete a note");
      }

      try {
        const deletion = await db.query(
          'DELETE FROM notes WHERE id = $1 AND "authorId" = $2',
          [args.id, user.id]
        );
        if (deletion.rowCount !== 0) {
          return true;
        } else {
          return false;
        }
      } catch (err) {
        throw new Error(err);
      }
    },
    signUp: async (parent, args, { db }) => {
      let { email } = args;
      const { username, password } = args;

      email = email.trim().toLowerCase();

      const hashed = await bcrypt.hash(password, 10);
      const avatar = getPokemonSprite();
      const userId = uuidv4();
      try {
        await db.query(
          "INSERT INTO users(username, id, email, avatar, password) VALUES($1,$2,$3,$4,$5)",
          [username, userId, email, avatar, hashed]
        );

        const res = await db.query('SELECT * FROM users WHERE "id" = $1', [
          userId,
        ]);

        return jwt.sign({ id: res.rows[0].id }, "thisstringhastobesupersecret");
      } catch (err) {
        console.error(err);
        throw new Error(err);
      }
    },
    signIn: async (parent, args, { db }) => {
      let { email, username, password } = args;

      if (email) {
        email = email.trim().toLowerCase();
      }
      try {
        const res = await db.query(
          "SELECT * FROM users WHERE email = $1 OR username = $2",
          [email, username]
        );

        if (res.rowCount === 0) {
          throw new Error("User not found");
        }

        const valid = await bcrypt.compare(password, res.rows[0].password);

        if (!valid) {
          throw new Error("Password seems to be incorrect");
        }

        return jwt.sign({ id: res.rows[0].id }, "thisstringhastobesupersecret");
      } catch (err) {
        console.trace();
        throw new Error(err);
      }
    },
    toggleFavorite: async (parent, args, { db, user }) => {
      if (!user) {
        throw new Error("You must be signed in to fav this note");
      }

      try {
        const queryCheck = await db.query(
          'SELECT * FROM favorites WHERE "noteId" = $1 AND "favoritedBy" = $2',
          [args.id, user.id]
        );

        if (queryCheck.rowCount === 0) {
          try {
            await db.query("INSERT INTO favorites VALUES($1, $2)", [
              args.id,
              user.id,
            ]);
          } catch (err) {
            throw new Error(err);
          }
        } else {
          try {
            await db.query(
              'DELETE FROM favorites WHERE "noteId" = $1 AND "favoritedBy" = $2',
              [args.id, user.id]
            );
          } catch (err) {
            throw new Error(err);
          }
        }

        // const favoritedNoteQuery = await db.query(
        //   'SELECT notes.id, notes.content, notes."authorId", notes."createdAt", notes."updatedAt" FROM notes, favorites WHERE notes.id = ',
        //   [args.id]
        // );

        const favoritedNoteQuery = await db.query(
          "SELECT * FROM notes WHERE id = $1",
          [args.id]
        );

        return favoritedNoteQuery.rows[0];
      } catch (err) {
        throw new Error(err);
      }
    },
  },
  DateTime: GraphQLDateTime,
  User: {
    notes: async (parent, args, { db }) => {
      try {
        const userNotes = await db.query(
          'SELECT notes.* FROM notes JOIN users ON notes."authorId" = users.id WHERE notes."authorId" = $1',
          [parent.id]
        );

        return userNotes.rows;
      } catch (err) {
        throw new Error(err);
      }
    },
    favorites: async (parent, args, { db }) => {
      try {
        const queryResult = await db.query(
          'SELECT notes.* FROM notes JOIN favorites ON notes.id = favorites."noteId" WHERE favorites."favoritedBy" = $1',
          [parent.id]
        );

        return queryResult.rows;
      } catch (err) {
        throw new Error(err);
      }
    },
  },
  Note: {
    author: async (parent, args, { db }) => {
      try {
        const queryResult = await db.query(
          "SELECT * FROM users WHERE id = $1",
          [parent.authorId]
        );

        return queryResult.rows[0];
      } catch (err) {
        throw new Error(err);
      }
    },
    favoriteCount: async (parent, args, { db }) => {
      try {
        const queryResult = await db.query(
          'SELECT COUNT(*) FROM favorites WHERE "noteId" = $1',
          [parent.id]
        );

        return +queryResult.rows[0].count;
      } catch (err) {
        throw new Error(err);
      }
    },
    favoritedBy: async (parent, args, { db }) => {
      try {
        const queryResult = await db.query(
          `SELECT users.username, users.id, users.email, users.avatar, users."createdAt", users."updatedAt" FROM users JOIN favorites on users.id = favorites."favoritedBy" WHERE favorites."noteId" = $1`,
          [parent.id]
        );

        return queryResult.rows;
      } catch (err) {
        throw new Error(err);
      }
    },
  },
};

module.exports = resolvers;
