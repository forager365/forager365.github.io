class Database {
    constructor() {
        this.db = null;
        this.init();
    }

    init() {
        if (typeof window !== 'undefined' && window.openDatabase) {
            this.db = window.openDatabase('TimeTracker', '1.0', 'Time Tracking Database', 2 * 1024 * 1024);
            this.createTables();
        } else {
            this.useLocalStorage();
        }
    }

    useLocalStorage() {
        this.storage = {
            projects: JSON.parse(localStorage.getItem('timetracker_projects') || '[]'),
            tasks: JSON.parse(localStorage.getItem('timetracker_tasks') || '[]'),
            timeEntries: JSON.parse(localStorage.getItem('timetracker_time_entries') || '[]')
        };
        console.log('Using localStorage fallback');
    }

    createTables() {
        this.db.transaction(tx => {
            tx.executeSql(`
                CREATE TABLE IF NOT EXISTS projects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            tx.executeSql(`
                CREATE TABLE IF NOT EXISTS tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    project_id INTEGER NOT NULL,
                    status TEXT DEFAULT 'stopped',
                    total_time INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (project_id) REFERENCES projects (id)
                )
            `);

            tx.executeSql(`
                CREATE TABLE IF NOT EXISTS time_entries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task_id INTEGER NOT NULL,
                    start_time DATETIME,
                    end_time DATETIME,
                    duration INTEGER,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (task_id) REFERENCES tasks (id)
                )
            `);
        });
    }

    saveToLocalStorage() {
        if (!this.db) {
            localStorage.setItem('timetracker_projects', JSON.stringify(this.storage.projects));
            localStorage.setItem('timetracker_tasks', JSON.stringify(this.storage.tasks));
            localStorage.setItem('timetracker_time_entries', JSON.stringify(this.storage.timeEntries));
        }
    }

    async executeQuery(query, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve(this.handleLocalStorageQuery(query, params));
                return;
            }

            this.db.transaction(tx => {
                tx.executeSql(query, params, (tx, result) => {
                    resolve(result);
                }, (tx, error) => {
                    reject(error);
                });
            });
        });
    }

    handleLocalStorageQuery(query, params) {
        const queryLower = query.toLowerCase().trim();
        
        if (queryLower.includes('insert into projects')) {
            const project = {
                id: Date.now(),
                name: params[0],
                created_at: new Date().toISOString()
            };
            this.storage.projects.push(project);
            this.saveToLocalStorage();
            console.log('Project created:', project);
            return { insertId: project.id, rowsAffected: 1 };
        }
        
        if (queryLower.includes('insert into tasks')) {
            const task = {
                id: Date.now(),
                name: params[0],
                project_id: parseInt(params[1]),
                status: 'stopped',
                total_time: 0,
                created_at: new Date().toISOString()
            };
            this.storage.tasks.push(task);
            this.saveToLocalStorage();
            console.log('Task created:', task);
            return { insertId: task.id, rowsAffected: 1 };
        }
        
        if (queryLower.includes('insert into time_entries')) {
            const entry = {
                id: Date.now(),
                task_id: params[0],
                start_time: params[1],
                end_time: params[2],
                duration: params[3],
                created_at: new Date().toISOString()
            };
            this.storage.timeEntries.push(entry);
            this.saveToLocalStorage();
            return { insertId: entry.id, rowsAffected: 1 };
        }
        
        if (queryLower.includes('select * from projects')) {
            const rows = this.storage.projects.slice();
            rows.length = this.storage.projects.length;
            return { rows };
        }
        
        if (queryLower.includes('select') && queryLower.includes('from tasks')) {
            let tasks = this.storage.tasks.slice();
            
            // Handle WHERE clause for project filtering
            if (queryLower.includes('where t.project_id')) {
                const projectIdParam = params[0];
                if (projectIdParam) {
                    tasks = tasks.filter(task => task.project_id == projectIdParam);
                }
            }
            
            // Add project_name to each task
            tasks = tasks.map(task => {
                const project = this.storage.projects.find(p => p.id === task.project_id);
                return { ...task, project_name: project ? project.name : 'Unknown' };
            });
            
            console.log('Database getTasks result:', tasks);
            
            const rows = tasks.slice();
            rows.length = tasks.length;
            return { rows };
        }
        
        if (queryLower.includes('update tasks set status')) {
            const taskId = params[params.length - 1];
            const status = params[0];
            const task = this.storage.tasks.find(t => t.id == taskId);
            if (task) {
                task.status = status;
                if (params.length > 2) {
                    task.total_time = params[1];
                }
                this.saveToLocalStorage();
            }
            return { rowsAffected: 1 };
        }
        
        if (queryLower.includes('update projects set name')) {
            const projectId = params[1];
            const name = params[0];
            const project = this.storage.projects.find(p => p.id == projectId);
            if (project) {
                project.name = name;
                this.saveToLocalStorage();
            }
            return { rowsAffected: 1 };
        }
        
        if (queryLower.includes('update tasks set name')) {
            const taskId = params[2];
            const name = params[0];
            const projectId = params[1];
            const task = this.storage.tasks.find(t => t.id == taskId);
            if (task) {
                task.name = name;
                task.project_id = projectId;
                this.saveToLocalStorage();
            }
            return { rowsAffected: 1 };
        }
        
        if (queryLower.includes('delete from projects')) {
            const projectId = params[0];
            this.storage.projects = this.storage.projects.filter(p => p.id != projectId);
            this.storage.tasks = this.storage.tasks.filter(t => t.project_id != projectId);
            this.saveToLocalStorage();
            return { rowsAffected: 1 };
        }
        
        if (queryLower.includes('delete from tasks')) {
            const taskId = params[0];
            this.storage.tasks = this.storage.tasks.filter(t => t.id != taskId);
            this.storage.timeEntries = this.storage.timeEntries.filter(te => te.task_id != taskId);
            this.saveToLocalStorage();
            return { rowsAffected: 1 };
        }
        
        return { rows: [], rowsAffected: 0 };
    }

    async getProjects() {
        const result = await this.executeQuery('SELECT * FROM projects ORDER BY created_at DESC');
        return Array.from(result.rows || []);
    }

    async getTasks(projectId = null) {
        let query = `
            SELECT t.*, p.name as project_name 
            FROM tasks t 
            JOIN projects p ON t.project_id = p.id
        `;
        let params = [];
        
        if (projectId) {
            query += ' WHERE t.project_id = ?';
            params = [projectId];
        }
        
        query += ' ORDER BY t.created_at DESC';
        
        const result = await this.executeQuery(query, params);
        return Array.from(result.rows || []);
    }

    async createProject(name) {
        const result = await this.executeQuery('INSERT INTO projects (name) VALUES (?)', [name]);
        return result.insertId;
    }

    async updateProject(id, name) {
        await this.executeQuery('UPDATE projects SET name = ? WHERE id = ?', [name, id]);
    }

    async deleteProject(id) {
        await this.executeQuery('DELETE FROM time_entries WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)', [id]);
        await this.executeQuery('DELETE FROM tasks WHERE project_id = ?', [id]);
        await this.executeQuery('DELETE FROM projects WHERE id = ?', [id]);
    }

    async createTask(name, projectId) {
        const result = await this.executeQuery('INSERT INTO tasks (name, project_id) VALUES (?, ?)', [name, projectId]);
        return result.insertId;
    }

    async updateTask(id, name, projectId) {
        await this.executeQuery('UPDATE tasks SET name = ?, project_id = ? WHERE id = ?', [name, projectId, id]);
    }

    async deleteTask(id) {
        await this.executeQuery('DELETE FROM time_entries WHERE task_id = ?', [id]);
        await this.executeQuery('DELETE FROM tasks WHERE id = ?', [id]);
    }

    async updateTaskStatus(taskId, status, totalTime = null) {
        if (totalTime !== null) {
            await this.executeQuery('UPDATE tasks SET status = ?, total_time = ? WHERE id = ?', [status, totalTime, taskId]);
        } else {
            await this.executeQuery('UPDATE tasks SET status = ? WHERE id = ?', [status, taskId]);
        }
    }

    async addTimeEntry(taskId, startTime, endTime, duration) {
        await this.executeQuery(
            'INSERT INTO time_entries (task_id, start_time, end_time, duration) VALUES (?, ?, ?, ?)',
            [taskId, startTime, endTime, duration]
        );
    }

    async getProjectSummaries() {
        const projects = await this.getProjects();
        const summaries = [];
        
        for (const project of projects) {
            const tasks = await this.getTasks(project.id);
            const totalTime = tasks.reduce((sum, task) => sum + (task.total_time || 0), 0);
            const activeTasks = tasks.filter(task => task.status === 'running' || task.status === 'paused').length;
            
            summaries.push({
                ...project,
                totalTime,
                activeTasks,
                totalTasks: tasks.length
            });
        }
        
        return summaries;
    }

    async getRunningTasks() {
        const result = await this.executeQuery(`
            SELECT t.*, p.name as project_name 
            FROM tasks t 
            JOIN projects p ON t.project_id = p.id 
            WHERE t.status IN ('running', 'paused')
            ORDER BY t.created_at DESC
        `);
        return Array.from(result.rows || []);
    }

    formatTime(seconds) {
        if (!seconds) return '0h 0m';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        }
        return `${minutes}m`;
    }
}

const db = new Database();