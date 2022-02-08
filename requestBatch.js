"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const apollo_server_fastify_1 = require("apollo-server-fastify");
const apollo_server_core_1 = require("apollo-server-core");
const fastify_1 = require("fastify");
const undici_1 = require("undici");
console.log("Starting server");
const typeDefs = apollo_server_fastify_1.gql `
    type Book {
        title: String
        author: String
    }

    type TestReq {
        success: String
    }

    type Query {
        books: [Book]
        testRequest: TestReq
        testRequestBatch: TestReq
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
let postUrl = 'http://localhost:3000/health';
const testRequestResolver = async () => {
    const { body } = await undici_1.request(postUrl, { method: 'POST' });
    const res = await body.json();
    console.log('body', res);
    return { success: res.msg };
};
// const testRequestMapper = (res) => ({success: res.msg})
const resolvers = {
    Query: {
        books: () => {
            return books;
        },
        testRequest: testRequestResolver,
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
let activeQueuesArr;
const batchRequestRes = (cb) => {
    console.log("Batching called");
    if (activeQueuesArr) {
        return activeQueuesArr.push(cb);
    }
    activeQueuesArr = [cb];
    undici_1.request(postUrl, { method: 'POST' })
        .then(res => {
        res.body.json()
            .then(body => {
            // console.log("response", body, activeQueuesArr.length)
            const queue = activeQueuesArr;
            activeQueuesArr = [];
            queue.forEach(callback => callback(body));
        });
    });
};
async function startApolloServer(typeDefs, resolvers) {
    const app = fastify_1.default();
    app.get('/health', async function (req, reply) {
        try {
            batchRequestRes((data) => {
                // console.log("health", data)
                reply.send(data);
            });
        }
        catch (e) {
            console.log("error ", e);
        }
    });
    const server = new apollo_server_fastify_1.ApolloServer({
        typeDefs,
        resolvers,
        context: ({ request, reply }) => {
            const newContext = request;
            newContext.response = reply;
            return newContext;
        },
        plugins: [
            fastifyAppClosePlugin(app),
            apollo_server_core_1.ApolloServerPluginDrainHttpServer({ httpServer: app.server }),
            {
                async requestDidStart(req) {
                    console.log("request");
                    return {
                        async responseForOperation({ request, context }) {
                            console.log("I was here", activeQueuesArr);
                            const { headers } = request.http;
                            if (true || (headers === null || headers === void 0 ? void 0 : headers.batchRequest) && headers.batchRequest == 'true') {
                                console.log("I am true");
                                return new Promise(() => batchRequestRes((data) => {
                                    context.response.send(data);
                                }));
                            }
                            return null;
                        }
                    };
                }
            }
        ],
    });
    await server.start();
    app.register(server.createHandler());
    await app.listen(9990, '0.0.0.0');
    console.log(`🚀 Server ready at http://0.0.0.0:9990${server.graphqlPath}`);
}
startApolloServer(typeDefs, resolvers);
//# sourceMappingURL=requestBatch.js.map