import { gql, useQuery, useMutation, useSubscription, useApolloClient } from "@apollo/client"
import cs from 'classnames'
import { useMemo, useState } from "react"

import DeleteModal from "./DeleteModal"

import styles from './List.module.css'

const LIST_IMAGES = gql`
    query ListImages {
        images {
            id
            name
            nodes
            deletedAt
        }
    }
`

const WATCH_IMAGE_DELETIONS = gql`
    subscription {
        deleteImageNotification {
            id
            deletedAt
        }
    }
`

const DELETE_IMAGES = gql`
    mutation DeleteImages($names: [String!]!) {
        deleteImages(names: $names) {
            name
        }
    }
`

function ListItem({ image, isSelected, onSelect }) {
    return (
        <div className={cs(styles.listItem, { [styles.selected]: !!image.deletedAt })} key={image.name}>
            <div className={styles.multiSelect}>
                <input type="checkbox" checked={isSelected} onChange={onSelect} />
            </div>
            <div className={styles.description}>
                <h2>{image.name}</h2>
                <p>{image.nodes.join(', ')}</p>
            </div>
        </div>
    )
}

export default function List() {
    const apolloClient = useApolloClient()
    const { loading, error, data } = useQuery(LIST_IMAGES)
    useSubscription(WATCH_IMAGE_DELETIONS, {
        shouldResubscribe: true,
        onSubscriptionData: (opts) => {
            const { id, deletedAt } = opts.subscriptionData.data.deleteImageNotification
            apolloClient.writeFragment({
                id: `ImageInfo:${id}`,
                fragment: gql`
                    fragment ListImages on ImageInfo {
                        deletedAt
                    }
                `,
                data: { deletedAt },
            })
        }
    })

    const [deleteImages] = useMutation(DELETE_IMAGES, { refetchQueries: ['ListImages'] })
    const [selected, setSelected] = useState({})
    const [showDeleteModal, setShowDeleteModal] = useState(false)

    const selectedItems = useMemo(() => {
        return Object.keys(selected).filter(key => selected[key])
    }, [selected])

    const deleteImagesHandler = async () => deleteImages({ variables: { names: selectedItems } })
        .then(() => setSelected({}))
        .finally(() => setShowDeleteModal(false))

    const toggleDeleteModal = () => setShowDeleteModal(prev => !prev)

    const onSelectionChange = ({ name }) => setSelected(prev => ({
        ...prev,
        [name]: !prev[name],
    }))

    if (loading) {
        return 'Loading...'
    }

    if (error) {
        return `Error: ${error}`
    }

    return (
        <>
            <div className={styles.listToolbar}>
                {selectedItems && selectedItems.length ? <button onClick={toggleDeleteModal}>Delete {selectedItems.length} item(s)</button> : null}
            </div>

            {data.images.map((image) => <ListItem
                key={image.name}
                image={image}
                isSelected={selected[image.name] === true}
                onSelect={() => onSelectionChange(image)}
            />)}

            <DeleteModal show={showDeleteModal} onCancel={toggleDeleteModal} onDelete={deleteImagesHandler} items={Object.keys(selected)} />
        </>
    )
}
