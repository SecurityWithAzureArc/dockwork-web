import { ApolloClient, HttpLink, InMemoryCache, split } from '@apollo/client';
import { WebSocketLink } from '@apollo/client/link/ws';
import { getMainDefinition } from '@apollo/client/utilities';

import config from './config'

const wsLink = new WebSocketLink({
    uri: config.apolloWS,
    options: { reconnect: true },
})

const httpLink = new HttpLink({ uri: config.apolloHTTP })

export const client = new ApolloClient({
    link: split(({ query }) => {
        const def = getMainDefinition(query);
        return def.kind === 'OperationDefinition' && def.operation === 'subscription';
    }, wsLink, httpLink),
    cache: new InMemoryCache(),
    shouldBatch: true,
})
