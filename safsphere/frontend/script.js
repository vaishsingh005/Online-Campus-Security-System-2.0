// API Base URL
const API_URL = 'http://localhost:5000/api';

// Current user storage
const CURRENT_USER_KEY = 'safesphere_current_user';

// Data structures
let currentUser = null;
let logs = [];
let visitors = [];
let attendance = [];
let incidents = [];
let notifications = [];

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    checkAutoLogin();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('signupForm').addEventListener('submit', handleSignup);
    
    document.getElementById('showSignup').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('loginPage').classList.add('hidden');
        document.getElementById('signupPage').classList.remove('hidden');
    });
    
    document.getElementById('showLogin').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('signupPage').classList.add('hidden');
        document.getElementById('loginPage').classList.remove('hidden');
    });

    document.getElementById('incidentMedia').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            document.getElementById('mediaFileName').textContent = '✓ ' + file.name;
        }
    });

    document.getElementById('logDateFilter').valueAsDate = new Date();
}

function checkAutoLogin() {
    const savedUser = localStorage.getItem(CURRENT_USER_KEY);
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            showDashboard();
        } catch (e) {
            localStorage.removeItem(CURRENT_USER_KEY);
        }
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const emailOrId = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!emailOrId || !password) {
        showAlert('loginAlert', 'Please enter both email/ID and password.', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailOrId, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.user;
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(data.user));
            showAlert('loginAlert', 'Login successful! Welcome to SafeSphere.', 'success');
            
            setTimeout(() => {
                showDashboard();
            }, 1000);
        } else {
            showAlert('loginAlert', data.message, 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAlert('loginAlert', 'Connection error. Please check if the server is running.', 'error');
    }
}

async function handleSignup(e) {
    e.preventDefault();
    
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const role = document.getElementById('signupRole').value;
    const idNumber = document.getElementById('signupId').value.trim();
    
    if (!name || !email || !password || !role || !idNumber) {
        showAlert('signupAlert', 'Please fill in all fields.', 'error');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showAlert('signupAlert', 'Please enter a valid email address.', 'error');
        return;
    }
    
    if (password.length < 6) {
        showAlert('signupAlert', 'Password must be at least 6 characters long.', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role, idNumber })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('signupAlert', 'Account created successfully! Please login.', 'success');
            
            setTimeout(() => {
                document.getElementById('signupForm').reset();
                document.getElementById('signupPage').classList.add('hidden');
                document.getElementById('loginPage').classList.remove('hidden');
            }, 1500);
        } else {
            showAlert('signupAlert', data.message, 'error');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showAlert('signupAlert', 'Connection error. Please check if the server is running.', 'error');
    }
}

function showDashboard() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('signupPage').classList.add('hidden');
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('sosButton').classList.remove('hidden');
    
    document.getElementById('welcomeUser').textContent = 'Welcome, ' + currentUser.name + '!';
    document.getElementById('userRole').textContent = currentUser.role.toUpperCase();
    document.getElementById('userId').textContent = 'User ID: ' + currentUser.userId;
    
    configureRoleAccess();
    generateQRCode();
    loadAttendance();
    loadLogs();
    loadVisitors();
    loadIncidents();
    loadNotifications();
    updateReports();
}

function configureRoleAccess() {
    const role = currentUser.role;
    
    document.getElementById('scanBtn').style.display = 'none';
    document.getElementById('visitorBtn').style.display = 'none';
    document.getElementById('logsBtn').style.display = 'none';
    document.getElementById('reportsBtn').style.display = 'none';
    
    if (role === 'admin' || role === 'security') {
        document.getElementById('scanBtn').style.display = 'block';
        document.getElementById('visitorBtn').style.display = 'block';
        document.getElementById('logsBtn').style.display = 'block';
        document.getElementById('reportsBtn').style.display = 'block';
    }
}

