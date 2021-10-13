import { gql, useQuery, useMutation } from "@apollo/client"
import { useMemo, useState } from "react"
import DeleteModal from "./DeleteModal"

import styles from './List.module.css'

const LIST_IMAGES = gql`
    query {
        images {
            name
            nodes
            shouldDelete
        }
    }
`

const DELETE_IMAGES = gql`
    mutation Delete($name: String!) {
        deleteImage(name: $name) {
            name
        }
    }
`

function ListItem({ image, isSelected, onDelete, onSelect }) {
    return (
        <div className={styles.listItem} key={image.name}>
            <div className={styles.multiSelect}>
                <input type="checkbox" checked={isSelected} onClick={onSelect} />
            </div>
            <div className={styles.description}>
                <h2>{image.name}</h2>
                <p>{image.nodes.join(', ')}</p>
            </div>
            <button className={styles.deleteButton} onClick={onDelete}>Delete</button>
        </div>
    )
}

export default function List() {
    const { loading, error, data } = useQuery(LIST_IMAGES)
    const [deleteImage, { deleteData, deleteLoading, deleteError }] = useMutation(DELETE_IMAGES)
    const [selected, setSelected] = useState({})
    const [showDeleteModal, setShowDeleteModal] = useState(false)

    const selectedItems = useMemo(() => {
        return Object.keys(selected).filter(key => selected[key])
    }, [selected])

    const onItemDelete = (item) => {
        setSelected({ [item.name]: true })
        setShowDeleteModal(true)
    }

    const deleteImagesHandler = (selected) => {
        Object.keys(selected).map((key) => (
            deleteImage({variables: {name: key}})
        ))

        // TODO: update list of images
    }

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
                isSelected={selected[image]}
                onDelete={() => onItemDelete(image)}
                onSelect={() => onSelectionChange(image)}
            />)}

            <DeleteModal show={showDeleteModal} onCancel={toggleDeleteModal} onDelete={deleteImagesHandler} items={Object.keys(selected)} />
        </>
    )
}
