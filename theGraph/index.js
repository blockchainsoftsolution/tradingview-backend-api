const { Client, cacheExchange, fetchExchange } = require('@urql/core');
// const {request, gql, GraphQLClient} = require('graphql-request')
// const { gql, ApolloClient, InMemoryCache } = require('@apollo/client');
const { API_KEY, SUBGRAPH_ID } = require("../config");

const endpoint = `https://gateway.thegraph.com/api/${API_KEY}/subgraphs/id/${SUBGRAPH_ID}`;

const client = new Client({
  url: endpoint,
  exchanges: [cacheExchange, fetchExchange]
});

// const graphQLClient = new GraphQLClient(endpoint)
// const client = new ApolloClient({uri: endpoint, cache: new InMemoryCache()})

const fetchData = async (query) => {
  try {
    const data = await client.query(query).toPromise().then(result => {
        return result
    });
    return data;
    // const results = await graphQLClient.request({query})
    // console.log(results)
    // return results
  } catch (error) {
    console.log("Error fetching data:", error);
    return undefined;
  }
};

module.exports = {
  fetchData,
};