function generateQRCode() {
    const qrCanvas = document.getElementById('qrCanvas');
    qrCanvas.innerHTML = '';
    
    document.getElementById('displayUserId').textContent = currentUser.userId;
    document.getElementById('qrUserName').textContent = currentUser.name;
    document.getElementById('qrUserRole').textContent = currentUser.role;
    
    new QRCode(qrCanvas, {
        text: currentUser.userId,
        width: 200,
        height: 200,
        colorDark: '#667eea',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
}

function showSection(sectionName) {
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.section').forEach(section => section.classList.remove('active'));
    
    event.target.closest('.nav-btn').classList.add('active');
    
    const sectionMap = {
        'myQr': 'myQr',
        'attendance': 'attendance',
        'scan': 'scanSection',
        'visitors': 'visitors',
        'incidents': 'incidents',
        'logs': 'logs',
        'reports': 'reports',
        'notifications': 'notifications'
    };
    
    document.getElementById(sectionMap[sectionName]).classList.add('active');
    
    if (sectionName === 'logs') loadLogs();
    if (sectionName === 'visitors') loadVisitors();
    if (sectionName === 'incidents') loadIncidents();
    if (sectionName === 'notifications') loadNotifications();
    if (sectionName === 'reports') updateReports();
}

async function processEntry() {
    const userId = document.getElementById('scanUserId').value.trim().toUpperCase();
    
    if (!userId) {
        document.getElementById('scanResult').innerHTML = '<p style="color: red;">Please enter a User ID</p>';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, type: 'entry' })
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('scanResult').innerHTML = `
                <div class="log-entry">
                    <h4 style="color: #28a745;">✓ Entry Logged</h4>
                    <p><strong>${data.log.userName}</strong></p>
                    <p>User ID: ${data.log.userId}</p>
                    <p class="log-time">${new Date(data.log.timestamp).toLocaleString()}</p>
                </div>
            `;
            document.getElementById('scanUserId').value = '';
        } else {
            document.getElementById('scanResult').innerHTML = `<p style="color: red;">${data.message}</p>`;
        }
    } catch (error) {
        console.error('Entry error:', error);
        document.getElementById('scanResult').innerHTML = '<p style="color: red;">Connection error</p>';
    }
}

async function processExit() {
    const userId = document.getElementById('scanUserId').value.trim().toUpperCase();
    
    if (!userId) {
        document.getElementById('scanResult').innerHTML = '<p style="color: red;">Please enter a User ID</p>';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/logs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, type: 'exit' })
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('scanResult').innerHTML = `
                <div class="log-entry">
                    <h4 style="color: #dc3545;">✗ Exit Logged</h4>
                    <p><strong>${data.log.userName}</strong></p>
                    <p>User ID: ${data.log.userId}</p>
                    <p class="log-time">${new Date(data.log.timestamp).toLocaleString()}</p>
                </div>
            `;
            document.getElementById('scanUserId').value = '';
        } else {
            document.getElementById('scanResult').innerHTML = `<p style="color: red;">${data.message}</p>`;
        }
    } catch (error) {
        console.error('Exit error:', error);
        document.getElementById('scanResult').innerHTML = '<p style="color: red;">Connection error</p>';
    }
}

async function loadAttendance() {
    try {
        const response = await fetch(`${API_URL}/attendance/${currentUser.userId}`);
        const data = await response.json();
        
        if (data.success) {
            attendance = data.attendance;
            const totalDays = attendance.length;
            const presentDays = attendance.filter(a => a.entry).length;
            const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
            
            document.getElementById('totalDays').textContent = totalDays;
            document.getElementById('presentDays').textContent = presentDays;
            document.getElementById('attendancePercent').textContent = percentage + '%';
            
            const attendanceList = document.getElementById('attendanceList');
            attendanceList.innerHTML = '';
            
            if (attendance.length === 0) {
                attendanceList.innerHTML = '<p style="text-align: center; padding: 20px;">No attendance records yet</p>';
                return;
            }
            
            attendance.slice().reverse().forEach(record => {
                attendanceList.innerHTML += `
                    <div class="log-entry">
                        <p><strong>${record.date}</strong></p>
                        <p>Entry: ${record.entry || 'N/A'}</p>
                        <p>Exit: ${record.exit || 'N/A'}</p>
                    </div>
                `;
            });
        }
    } catch (error) {
        console.error('Load attendance error:', error);
    }
}

