import "./todolist.scss";
import Button from '@mui/material/Button'
import TextField from '@mui/material/TextField'
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import { getLists, getTasks, updateTask, deleteTask, createTask, createList, updateList, deleteList, type Task } from "../../api/tasks"
import { FaCheck, FaXmark, FaTrashCan } from "react-icons/fa6";
import { useState, useEffect, useMemo } from 'react';
import type { Route } from "./+types/todolist";
import { TaskItem } from "~/components/taskItem";
import { GoalService } from "../../api/goals";
import type { GoalUI } from "../../api/goals";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "To-Do - AuroraMind" },
        { name: "description", content: "To-Do List" },
    ];
}

export const handle = {
    clientLoader: true,
};

export async function clientLoader({}: Route.LoaderArgs) {
const rawLists = await getLists();
    const goals = await GoalService.getAllGoals();
    const tasks = [];
    
    // Map lists to include the goal name immediately
    const listsWithGoals: TaskList[] = rawLists.map(list => {
        let goalName = undefined;
        if (list.goal_id) {
            const foundGoal = goals.find(g => g.id === list.goal_id);
            if (foundGoal) {
                goalName = foundGoal.title;
            }
        }
        return { ...list, goalName };
    });

    for (const item of listsWithGoals) {
        tasks.push(await getTasks(item.id));
    }
    
    return { lists: listsWithGoals, tasks: tasks, goals: goals };
}
clientLoader.hydrate = true;

export function HydrateFallback() {
  return <div>Loading...</div>;
}

