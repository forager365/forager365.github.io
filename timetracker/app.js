class TimeTracker {
    constructor() {
        this.currentView = 'dashboard';
        this.runningTasks = new Map();
        this.timers = new Map();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadDashboard();
        this.updateRunningTaskTimers();
        
        // Debug: Add a test button to manually check task controls
        this.addDebugButton();
    }
    
    addDebugButton() {
        const debugBtn = document.createElement('button');
        debugBtn.textContent = 'DEBUG: Create Test Task';
        debugBtn.className = 'btn btn-secondary';
        debugBtn.style.position = 'fixed';
        debugBtn.style.top = '10px';
        debugBtn.style.right = '10px';
        debugBtn.style.zIndex = '9999';
        debugBtn.onclick = () => this.createDebugTask();
        document.body.appendChild(debugBtn);
    }
    
    async createDebugTask() {
        console.log('Creating debug task...');
        
        // First ensure we have a project
        let projects = await db.getProjects();
        if (projects.length === 0) {
            await db.createProject('Debug Project');
            projects = await db.getProjects();
        }
        
        // Create a test task
        const taskId = await db.createTask('Debug Task', projects[0].id);
        console.log('Debug task created with ID:', taskId);
        
        // Reload tasks
        this.showView('tasks');
    }

    setupEventListeners() {
        document.getElementById('dashboardBtn').addEventListener('click', () => this.showView('dashboard'));
        document.getElementById('projectsBtn').addEventListener('click', () => this.showView('projects'));
        document.getElementById('tasksBtn').addEventListener('click', () => this.showView('tasks'));

        document.getElementById('addProjectBtn').addEventListener('click', () => this.showProjectModal());
        document.getElementById('addTaskBtn').addEventListener('click', () => this.showTaskModal());

        document.getElementById('projectForm').addEventListener('submit', (e) => this.handleProjectSubmit(e));
        document.getElementById('taskForm').addEventListener('submit', (e) => this.handleTaskSubmit(e));

        document.getElementById('projectFilter').addEventListener('change', () => this.loadTasks());
        document.getElementById('statusFilter').addEventListener('change', () => this.loadTasks());

        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                e.target.closest('.modal').style.display = 'none';
            });
        });

        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        });
    }

    showView(viewName) {
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

        document.getElementById(`${viewName}View`).classList.add('active');
        document.getElementById(`${viewName}Btn`).classList.add('active');

        this.currentView = viewName;

        switch(viewName) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'projects':
                this.loadProjects();
                break;
            case 'tasks':
                this.loadTasks();
                this.loadProjectOptions();
                break;
        }
    }

    async loadDashboard() {
        try {
            const projects = await db.getProjects();
            const tasks = await db.getTasks();
            const runningTasks = await db.getRunningTasks();
            const projectSummaries = await db.getProjectSummaries();

            document.getElementById('totalProjects').textContent = projects.length;
            document.getElementById('activeTasks').textContent = runningTasks.length;

            const todayTime = this.calculateTodayTime(tasks);
            document.getElementById('todayTime').textContent = db.formatTime(todayTime);

            this.renderProjectSummaries(projectSummaries);
            this.renderRunningTasks(runningTasks);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    calculateTodayTime(tasks) {
        const today = new Date().toDateString();
        return tasks.filter(task => 
            new Date(task.created_at).toDateString() === today
        ).reduce((sum, task) => sum + (task.total_time || 0), 0);
    }

    renderProjectSummaries(summaries) {
        const container = document.getElementById('projectSummaries');
        
        if (summaries.length === 0) {
            container.innerHTML = '<p>No projects yet. Create your first project to get started!</p>';
            return;
        }

        container.innerHTML = summaries.map(project => `
            <div class="project-summary">
                <div>
                    <strong>${project.name}</strong>
                    <div class="item-meta">${project.totalTasks} tasks • ${project.activeTasks} active</div>
                </div>
                <div class="time-display">${db.formatTime(project.totalTime)}</div>
            </div>
        `).join('');
    }

    renderRunningTasks(tasks) {
        const container = document.getElementById('runningTasks');
        
        if (tasks.length === 0) {
            container.innerHTML = '<p>No tasks currently running.</p>';
            return;
        }

        container.innerHTML = tasks.map(task => `
            <div class="running-task">
                <div>
                    <strong>${task.name}</strong>
                    <div class="item-meta">${task.project_name} • <span class="status-badge status-${task.status}">${task.status}</span></div>
                </div>
                <div>
                    <span class="time-display" id="timer-${task.id}">${db.formatTime(task.total_time)}</span>
                    <div class="task-controls">
                        ${task.status === 'running' ? 
                            `<button class="btn btn-warning btn-small" onclick="app.pauseTask(${task.id})">Pause</button>
                             <button class="btn btn-danger btn-small" onclick="app.stopTask(${task.id})">Stop</button>` :
                            `<button class="btn btn-success btn-small" onclick="app.startTask(${task.id})">Resume</button>
                             <button class="btn btn-danger btn-small" onclick="app.stopTask(${task.id})">Stop</button>`
                        }
                    </div>
                </div>
            </div>
        `).join('');
    }

    async loadProjects() {
        try {
            const projects = await db.getProjects();
            const container = document.getElementById('projectsList');

            if (projects.length === 0) {
                container.innerHTML = '<div class="item"><p>No projects yet. Create your first project!</p></div>';
                return;
            }

            container.innerHTML = projects.map(project => `
                <div class="item">
                    <div class="item-info">
                        <h3>${project.name}</h3>
                        <div class="item-meta">Created ${new Date(project.created_at).toLocaleDateString()}</div>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-secondary btn-small" onclick="app.editProject(${project.id}, '${project.name}')">Edit</button>
                        <button class="btn btn-danger btn-small" onclick="app.deleteProject(${project.id})">Delete</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    }

    async loadTasks() {
        try {
            const projectFilter = document.getElementById('projectFilter').value;
            const statusFilter = document.getElementById('statusFilter').value;
            
            let tasks = await db.getTasks(projectFilter || null);
            
            if (statusFilter) {
                tasks = tasks.filter(task => task.status === statusFilter);
            }

            const container = document.getElementById('tasksList');

            if (tasks.length === 0) {
                container.innerHTML = '<div class="item"><p>No tasks found. Create your first task!</p></div>';
                return;
            }

            console.log('Loading tasks:', tasks);
            
            container.innerHTML = tasks.map(task => {
                console.log('Rendering task:', task);
                const controls = this.getTaskControls(task);
                console.log('Task controls for task', task.id, ':', controls);
                
                return `
                <div class="item">
                    <div class="item-info">
                        <h3>${task.name}</h3>
                        <div class="item-meta">
                            ${task.project_name} • 
                            <span class="status-badge status-${task.status || 'stopped'}">${task.status || 'stopped'}</span> • 
                            Time: <span class="time-display" id="task-timer-${task.id}">${db.formatTime(task.total_time || 0)}</span>
                        </div>
                    </div>
                    <div class="task-controls">
                        <button class="btn btn-success btn-small" onclick="app.startTask(${task.id})" ${(task.status === 'running') ? 'disabled' : ''}>
                            ${(task.status === 'paused') ? 'Resume' : 'Start'}
                        </button>
                        <button class="btn btn-warning btn-small" onclick="app.pauseTask(${task.id})" ${(task.status !== 'running') ? 'disabled' : ''}>
                            Pause
                        </button>
                        <button class="btn btn-danger btn-small" onclick="app.stopTask(${task.id})" ${(task.status === 'stopped') ? 'disabled' : ''}>
                            Stop
                        </button>
                    </div>
                    <div class="item-actions">
                        <button class="btn btn-secondary btn-small" onclick="app.editTask(${task.id}, '${task.name}', ${task.project_id})">Edit</button>
                        <button class="btn btn-danger btn-small" onclick="app.deleteTask(${task.id})">Delete</button>
                    </div>
                </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Error loading tasks:', error);
        }
    }

    getTaskControls(task) {
        console.log('getTaskControls called with task:', task, 'status:', task.status);
        
        const status = task.status || 'stopped';
        
        switch(status) {
            case 'stopped':
            case 'completed':
                return `
                    <button class="btn btn-success btn-small" onclick="app.startTask(${task.id})">Start</button>
                    <button class="btn btn-warning btn-small" onclick="app.pauseTask(${task.id})" disabled>Pause</button>
                    <button class="btn btn-danger btn-small" onclick="app.stopTask(${task.id})" disabled>Stop</button>
                `;
            case 'running':
                return `
                    <button class="btn btn-success btn-small" onclick="app.startTask(${task.id})" disabled>Start</button>
                    <button class="btn btn-warning btn-small" onclick="app.pauseTask(${task.id})">Pause</button>
                    <button class="btn btn-danger btn-small" onclick="app.stopTask(${task.id})">Stop</button>
                `;
            case 'paused':
                return `
                    <button class="btn btn-success btn-small" onclick="app.startTask(${task.id})">Resume</button>
                    <button class="btn btn-warning btn-small" onclick="app.pauseTask(${task.id})" disabled>Pause</button>
                    <button class="btn btn-danger btn-small" onclick="app.stopTask(${task.id})">Stop</button>
                `;
            default:
                console.log('Default case for status:', status);
                return `
                    <button class="btn btn-success btn-small" onclick="app.startTask(${task.id})">Start</button>
                    <button class="btn btn-warning btn-small" onclick="app.pauseTask(${task.id})" disabled>Pause</button>
                    <button class="btn btn-danger btn-small" onclick="app.stopTask(${task.id})" disabled>Stop</button>
                `;
        }
    }

    async loadProjectOptions() {
        try {
            const projects = await db.getProjects();
            const selects = [
                document.getElementById('taskProject'),
                document.getElementById('projectFilter')
            ];

            selects.forEach(select => {
                if (select.id === 'projectFilter') {
                    select.innerHTML = '<option value="">All Projects</option>';
                } else {
                    select.innerHTML = '<option value="">Select Project</option>';
                }
                
                projects.forEach(project => {
                    select.innerHTML += `<option value="${project.id}">${project.name}</option>`;
                });
            });
        } catch (error) {
            console.error('Error loading project options:', error);
        }
    }

    showProjectModal(id = null, name = '') {
        const modal = document.getElementById('projectModal');
        const title = document.getElementById('projectModalTitle');
        const form = document.getElementById('projectForm');
        
        if (id) {
            title.textContent = 'Edit Project';
            document.getElementById('projectId').value = id;
            document.getElementById('projectName').value = name;
        } else {
            title.textContent = 'Add Project';
            form.reset();
        }
        
        modal.style.display = 'block';
    }

    showTaskModal(id = null, name = '', projectId = '') {
        const modal = document.getElementById('taskModal');
        const title = document.getElementById('taskModalTitle');
        const form = document.getElementById('taskForm');
        
        if (id) {
            title.textContent = 'Edit Task';
            document.getElementById('taskId').value = id;
            document.getElementById('taskName').value = name;
            document.getElementById('taskProject').value = projectId;
        } else {
            title.textContent = 'Add Task';
            form.reset();
        }
        
        modal.style.display = 'block';
    }

    async handleProjectSubmit(e) {
        e.preventDefault();
        
        const id = document.getElementById('projectId').value;
        const name = document.getElementById('projectName').value.trim();
        
        console.log('Project form submission:', { id, name });
        
        if (!name) {
            alert('Please enter a project name.');
            return;
        }

        try {
            if (id) {
                await db.updateProject(id, name);
                console.log('Project updated');
            } else {
                const projectId = await db.createProject(name);
                console.log('Project created with ID:', projectId);
            }
            
            document.getElementById('projectModal').style.display = 'none';
            this.loadProjects();
            this.loadProjectOptions();
            
            if (this.currentView === 'dashboard') {
                this.loadDashboard();
            }
        } catch (error) {
            console.error('Error saving project:', error);
            alert('Error saving project. Please try again.');
        }
    }

    async handleTaskSubmit(e) {
        e.preventDefault();
        
        const id = document.getElementById('taskId').value;
        const name = document.getElementById('taskName').value.trim();
        const projectId = document.getElementById('taskProject').value;
        
        console.log('Task form submission:', { id, name, projectId });
        
        if (!name || !projectId) {
            alert('Please fill in both task name and select a project.');
            return;
        }

        try {
            if (id) {
                await db.updateTask(id, name, projectId);
                console.log('Task updated');
            } else {
                const taskId = await db.createTask(name, projectId);
                console.log('Task created with ID:', taskId);
            }
            
            document.getElementById('taskModal').style.display = 'none';
            this.loadTasks();
            
            if (this.currentView === 'dashboard') {
                this.loadDashboard();
            }
        } catch (error) {
            console.error('Error saving task:', error);
            alert('Error saving task. Please try again.');
        }
    }

    editProject(id, name) {
        this.showProjectModal(id, name);
    }

    editTask(id, name, projectId) {
        this.showTaskModal(id, name, projectId);
    }

    async deleteProject(id) {
        if (!confirm('Are you sure you want to delete this project? All associated tasks will also be deleted.')) {
            return;
        }

        try {
            await db.deleteProject(id);
            this.loadProjects();
            this.loadProjectOptions();
            
            if (this.currentView === 'dashboard') {
                this.loadDashboard();
            }
        } catch (error) {
            console.error('Error deleting project:', error);
            alert('Error deleting project. Please try again.');
        }
    }

    async deleteTask(id) {
        if (!confirm('Are you sure you want to delete this task? All time entries will also be deleted.')) {
            return;
        }

        try {
            this.stopTaskTimer(id);
            await db.deleteTask(id);
            this.loadTasks();
            
            if (this.currentView === 'dashboard') {
                this.loadDashboard();
            }
        } catch (error) {
            console.error('Error deleting task:', error);
            alert('Error deleting task. Please try again.');
        }
    }

    async startTask(taskId) {
        try {
            // Get current task data to preserve existing time
            const tasks = await db.getTasks();
            const currentTask = tasks.find(t => t.id == taskId);
            const existingTime = currentTask ? (currentTask.total_time || 0) : 0;
            
            const startTime = new Date().toISOString();
            this.runningTasks.set(taskId, {
                startTime: Date.now(),
                initialTime: existingTime
            });

            await db.updateTaskStatus(taskId, 'running');
            this.startTaskTimer(taskId);
            
            console.log(`Started task ${taskId} with existing time: ${existingTime}s`);
            this.refreshCurrentView();
        } catch (error) {
            console.error('Error starting task:', error);
            alert('Error starting task. Please try again.');
        }
    }

    async pauseTask(taskId) {
        try {
            const taskData = this.runningTasks.get(taskId);
            if (taskData) {
                const elapsedTime = Math.floor((Date.now() - taskData.startTime) / 1000);
                const totalTime = taskData.initialTime + elapsedTime;
                
                await db.updateTaskStatus(taskId, 'paused', totalTime);
                this.stopTaskTimer(taskId);
                this.runningTasks.delete(taskId);
            }
            
            this.refreshCurrentView();
        } catch (error) {
            console.error('Error pausing task:', error);
            alert('Error pausing task. Please try again.');
        }
    }

    async stopTask(taskId) {
        try {
            const taskData = this.runningTasks.get(taskId);
            let totalTime = 0;
            
            if (taskData) {
                const elapsedTime = Math.floor((Date.now() - taskData.startTime) / 1000);
                totalTime = taskData.initialTime + elapsedTime;
                
                await db.addTimeEntry(
                    taskId,
                    new Date(taskData.startTime).toISOString(),
                    new Date().toISOString(),
                    elapsedTime
                );
            }
            
            await db.updateTaskStatus(taskId, 'stopped', totalTime);
            this.stopTaskTimer(taskId);
            this.runningTasks.delete(taskId);
            
            this.refreshCurrentView();
        } catch (error) {
            console.error('Error stopping task:', error);
            alert('Error stopping task. Please try again.');
        }
    }

    startTaskTimer(taskId) {
        this.timers.set(taskId, setInterval(() => {
            this.updateTaskTimer(taskId);
        }, 1000));
    }

    stopTaskTimer(taskId) {
        const timer = this.timers.get(taskId);
        if (timer) {
            clearInterval(timer);
            this.timers.delete(taskId);
        }
    }

    updateTaskTimer(taskId) {
        const taskData = this.runningTasks.get(taskId);
        if (!taskData) return;

        const elapsedTime = Math.floor((Date.now() - taskData.startTime) / 1000);
        const totalTime = taskData.initialTime + elapsedTime;
        
        // Update timer in task list
        const timerElement = document.getElementById(`task-timer-${taskId}`);
        if (timerElement) {
            timerElement.textContent = db.formatTime(totalTime);
        }
        
        // Update timer in dashboard running tasks
        const dashboardTimer = document.getElementById(`timer-${taskId}`);
        if (dashboardTimer) {
            dashboardTimer.textContent = db.formatTime(totalTime);
        }
    }

    async updateRunningTaskTimers() {
        try {
            const runningTasks = await db.getRunningTasks();
            console.log('Restoring timers for running tasks:', runningTasks);
            
            runningTasks.forEach(task => {
                if (task.status === 'running') {
                    // For page refresh, assume the task was started recently
                    // In a real app, you'd store the actual start time
                    this.runningTasks.set(task.id, {
                        startTime: Date.now(), 
                        initialTime: task.total_time || 0
                    });
                    this.startTaskTimer(task.id);
                    console.log(`Restored timer for task ${task.id}`);
                }
            });
        } catch (error) {
            console.error('Error updating running task timers:', error);
        }
    }

    refreshCurrentView() {
        setTimeout(() => {
            this.showView(this.currentView);
        }, 100);
    }
}

function closeProjectModal() {
    document.getElementById('projectModal').style.display = 'none';
}

function closeTaskModal() {
    document.getElementById('taskModal').style.display = 'none';
}

const app = new TimeTracker();