async function loadLogs() {
    try {
        const filterDate = document.getElementById('logDateFilter').value;
        let url = `${API_URL}/logs`;
        if (filterDate) {
            url += `?date=${filterDate}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            logs = data.logs;
            const logsList = document.getElementById('logsList');
            logsList.innerHTML = '';
            
            if (logs.length === 0) {
                logsList.innerHTML = '<p style="text-align: center; padding: 20px;">No logs found</p>';
                return;
            }
            
            logs.slice().reverse().forEach(log => {
                const color = log.type === 'entry' ? '#28a745' : '#dc3545';
                logsList.innerHTML += `
                    <div class="log-entry" style="border-left-color: ${color};">
                        <p><strong>${log.userName}</strong> - ${log.type.toUpperCase()}</p>
                        <p>User ID: ${log.userId}</p>
                        <p class="log-time">${new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                `;
            });
        }
    } catch (error) {
        console.error('Load logs error:', error);
    }
}

async function registerVisitor() {
    const name = document.getElementById('visitorName').value.trim();
    const purpose = document.getElementById('visitorPurpose').value.trim();
    const phone = document.getElementById('visitorPhone').value.trim();
    const meeting = document.getElementById('visitorMeeting').value.trim();
    const idType = document.getElementById('visitorIdType').value;
    
    if (!name || !purpose || !phone || !meeting) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/visitors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, purpose, phone, meeting, idType })
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('visitorName').value = '';
            document.getElementById('visitorPurpose').value = '';
            document.getElementById('visitorPhone').value = '';
            document.getElementById('visitorMeeting').value = '';
            document.getElementById('visitorIdType').value = '';
            
            loadVisitors();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Register visitor error:', error);
        alert('Connection error');
    }
}

async function loadVisitors() {
    try {
        const response = await fetch(`${API_URL}/visitors`);
        const data = await response.json();
        
        if (data.success) {
            visitors = data.visitors;
            const visitorsList = document.getElementById('visitorsList');
            visitorsList.innerHTML = '';
            
            if (visitors.length === 0) {
                visitorsList.innerHTML = '<p style="text-align: center; padding: 20px;">No visitors today</p>';
                return;
            }
            
            visitors.slice().reverse().forEach(visitor => {
                visitorsList.innerHTML += `
                    <div class="visitor-card">
                        <div>
                            <p><strong>${visitor.name}</strong></p>
                            <p style="font-size: 0.9em; color: #666;">${visitor.purpose}</p>
                            <p style="font-size: 0.85em;">Meeting: ${visitor.meeting}</p>
                        </div>
                        <span class="status-badge status-${visitor.status}">${visitor.status}</span>
                    </div>
                `;
            });
        }
    } catch (error) {
        console.error('Load visitors error:', error);
    }
}

async function submitIncident() {
    const type = document.getElementById('incidentType').value;
    const location = document.getElementById('incidentLocation').value.trim();
    const description = document.getElementById('incidentDescription').value.trim();
    
    if (!type || !location || !description) {
        alert('Please fill in all required fields');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/incidents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type,
                location,
                description,
                reportedBy: currentUser.name,
                userId: currentUser.userId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('incidentType').value = '';
            document.getElementById('incidentLocation').value = '';
            document.getElementById('incidentDescription').value = '';
            document.getElementById('mediaFileName').textContent = '';
            
            alert('Incident reported successfully. Authorities have been notified.');
            loadIncidents();
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error('Submit incident error:', error);
        alert('Connection error');
    }
}

async function loadIncidents() {
    try {
        const response = await fetch(`${API_URL}/incidents`);
        const data = await response.json();
        
        if (data.success) {
            incidents = data.incidents;
            const incidentsList = document.getElementById('incidentsList');
            incidentsList.innerHTML = '';
            
            if (incidents.length === 0) {
                incidentsList.innerHTML = '<p style="text-align: center; padding: 20px;">No incidents reported</p>';
                return;
            }
            
            incidents.slice().reverse().slice(0, 10).forEach(incident => {
                incidentsList.innerHTML += `
                    <div class="incident-card">
                        <p><strong>${incident.type}</strong></p>
                        <p style="font-size: 0.9em;">Location: ${incident.location}</p>
                        <p style="font-size: 0.85em; color: #666;">${incident.description}</p>
                        <p style="font-size: 0.85em; color: #666;">Reported by: ${incident.reportedBy}</p>
                        <p class="log-time">${new Date(incident.timestamp).toLocaleString()}</p>
                    </div>
                `;
            });
        }
    } catch (error) {
        console.error('Load incidents error:', error);
    }
}

async function loadNotifications() {
    try {
        const response = await fetch(`${API_URL}/notifications`);
        const data = await response.json();
        
        if (data.success) {
            notifications = data.notifications;
            const notificationsList = document.getElementById('notificationsList');
            notificationsList.innerHTML = '';
            
            if (notifications.length === 0) {
                notificationsList.innerHTML = '<p style="text-align: center; padding: 20px;">No notifications</p>';
                return;
            }
            
            notifications.slice().reverse().forEach(notif => {
                const typeClass = 'notification-' + notif.type;
                notificationsList.innerHTML += `
                    <div class="log-entry ${typeClass}" style="border-left-width: 4px;">
                        <p>${notif.message}</p>
                        <p class="log-time">${new Date(notif.timestamp).toLocaleString()}</p>
                    </div>
                `;
            });
        }
    } catch (error) {
        console.error('Load notifications error:', error);
    }
}

async function updateReports() {
    try {
        const response = await fetch(`${API_URL}/reports`);
        const data = await response.json();
        
        if (data.success) {
            const reports = data.reports;
            document.getElementById('totalEntries').textContent = reports.todayEntries;
            document.getElementById('currentlyInside').textContent = reports.currentlyInside;
            document.getElementById('totalVisitors').textContent = reports.todayVisitors;
        }
    } catch (error) {
        console.error('Update reports error:', error);
    }
}

async function generateReport() {
    try {
        const response = await fetch(`${API_URL}/reports`);
        const data = await response.json();
        
        if (data.success) {
            const reports = data.reports;
            const detailedReport = document.getElementById('detailedReport');
            
            detailedReport.innerHTML = `
                <div class="reports-grid">
                    <div class="report-card">
                        <h4>Total Users</h4>
                        <div class="stat-number">${reports.totalUsers}</div>
                    </div>
                    <div class="report-card">
                        <h4>Total Logs</h4>
                        <div class="stat-number">${reports.totalLogs}</div>
                    </div>
                    <div class="report-card">
                        <h4>Total Visitors</h4>
                        <div class="stat-number">${reports.totalVisitors}</div>
                    </div>
                    <div class="report-card">
                        <h4>Total Incidents</h4>
                        <div class="stat-number">${reports.totalIncidents}</div>
                    </div>
                </div>
                <div class="attendance-card" style="margin-top: 20px;">
                    <h4>Report Generated</h4>
                    <p>Generated on: ${new Date().toLocaleString()}</p>
                    <p>Generated by: ${currentUser.name}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Generate report error:', error);
    }
}

async function triggerSOS() {
    if (confirm('⚠️ EMERGENCY ALERT\n\nAre you sure you want to send an SOS alert?\n\nThis will notify campus security and emergency services immediately.')) {
        try {
            const response = await fetch(`${API_URL}/incidents`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'SOS Emergency',
                    location: 'Location sharing enabled',
                    description: 'SOS button pressed by ' + currentUser.name,
                    reportedBy: currentUser.name,
                    userId: currentUser.userId
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                alert('🚨 SOS ALERT SENT!\n\nCampus security and emergency services have been notified.\nHelp is on the way.\n\nStay safe and stay where you are if possible.');
            }
        } catch (error) {
            console.error('SOS error:', error);
            alert('Error sending SOS. Please call emergency services directly.');
        }
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem(CURRENT_USER_KEY);
        currentUser = null;
        
        document.getElementById('dashboard').style.display = 'none';
        document.getElementById('sosButton').classList.add('hidden');
        document.getElementById('loginPage').classList.remove('hidden');
        
        document.getElementById('loginForm').reset();
        document.getElementById('loginAlert').style.display = 'none';
    }
}

function showAlert(elementId, message, type) {
    const alertElement = document.getElementById(elementId);
    alertElement.textContent = message;
    alertElement.className = 'alert alert-' + type;
    alertElement.style.display = 'block';
    
    setTimeout(() => {
        alertElement.style.display = 'none';
    }, 5000);
}