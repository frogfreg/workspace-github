const { ApolloServer } = require("apollo-server");

const typeDefs = require("./schema.js");
const resolvers = require("./resolvers.js");
const db = require("./db/database.js");
const { getUser } = require("./utils.js");

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => {
    const token = req.headers.authorization;

    const user = getUser(token);

    return { db, user };
  },
});

server.listen().then(({ url }) => {
  console.log(`Server is listening on ${url}`);
});
