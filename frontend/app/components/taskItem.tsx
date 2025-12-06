import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { FaCheck, FaXmark, FaTrashCan } from "react-icons/fa6";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateField } from "@mui/x-date-pickers/DateField";
import { useState } from 'react';
import { format } from 'date-fns';
import type { Task } from "../api/tasks";
import "./taskItem.scss";

export type TodoItemProps = {
    task: Task;
    onToggle: () => void;
    onUpdate: (task: Task, newName: string, newDate: string) => void;
    onDelete: (taskId: string) => void;
}

export function TaskItem({ task, onToggle, onUpdate, onDelete }: TodoItemProps) {
    const isTemp = task.id.startsWith('temp-');
    const [isEditing, setIsEditing] = useState(isTemp);
    const [editName, setEditName] = useState(task.name);
    const [editDate, setEditDate] = useState<Date | null>(
        task.end_date ? new Date(task.end_date) : null
    );

    const handleSave = () => {
        const dateString = editDate ? format(editDate, 'yyyy-MM-dd') : "";
        onUpdate(task, editName, dateString);
        setIsEditing(false);
    };

    const handleCancel = () => {
        if (isTemp) {
            onDelete(task.id);
        } else {
            setEditName(task.name);
            setEditDate(task.end_date ? new Date(task.end_date) : null);
            setIsEditing(false);
        }
    };

    // VIEW MODE
    if (!isEditing) {
        return (
            <li className={task.is_completed ? "completed-task" : "todo-task"}>
                <input 
                    type="checkbox" 
                    checked={task.is_completed} 
                    onChange={onToggle} 
                />
                <div 
                    className="task-content" 
                    onClick={() => setIsEditing(true)} 
                >
                    <span className="task-description"> {task.name} </span>
                    <span className="task-date">
                        {task.end_date ? task.end_date.split('T')[0] : ""}
                    </span>
                </div>
            </li>
        );
    }

    // EDIT MODE
    return (
        <li className="todo-task editing">
            <div className="edit-inputs">
                <TextField 
                    variant="outlined"
                    size="small"
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)}
                    className="edit-input-text"
                />
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DateField
                        value={editDate}
                        onChange={(newValue) => setEditDate(newValue)}
                        format="yyyy-MM-dd"
                        size="small"
                        className="edit-input-date"
                    />
                </LocalizationProvider>
            </div>
            <div className="edit-actions">
                <Button 
                    onClick={handleSave} 
                    variant="contained"
                    size="small"
                    className="btn-save"
                >
                    <FaCheck />
                </Button>
                <Button 
                    onClick={handleCancel} 
                    variant="contained"
                    size="small"
                    className="btn-cancel"
                >
                    <FaXmark />
                </Button>
                <Button 
                    onClick={() => onDelete(task.id)} 
                    variant="contained"
                    size="small"
                    className="btn-delete"
                >
                    <FaTrashCan />
                </Button>
            </div>
        </li>
    );
}