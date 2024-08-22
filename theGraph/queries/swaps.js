const { gql } = require('@urql/core')

exports.swapsQuery = (pair, timestamp_gt, timestamp_lte, first) => {
  return gql`{
  swaps(first: ${
      first || 1000
    }, orderBy: timestamp, orderDirection: asc, where: {pair: "${pair}", timestamp_gt: ${
    timestamp_gt || 0
  }, timestamp_lte: ${timestamp_lte || Date.now()}}) {
      id
      timestamp
      from
      amount0In
      amount1In
      amount0Out
      amount1Out
      amountUSD
      logIndex
    }
  }`;
};

exports.swapsReverseQuery = (pair, timestamp_gt, timestamp_lte, first) => {
    return gql`{
    swaps(first: ${
        first || 1000
      }, orderBy: timestamp, orderDirection: desc, where: {pair: "${pair}", timestamp_gt: ${
      timestamp_gt || 0
    }, timestamp_lte: ${timestamp_lte || Date.now()}}) {
        id
        timestamp
        from
        amount0In
        amount1In
        amount0Out
        amount1Out
        amountUSD
        logIndex
      }
    }`;
  };
