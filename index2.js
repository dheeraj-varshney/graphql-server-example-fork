"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apollo_server_fastify_1 = require("apollo-server-fastify");
const apollo_server_core_1 = require("apollo-server-core");
const fastify_1 = require("fastify");
const undici_1 = require("undici");
console.log("Starting server");
const typeDefs = apollo_server_fastify_1.gql `
  # Comments in GraphQL strings (such as this one) start with the hash (#) symbol.

  # This "Book" type defines the queryable fields for every book in our data source.
  type Book {
    title: String
    author: String
  }

  type TestReq {
    success: String
  }

  # The "Query" type is special: it lists all of the available queries that
  # clients can execute, along with the return type for each. In this
  # case, the "books" query returns an array of zero or more Books (defined above).
  type Query {
    books: [Book]
    testRequest: TestReq
  }
`;
const books = [
    {
        title: 'The Awakening',
        author: 'Kate Chopin',
    },
    {
        title: 'City of Glass',
        author: 'Paul Auster',
    },
];
// Resolvers define the technique for fetching the types defined in the
// schema. This resolver retrieves books from the "books" array above.
let postUrl = 'http://internal-node-api-mock-532674101.us-east-1.elb.amazonaws.com/load';
const testRequestResolver = async () => {
    const { body } = await undici_1.request(postUrl, { method: 'POST' });
    const res = await body.json();
    // body.setEncoding('utf8')
    // body.on('data', console.log)
    // body.on('end', () => {
    //   console.log('trailers', trailers)
    // })
    console.log('body', res);
    return res;
};
const resolvers = {
    Query: {
        books: () => {
            return books;
        },
        testRequest: testRequestResolver
    },
};
function fastifyAppClosePlugin(app) {
    return {
        async serverWillStart() {
            return {
                async drainServer() {
                    await app.close();
                },
            };
        },
    };
}
async function startApolloServer(typeDefs, resolvers) {
    const app = fastify_1.default({
        logger: true
    });
    app.get('/health', async function (request, reply) {
        reply.send({ success: 200 });
    });
    const server = new apollo_server_fastify_1.ApolloServer({
        typeDefs,
        resolvers,
        plugins: [
            fastifyAppClosePlugin(app),
            apollo_server_core_1.ApolloServerPluginDrainHttpServer({ httpServer: app.server }),
        ],
    });
    await server.start();
    app.register(server.createHandler());
    await app.listen(9999, '0.0.0.0');
    console.log(`???? Server ready at http://0.0.0.0:9999${server.graphqlPath}`);
}
startApolloServer(typeDefs, resolvers);
//# sourceMappingURL=index2.js.map