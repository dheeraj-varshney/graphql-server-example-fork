import { ApolloServer, gql } from 'apollo-server-fastify';
import { ApolloServerPlugin } from 'apollo-server-plugin-base';
import { ApolloServerPluginDrainHttpServer } from 'apollo-server-core';
import fastify, {FastifyInstance} from 'fastify';
import { request } from 'undici'


console.log("Starting server");
const typeDefs = gql`
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
  const { body } = await request(postUrl, {method: 'POST'})
  const res = await body.json();
  // body.setEncoding('utf8')
  // body.on('data', console.log)
  // body.on('end', () => {
  //   console.log('trailers', trailers)
  // })

  console.log('body', res)
  return {success: res.msg};
}

// const testRequestMapper = (res) => ({success: res.msg})

const activeQueues = {}
// let cnt = 0;
let round = 1;
// const testRequestResolverBatching = (cb) => async () => {
//   if (activeQueues[round] && cnt < 50){
//     console.log("round: ", round, " cnt: ", cnt)
//     cnt = cnt++ % 50
//     return activeQueues[round].push(cb);
//   }
//
//   activeQueues[round] = [cb]
//   const { body } = await request(postUrl, {method: 'POST'})
//   const res = await body.json();
//   console.log('single res', res)
//   const queue = activeQueues[round]
//   activeQueues[round] = null
//   queue.forEach(testRequestMapper(res))
// }


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

// const activeQueuesArr = []
const batchRequestWithCb = (cb, body) => {
  // let res = await request(postUrl, {method: 'POST'})
  // let body = await res.body.json()
  // console.log("batchResponse", body)
  return cb(body)
}
const batchRequestRes = async (cb) => {
  if (activeQueues[round]) {
    return activeQueues[round].push(cb);
  }

  activeQueues[round] = [cb];
  request(postUrl, {method: 'POST'})
      .then(res => {
        res.body.json()
            .then(body => {
                // const queue = activeQueues[round];
                // activeQueues[round] = null;
                // queue.forEach(callback => callback(body));
              // console.log("response", body, activeQueues[round].length)
              return batchRequestWithCb((data) => {
                const queue = activeQueues[round];
                activeQueues[round] = null;
                queue.forEach(callback => callback(data));
              }, body);
            })
      })
  // return cb(body)

  // let res = await request(postUrl, {method: 'POST'})
  // let body = await res.body.json()
  // // console.log("response", body, activeQueues[round].length)
  // return batchRequestWithCb((data) => {
  //   const queue = activeQueues[round];
  //   activeQueues[round] = null;
  //   queue.forEach(callback => callback(data));
  // }, body);
}

async function startApolloServer(typeDefs, resolvers) {
  const app = fastify();
  app.get('/health', async function (req, reply) {
    // batchRequestRes((data)=> {
      // console.log("health", data)
      // reply.send(data)
    // })
    const { body } = await request(postUrl, {method: 'POST'})
    const res = await body.json();
    reply.send({ success: 200, ...res })
  })
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    plugins: [
      fastifyAppClosePlugin(app),
      ApolloServerPluginDrainHttpServer({ httpServer: app.server }),
    ],
  });
  await server.start();
  app.register(server.createHandler());
  await app.listen(9990, '0.0.0.0');
  console.log(`🚀 Server ready at http://0.0.0.0:9990${server.graphqlPath}`);
}

startApolloServer(typeDefs, resolvers);
