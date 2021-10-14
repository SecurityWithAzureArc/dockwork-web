import { ApolloClient, HttpLink, InMemoryCache, split, ApolloProvider as UpstreamProvider } from '@apollo/client';
import { WebSocketLink } from '@apollo/client/link/ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { useMemo } from "react";

import { useConfig } from "./ConfigProvider";

export default function ApolloProvider({ children }) {
    const config = useConfig()
    const apolloCache = useMemo(() => new InMemoryCache(), [])

    const apolloClient = useMemo(() => {
        if (!config || !apolloCache) {
            return
        }

        const wsLink = new WebSocketLink({
            uri: config.apolloSock,
            options: { reconnect: true },
        })

        const httpLink = new HttpLink({ uri: config.apolloHttp })

        return new ApolloClient({
            link: split(({ query }) => {
                const def = getMainDefinition(query);
                return def.kind === 'OperationDefinition' && def.operation === 'subscription';
            }, wsLink, httpLink),
            cache: apolloCache,
            shouldBatch: true,
        })
    }, [config, apolloCache])

    if (!apolloClient) {
        return 'Setting up client...'
    }

    return (
        <UpstreamProvider client={apolloClient}>
            {children}
        </UpstreamProvider>
    )
}