export default function TodoView({loaderData}: Route.ComponentProps) {
    const [lists, setLists] = useState<TaskListWithGoal[]>(loaderData.lists);
    const [tasks, setTasks] = useState(loaderData.tasks.flat());
    const [isCreatingList, setIsCreatingList] = useState(false);
    const [newListName, setNewListName] = useState("");
    const { goals } = loaderData;

    const handleTaskToggle = async (task: Task) => {
        if (task.id.startsWith('temp-')) return;
        const newStatus = !task.is_completed;
        const taskToUpdate = { ...task, is_completed: newStatus };
        setTasks(prev => prev.map(t => t.id === task.id ? taskToUpdate : t));
        const updatedTaskFromApi = await updateTask(taskToUpdate);
        
        // Revert or confirm based on API response
        if (updatedTaskFromApi) {
            setTasks(prev => prev.map(t => t.id === updatedTaskFromApi.id ? updatedTaskFromApi : t));
        }
    };

    const handleTaskSave = async (task: Task, newName: string, newDate: string) => {
        const formattedDate = newDate ? `${newDate}T00:00:00Z` : task.end_date;

        // CHECK: Is this a new temporary task?
        if (task.id.startsWith('temp-')) {
            // CALL CREATE API
            const newTaskPayload = {
                name: newName,
                is_completed: false,
                task_list_id: task.task_list_id,
                start_date: task.start_date, // Keep original start date
                end_date: formattedDate
            };

            const createdTask = await createTask(newTaskPayload);

            if (createdTask) {
                // Replace the temp task in state with the real one from DB (which has a real ID)
                setTasks(prev => prev.map(t => t.id === task.id ? createdTask : t));
            } else {
                alert("Failed to create task");
            }

        } else {
            // CALL UPDATE API (Existing Logic)
            const taskToUpdate = { 
                ...task, 
                name: newName, 
                end_date: formattedDate 
            };
    
            const updatedTaskFromApi = await updateTask(taskToUpdate);
    
            if (updatedTaskFromApi) {
                 setTasks(prev => prev.map(t => t.id === updatedTaskFromApi.id ? updatedTaskFromApi : t));
            } else {
                alert("Failed to save changes");
            }
        }
    };

    const handleTaskDelete = async (taskId: string) => {
        const success = await deleteTask(taskId);
        if (success) {
            setTasks(prev => prev.filter(t => t.id !== taskId));
        } else {
            console.log("Failed to delete task");
        }
    }

    const handleAddTask = (listId: string) => {
        const todayISO = new Date().toISOString();
        
        const tempTask: Task = {
            id: `temp-${Date.now()}`, 
            name: "", // Empty name waiting for input
            is_completed: false,
            task_list_id: listId,
            start_date: todayISO,
            end_date: todayISO, // Defaults to today
            user_id: "", // Placeholder, will be ignored by creation API
        };

        setTasks(prev => [...prev, tempTask]);
    };

    const handleCreateList = async () => {
        if (!newListName.trim()) {
            setIsCreatingList(false);
            return;
        }

        // Call API
        const newList = await createList(newListName); //

        if (newList) {
            setLists([...lists, newList]);
            setNewListName("");
            setIsCreatingList(false);
        } else {
            alert("Failed to create list");
        }
    };

    const handleListUpdate = async (list: TaskList, newName: string) => {
        // Pass the updated goal_id (if this was triggered by a goal change) to the backend
        // Use the nullish coalescing operator to handle undefined
        const updatedList = await updateList(list.id, newName, list.goal_id ?? null);

        if (updatedList) {
            // Update state. Since the API response (updatedList) likely doesn't contain 'goalName',
            // we manually preserve it from the 'list' object passed in.
            setLists(prev => prev.map(l => l.id === list.id ? { 
                ...updatedList, 
                goal_id: list.goal_id, 
                goalName: list.goalName 
            } : l));
        } else {
            alert("Failed to update list");
        }
    };

    const handleListDelete = async (listId: string) => {
        // TODO: replaced by a modal later
        // TODO: need to verify if all tasks are completed/deleted
        if (!confirm("Are you sure you want to delete this list and all its tasks?")) return;

        const success = await deleteList(listId); //
        if (success) {
            setLists(prev => prev.filter(l => l.id !== listId));
            setTasks(prev => prev.filter(t => t.task_list_id !== listId));
        } else {
            alert("Failed to delete list");
        }
    };

    const renderAddListForm = () => (
        <div className="add-list-wrapper" style={lists.length === 0 ? { marginTop: 0, height: '100%', alignItems: 'center' } : {}}>
            {!isCreatingList ? (
                <button 
                    className="add-task" 
                    onClick={() => setIsCreatingList(true)}
                >
                    + Add a new list
                </button>
            ) : (
                <div className="add-list-form">
                    <TextField 
                        size="small" 
                        variant="outlined"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        placeholder="List Name"
                        autoFocus
                        fullWidth
                    />
                    <div className="form-actions">
                        <Button 
                            variant="contained" 
                            size="small" 
                            onClick={handleCreateList}
                            className="btn-confirm"
                        >
                            <FaCheck />
                        </Button>
                        <Button 
                            variant="contained" 
                            size="small" 
                            onClick={() => setIsCreatingList(false)}
                            className="btn-cancel">
                            <FaXmark />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="todo-view">
            {lists.length === 0 && (
                <div className="list-column empty-placeholder">
                    <h2 className="section-title">Welcome!</h2>
                    <p style={{ color: '#6b7280', marginBottom: '1rem' }}>You don't have any To-do list yet.</p>
                    {renderAddListForm()}
                </div>
            )}
            {lists && tasks && lists.map((list, index) => {
                let taskItems = tasks.filter((item) => item.task_list_id === list.id)

                const uncompleted = taskItems.filter(t => !t.is_completed);
                const completed = taskItems.filter(t => t.is_completed);

                return (
                    <div className="list-column" key={list.id}>
                        <ListHeader 
                            list={list} 
                            goals={goals}
                            onUpdate={handleListUpdate} 
                            onDelete={handleListDelete} 
                        />
                        <div className="list-content-wrapper">
                            <TodoList 
                                title="To do" 
                                tasks={uncompleted} 
                                listId={list.id}
                                onToggle={handleTaskToggle} 
                                onUpdate={handleTaskSave}
                                onDelete={handleTaskDelete}
                                onAdd={handleAddTask}
                            />
                            <TodoList 
                                title="Completed" 
                                tasks={completed} 
                                listId={list.id}
                                onToggle={handleTaskToggle} 
                                onUpdate={handleTaskSave}
                                onDelete={handleTaskDelete}
                                onAdd={handleAddTask}
                            />
                        </div>
                        {index === 0 && renderAddListForm()}
                    </div>
                );
        })}
        </div>
    );
}

// Local copy of TaskList type
export type TaskList = {
    name: string;
    id: string;
    user_id: string;
    created_at: string;
    updated_at: string;
    goal_id?: string;
    goalName?: string;
};

// Extended type for goal association
export type TaskListWithGoal = TaskList & { goalId?: string; goalName?: string };

export type ListHeaderProps = {
    list: TaskList;
    goals: GoalUI[];
    onUpdate: (list: TaskList, newName: string) => void;
    onDelete: (listId: string) => void;
};

export function ListHeader({ list, goals, onUpdate, onDelete }: ListHeaderProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(list.name);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    // Goal name is now primarily derived from props
    const [currentGoalName, setCurrentGoalName] = useState(list.goalName || "");

    useEffect(() => {
        setCurrentGoalName(list.goalName || "");
    }, [list.goalName]);

    const handleSave = () => {
        if (editName.trim()) {
            onUpdate(list, editName);
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditName(list.name);
        setIsEditing(false);
    };

    const handleGoalButtonClick = (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleGoalSelect = async (goalId: string, goalTitle: string) => {
        // Pass the updated goal information to the parent handler
        await onUpdate({ ...list, goal_id: goalId, goalName: goalTitle }, list.name);
        setCurrentGoalName(goalTitle);
        setAnchorEl(null);
    };

    const handleRemoveAssociation = async () => {
        await onUpdate({ ...list, goal_id: undefined, goalName: undefined }, list.name);
        setCurrentGoalName("");
        setAnchorEl(null);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    if (!isEditing) {
        return (
            <div className="list-header">
                <h2 onClick={() => setIsEditing(true)} title="Click to edit list name">
                    {list.name}
                </h2>

                <div className="header-actions">
                    <button 
                        className="goal-btn" 
                        onClick={handleGoalButtonClick}
                        title={currentGoalName ? `Goal: ${currentGoalName}` : "Associate Goal"}
                    >
                        {currentGoalName ? `Goal: ${currentGoalName}` : "Associate Goal"}
                    </button>
                    
                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={handleMenuClose}
                    >
                        {/* Only show if a goal is actually associated */}
                        {currentGoalName && (
                            <MenuItem 
                                onClick={handleRemoveAssociation} 
                                className="remove-association-option"
                            >
                                Remove Association
                            </MenuItem>
                        )}
                        
                        {goals.map(goal => (
                            <MenuItem key={goal.id} onClick={() => handleGoalSelect(goal.id, goal.title)}>
                                {goal.title}
                            </MenuItem>
                        ))}
                    </Menu>
                </div>
            </div>
        );
    }

    return (
        <div className="list-header editing">
            <div className="edit-inputs">
                <TextField 
                    variant="outlined"
                    size="small"
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)}
                    className="edit-input-text"
                    autoFocus
                />
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
                    onClick={() => onDelete(list.id)} 
                    variant="contained"
                    size="small"
                    className="btn-delete"
                >
                    <FaTrashCan />
                </Button>
            </div>
        </div>
    );
}

export type TodoListProps = {
    title: string;
    tasks: Task[];
    listId: string;
    onToggle: (task: Task) => void;
    onUpdate: (task: Task, newName: string, newDate: string) => void;
    onDelete: (taskId: string) => void;
    onAdd: (listId: string) => void;
};

export function TodoList({ title, tasks, listId, onToggle, onUpdate, onDelete, onAdd }: TodoListProps) {
    return (
    <div className="todo-list-section">
        <h2 className="section-title">{title}</h2>

        <ul className="task-list">
            {tasks.map((task, index) => (
                <TaskItem
                        key={task.id} 
                        task={task}
                        onToggle={() => onToggle(task)}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                    />
            ))}
        </ul>
        {title === "To do" && <button className="add-task" onClick={() => onAdd(listId)}>+ Add a new task</button>}
    </div>
    );
}
