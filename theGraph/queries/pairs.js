const { gql } = require("@urql/core");

exports.pairsQuery = (pair) => {
  return gql`{
    pairs(first: 1, where: {id: "${pair}"}) {
      id
      createdAtTimestamp
      token0 {
        id
        name
        symbol
        decimals
      }
      token1 {
        id
        name
        symbol
        decimals
      }
    }
  }`;
};
