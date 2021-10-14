import { gql, useQuery, useMutation, useSubscription, useApolloClient } from "@apollo/client"
import cs from 'classnames'
import { useMemo, useState } from "react"
import TimeAgo from 'react-timeago'

import DeleteModal from "./DeleteModal"

import styles from './List.module.css'

const LIST_IMAGES = gql`
    query ListImages {
        images {
            id
            name
            nodes {
                name
                namespace
            }
            createdAt
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
    let notificationMessage = ''
    if (image.deletedAt && image.nodes.length) {
        notificationMessage = `Delete pending for ${image.nodes.length} node(s)`
    } else if (image.deletedAt) {
        notificationMessage = 'All images deleted!'
    }

    return (
        <div className={cs(styles.listItem, { [styles.deleted]: !!image.deletedAt })} key={image.name}>
            <div className={styles.multiSelect}>
                <input type="checkbox" checked={isSelected} onChange={onSelect} />
            </div>
            <div className={styles.description}>
                <h2>{image.name}{notificationMessage ? <small>{notificationMessage}</small> : null}</h2>
                {image.nodes.length ? <p>{image.nodes.map(node => <span className={styles.nodeTag}>{node.name}:{node.namespace}</span>)}</p> : null}
            </div>
            <div className={styles.metadata}>
                <div>First Seen <TimeAgo date={image.createdAt} /></div>
                {image.deletedAt ? <div>Deleted <TimeAgo date={image.deletedAt} /></div> : null}
            </div>
        </div>
    )
}

function ListToolbar() {
    return (
        <div className={styles.listToolbar}></div>
    )
}

function SelectedListToolbar({ selectedCount, onDelete }) {
    return (
        <div className={styles.listToolbar}>
            <button className={styles.btnDanger} onClick={onDelete}>Delete {selectedCount} item(s)</button>
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
        return Object.keys(selected).filter(key => selected[key]) || []
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
            {selectedItems.length
                ? <SelectedListToolbar onDelete={toggleDeleteModal} selectedCount={selectedItems.length} />
                : <ListToolbar />}

            {data.images.length ? null : 'No images yet!'}

            <div className={styles.list}>
                {data.images.map((image) => <ListItem
                    key={image.name}
                    image={image}
                    isSelected={selected[image.name] === true}
                    onSelect={() => onSelectionChange(image)}
                />)}
            </div>

            <DeleteModal show={showDeleteModal} onCancel={toggleDeleteModal} onDelete={deleteImagesHandler} items={Object.keys(selected)} />
        </>
    )
}
