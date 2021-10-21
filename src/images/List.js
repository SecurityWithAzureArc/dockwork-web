import { gql, useQuery, useMutation, useSubscription, useApolloClient } from "@apollo/client"
import cs from 'classnames'
import { useEffect, useMemo, useRef, useState } from "react"
import TimeAgo from 'react-timeago'

import DeleteModal from "./DeleteModal"

import styles from './List.module.css'

const INFINITE_SCROLL_OFFSET = 200
const LIST_IMAGES = gql`
    query ListImages ($offset: Int!) {
        images(skip: $offset) {
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
                {image.nodes.length ? <p>{image.nodes.map(node => <span key={node.name + node.namespace} className={styles.nodeTag}>{node.name}:{node.namespace}</span>)}</p> : null}
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
    const loadButtonRef = useRef()
    const apolloClient = useApolloClient()
    const POLL_INTERVAL = 60_000
    const { loading, error, data, fetchMore } = useQuery(LIST_IMAGES, { pollInterval: POLL_INTERVAL, variables: { offset: 0 } })

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
    const [loadingMore, setLoadingMore] = useState(false)

    const handleLoadMore = () => {
        if (loadingMore) {
            return;
        }

        setLoadingMore(true)
        fetchMore({ variables: { offset: data.images.length } }).then(() => setLoadingMore(false))
    }

    useEffect(() => {
        if (!loadButtonRef.current) {
            return
        }

        const handler = () => {
            if (loadButtonRef.current.getBoundingClientRect().top - window.innerHeight < INFINITE_SCROLL_OFFSET) {
                handleLoadMore()
            }
        }

        window.addEventListener("scroll", handler, { passive: true })
        return () => window.removeEventListener("scroll", handler)
    }, [loadButtonRef.current, loading, loadingMore])

    const selectedItems = useMemo(() => Object.keys(selected).filter(key => selected[key]) || [], [selected])

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
                {data.images.filter(image => image.nodes.length > 0).map((image, idx) => <ListItem
                    key={idx + image.name}
                    image={image}
                    isSelected={selected[image.name] === true}
                    onSelect={() => onSelectionChange(image)}
                />)}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button ref={loadButtonRef} className={styles.loadMoreButton} onClick={handleLoadMore} disabled={loadingMore}>{loadingMore ? 'Loading more results...' : 'Load More'}</button>
            </div>

            <DeleteModal show={showDeleteModal} onCancel={toggleDeleteModal} onDelete={deleteImagesHandler} items={Object.keys(selected)} />
        </>
    )
}
