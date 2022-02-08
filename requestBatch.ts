import {ApolloServer, gql} from 'apollo-server-fastify';
import {ApolloServerPlugin, GraphQLResponse} from 'apollo-server-plugin-base';
import {ApolloServerPluginDrainHttpServer} from 'apollo-server-core';
import fastify, {FastifyInstance, FastifyRequest} from 'fastify';
import {request} from 'undici'


console.log("Starting server");
const typeDefs = gql`
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
let postUrl = 'http://localhost:3000/health'
const testRequestResolver = async () => {
    const {body} = await request(postUrl, {method: 'POST'})
    const res = await body.json();

    console.log('body', res)
    return {success: res.msg};
}

// const testRequestMapper = (res) => ({success: res.msg})


const resolvers = {
    Query: {
        books: () => {
            return books
        },
        testRequest: testRequestResolver,
        // testRequestBatch: testRequestResolverBatching
    },
};


function fastifyAppClosePlugin(app: FastifyInstance): ApolloServerPlugin {
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

let activeQueuesArr
const batchRequestRes = (cb) => {
    console.log("Batching called")
    if (activeQueuesArr) {
        return activeQueuesArr.push(cb);
    }

    activeQueuesArr = [cb];
    request(postUrl, {method: 'POST'})
      .then(res => {
          res.body.json()
            .then(body => {
                // console.log("response", body, activeQueuesArr.length)
                const queue = activeQueuesArr;
                activeQueuesArr = [];
                queue.forEach(callback => callback(body));
            })
      })
}

interface Context extends FastifyRequest {
    _defaultIO?: object
    _loaders?: object
    response?: object
}

async function startApolloServer(typeDefs, resolvers) {
    const app = fastify();
    app.get('/health', async function (req, reply) {
        try {
            batchRequestRes((data) => {
                // console.log("health", data)
                reply.send(data)
            })
        } catch (e) {
            console.log("error ", e)
        }
    })
    const server = new ApolloServer({
        typeDefs,
        resolvers,
        context: ({request, reply}) => {
            const newContext: Context = request
            newContext.response = reply
            return newContext
        },
        plugins: [
            fastifyAppClosePlugin(app),
            ApolloServerPluginDrainHttpServer({httpServer: app.server}),
            {
                async requestDidStart(req) {
                    console.log("request")
                    return {
                        async responseForOperation({request, context}): Promise<GraphQLResponse | null> {
                            console.log("I was here", activeQueuesArr)
                            const {headers} = request.http
                            if (true || headers?.batchRequest && headers.batchRequest == 'true') {
                                console.log("I am true")
                                return new Promise(() => batchRequestRes((data) => {
                                    context.response.send(data)
                                }))
                            }
                            return null
                        }
                    }
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
