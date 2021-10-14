import { createContext, useContext, useEffect, useState } from 'react'

const ConfigContext = createContext();

export const useConfig = () => useContext(ConfigContext)

const defaultConfig = {
    apolloSock: "ws://localhost:5000/graphql",
    apolloHttp: "http://localhost:5000/graphql"
}

export default function ConfigProvider({ children }) {
    const [config, setConfig] = useState(null)
    const [loadError, setLoadError] = useState(null)
    useEffect(() => {
        fetch('/config.json')
            .then(async (res) => {
                // If the response was successful set the config to the loaded config
                if (res.status === 200) {
                    const jsonBody = await res.json()
                    return setConfig(jsonBody)
                }

                const textBody = await res.text()
                // If there was an unexpected error throw an error
                if (!textBody.startsWith('Proxy error:') && res.status !== 404) {
                    throw new Error(`failed to get config from response ${textBody}`)
                }

                // Set the default config
                return setConfig(defaultConfig)
            })
            .catch(setLoadError)
    }, [])

    if (loadError) {
        return `Error loading config: ${loadError}`
    }

    if (!config) {
        return 'Loading...'
    }

    return (
        <ConfigContext.Provider value={config}>
            {children}
        </ConfigContext.Provider>
    )
};
