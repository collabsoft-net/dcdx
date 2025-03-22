import axios from 'axios';

export const getUrlByAppKey = async (appKey: string) => {
  let result = `https://marketplace.atlassian.com/download/plugins/${appKey}`;
  const { data: listing } = await axios.get(`https://marketplace.atlassian.com/rest/2/addons/${appKey}?hosting=datacenter&withVersion=true`).catch(() => ({ data: null }));
  if (listing) {
    result = listing._embedded?.version?._embedded?.artifact?._links?.binary?.href || result;
  }
  return result;
}