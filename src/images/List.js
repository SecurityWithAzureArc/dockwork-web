import { gql, useQuery, useMutation, useSubscription, useApolloClient } from "@apollo/client"
import { InMemoryCache } from "@apollo/client";
import { offsetLimitPagination } from "@apollo/client/utilities";
import cs from 'classnames'
import { useMemo, useState } from "react"
import TimeAgo from 'react-timeago'

import DeleteModal from "./DeleteModal"

import styles from './List.module.css'

import styled from "styled-components";

const theme = {
    blue: {
      default: "#3f51b5",
      hover: "#283593"
    }
  };

const Button = styled.button`
  background-color: ${(props) => theme['blue'].default};
  color: white;
  padding: 5px 15px;
  border-radius: 5px;
  outline: 0;
  text-transform: uppercase;
  margin: 10px 0px;
  cursor: pointer;
  box-shadow: 0px 2px 2px lightgray;
  transition: ease background-color 250ms;
  &:hover {
    background-color: ${(props) => theme['blue'].hover};
  }
  &:disabled {
    cursor: default;
    opacity: 0.7;
  }
`;

const LIST_IMAGES = gql`
    query ListImages ($offset: Int!) {
        images(skip: $offset) {
            name
            nodes {
                name
                namespace
            }
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

const cache = new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          images: offsetLimitPagination()
        },
      },
    },
  });

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

function merge(existing, incoming) {
    const merged = existing ? existing.slice(0) : [];
    merged.push.apply(merged, incoming);
    return merged;
}

export default function List() {
    const apolloClient = useApolloClient()
    const POLL_INTERVAL = 600000
    const { loading, error, data, fetchMore } = useQuery(LIST_IMAGES, {pollInterval: POLL_INTERVAL, variables: { offset: 0 }})

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
    const [listItems, setListItems] = useState(data ? data.images : [])

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

    // TODO: Setup filter & sort at API layer instead of UI layer
    const sortAndFilterImages = function(images) {
        return images.filter((image) => image.nodes.length > 0)
        .sort((image1, image2) => {
            if (!image1.deletedAt && !image2.deletedAt) {
                return new Date(image2.createdAt) - new Date(image1.createdAt)
            }
            if (!image1.deletedAt) {
                return -1
            }
            if (!image2.deletedAt) {
                return 1
            }
            return new Date(image2.deletedAt) - new Date(image1.deletedAt)
        })
    }

    // set initial data on first render
    if(listItems.length == 0)
    {
        setListItems(sortAndFilterImages(data.images))
    }
    
    const fetchMoreWrapper = function() {
        console.log('fetching more data')
        fetchMore({
            variables: {
                offset: data.images.length
            },
        }).then((newData) => {
            console.log(newData.data)
            data.images = merge(data.images, newData.data.images)
            var sortedFilteredImages = sortAndFilterImages(data.images)
            // setState to redraw
            setListItems(sortedFilteredImages)
        })
    }

    return (
        <>
            {selectedItems.length
                ? <SelectedListToolbar onDelete={toggleDeleteModal} selectedCount={selectedItems.length} />
                : <ListToolbar />}

            {data.images.length ? null : 'No images yet!'}

            <div className={styles.list}>
                {listItems.map((image) => <ListItem
                    key={image.name}
                    image={image}
                    isSelected={selected[image.name] === true}
                    onSelect={() => onSelectionChange(image)}
                />)}
            </div>

            <Button onClick={() => fetchMoreWrapper()}>Load more</Button>

            <DeleteModal show={showDeleteModal} onCancel={toggleDeleteModal} onDelete={deleteImagesHandler} items={Object.keys(selected)} />
        </>
    )
}
