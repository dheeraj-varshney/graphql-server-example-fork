"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./tracer");
const apollo_server_fastify_1 = require("apollo-server-fastify");
const apollo_server_core_1 = require("apollo-server-core");
const fastify_1 = require("fastify");
// import { request } from 'undici'
const gpu_js_1 = require("gpu.js");
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
    }
];
// Resolvers define the technique for fetching the types defined in the
// schema. This resolver retrieves books from the "books" array above.
const length = 2048;
const getArrayValues = () => {
    //Create 2D array here
    const values = [[], []];
    // Insert Values into first array
    for (let y = 0; y < length; y++) {
        values[0].push([]);
        values[1].push([]);
        // Insert values into second array
        for (let x = 0; x < length; x++) {
            values[0][y].push(Math.random());
            values[1][y].push(Math.random());
        }
    }
    //Return filled array
    return values;
};
const getEpochArr = n => Array.apply(0, Array(length)).map(function (x, i) {
    if (i < n)
        return 1643102686421 + Math.floor(100000000 * Math.random());
    else
        return -1;
});
const timeArr = getEpochArr(10);
console.log(timeArr);
// let postUrl = 'http://internal-node-api-mock-5646764101.us-east-1.elb.amazonaws.com/load'
const gpu = new gpu_js_1.GPU({ mode: 'gpu' });
const findEpochInRange = gpu.createKernel(function (epochArr) {
    let currEpoch = 1643102686421;
    let minEpoch = Math.floor((currEpoch + 19800000) / 604800000) * 604800000; // epoc + ist offset / week
    let maxEpoch = minEpoch + 604800000;
    // console.log("curr val", epochArr[this.thread.x], minEpoch, maxEpoch)
    if (epochArr[this.thread.x] != -1 && minEpoch < epochArr[this.thread.x] && epochArr[this.thread.x] < maxEpoch) {
        return 1;
    }
    else {
        // return 0;
    }
}).setOutput([length]);
const testRequestResolver = async () => {
    // console.time('server-gpu')
    const res = findEpochInRange(timeArr);
    // console.log('body', res)
    // console.timeEnd('server-gpu')
    return { success: 'true' };
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
        reply.send({ success: 200, date: '2021-05-17T07:00:00.000Z' });
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
    await app.listen(9990, '0.0.0.0');
    console.log(`🚀 Server ready at http://0.0.0.0:9990${server.graphqlPath}`);
}
startApolloServer(typeDefs, resolvers);
//# sourceMappingURL=gpu-index.js.map