import React from 'react';
import styles from './DeleteModal.module.css';

export default function DeleteModal({ show, onCancel, onDelete, items }) {
    if (!show) {
        return null
    }

    return (
        <div className={styles.modal}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h4 className={styles.modalTitle}>Are you sure you want to delete the images?</h4>
                </div>
                <div className={styles.modalBody}>
                    The following images will be deleted permanently
                    <ul>
                        {items.map((item) => (
                            <li>{item}</li>
                        ))}
                    </ul>
                </div>
                <div className={styles.modalFooter}>
                    <button className={styles.deleteButton} onClick={onDelete}>Delete</button>
                    <button className={styles.cancelButton} onClick={onCancel}>Cancel</button>
                </div>
            </div>
        </div>
    )
}