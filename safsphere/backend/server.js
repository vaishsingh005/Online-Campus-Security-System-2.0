const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Data storage paths
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');
const VISITORS_FILE = path.join(DATA_DIR, 'visitors.json');
const ATTENDANCE_FILE = path.join(DATA_DIR, 'attendance.json');
const INCIDENTS_FILE = path.join(DATA_DIR, 'incidents.json');
const NOTIFICATIONS_FILE = path.join(DATA_DIR, 'notifications.json');

// Initialize data directory and files
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const initializeFile = (filePath, defaultData = {}) => {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
    }
};

initializeFile(USERS_FILE, {});
initializeFile(LOGS_FILE, []);
initializeFile(VISITORS_FILE, []);
initializeFile(ATTENDANCE_FILE, {});
initializeFile(INCIDENTS_FILE, []);
initializeFile(NOTIFICATIONS_FILE, []);

// Helper functions
const readData = (filePath) => {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return null;
    }
};

const writeData = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        return false;
    }
};

// ==================== AUTH ROUTES ====================

// User Registration
app.post('/api/auth/signup', (req, res) => {
    const { name, email, password, role, idNumber } = req.body;

    // Validation
    if (!name || !email || !password || !role || !idNumber) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    // Password validation
    if (password.length < 6) {
        return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const users = readData(USERS_FILE);

    // Check if user already exists
    if (users[email]) {
        return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Create new user
    const userId = 'SS' + Date.now();
    users[email] = {
        userId,
        name,
        email,
        password, // In production, hash this password!
        role,
        idNumber,
        createdAt: new Date().toISOString()
    };

    // Initialize attendance for user
    const attendance = readData(ATTENDANCE_FILE);
    attendance[userId] = [];
    writeData(ATTENDANCE_FILE, attendance);

    // Save user
    if (writeData(USERS_FILE, users)) {
        // Add notification
        addNotification(`New user registered: ${name}`, 'success');

        res.json({
            success: true,
            message: 'Account created successfully',
            user: { userId, name, email, role }
        });
    } else {
        res.status(500).json({ success: false, message: 'Error creating account' });
    }
});

// User Login
app.post('/api/auth/login', (req, res) => {
    const { emailOrId, password } = req.body;

    if (!emailOrId || !password) {
        return res.status(400).json({ success: false, message: 'Email/ID and password are required' });
    }

    const users = readData(USERS_FILE);
    let user = users[emailOrId];

    // If not found by email, search by userId
    if (!user) {
        for (let email in users) {
            if (users[email].userId === emailOrId.toUpperCase()) {
                user = users[email];
                break;
            }
        }
    }

    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.password !== password) {
        addNotification('Failed login attempt detected', 'warning');
        return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    addNotification(`${user.name} logged in successfully`, 'success');

    res.json({
        success: true,
        message: 'Login successful',
        user: {
            userId: user.userId,
            name: user.name,
            email: user.email,
            role: user.role,
            idNumber: user.idNumber
        }
    });
});

// ==================== LOGS ROUTES ====================

// Create Entry/Exit Log
app.post('/api/logs', (req, res) => {
    const { userId, type } = req.body;

    if (!userId || !type) {
        return res.status(400).json({ success: false, message: 'User ID and type are required' });
    }

    const users = readData(USERS_FILE);
    let user = null;

    // Find user
    for (let email in users) {
        if (users[email].userId === userId.toUpperCase()) {
            user = users[email];
            break;
        }
    }

    if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    const logs = readData(LOGS_FILE);
    const log = {
        userId: user.userId,
        userName: user.name,
        type: type,
        timestamp: new Date().toISOString(),
        date: new Date().toDateString()
    };

    logs.push(log);
    writeData(LOGS_FILE, logs);

    // Update attendance
    const attendance = readData(ATTENDANCE_FILE);
    if (!attendance[user.userId]) {
        attendance[user.userId] = [];
    }

    const today = new Date().toDateString();
    const existingEntry = attendance[user.userId].find(a => a.date === today);

    if (type === 'entry') {
        if (!existingEntry) {
            attendance[user.userId].push({
                date: today,
                entry: new Date().toLocaleTimeString(),
                exit: null
            });
        }
    } else if (type === 'exit') {
        if (existingEntry && !existingEntry.exit) {
            existingEntry.exit = new Date().toLocaleTimeString();
        }
    }

    writeData(ATTENDANCE_FILE, attendance);
    addNotification(`${type === 'entry' ? 'Entry' : 'Exit'} logged: ${user.name}`, 'success');

    res.json({
        success: true,
        message: `${type === 'entry' ? 'Entry' : 'Exit'} logged successfully`,
        log: log
    });
});

// Get All Logs
app.get('/api/logs', (req, res) => {
    const { date } = req.query;
    let logs = readData(LOGS_FILE);

    if (date) {
        const filterDate = new Date(date).toDateString();
        logs = logs.filter(log => new Date(log.timestamp).toDateString() === filterDate);
    }

    res.json({ success: true, logs });
});

// ==================== ATTENDANCE ROUTES ====================

// Get User Attendance
app.get('/api/attendance/:userId', (req, res) => {
    const { userId } = req.params;
    const attendance = readData(ATTENDANCE_FILE);

    const userAttendance = attendance[userId] || [];

    res.json({ success: true, attendance: userAttendance });
});

// ==================== VISITORS ROUTES ====================

// Register Visitor
app.post('/api/visitors', (req, res) => {
    const { name, purpose, phone, meeting, idType } = req.body;

    if (!name || !purpose || !phone || !meeting) {
        return res.status(400).json({ success: false, message: 'All required fields must be filled' });
    }

    const visitors = readData(VISITORS_FILE);
    const visitor = {
        id: 'V' + Date.now(),
        name,
        purpose,
        phone,
        meeting,
        idType: idType || '',
        timestamp: new Date().toISOString(),
        status: 'active',
        date: new Date().toDateString()
    };

    visitors.push(visitor);
    writeData(VISITORS_FILE, visitors);
    addNotification(`Visitor registered: ${name}`, 'success');

    res.json({ success: true, message: 'Visitor registered successfully', visitor });
});

// Get Visitors
app.get('/api/visitors', (req, res) => {
    const { date } = req.query;
    let visitors = readData(VISITORS_FILE);

    if (date) {
        const filterDate = new Date(date).toDateString();
        visitors = visitors.filter(v => v.date === filterDate);
    } else {
        // Default to today
        const today = new Date().toDateString();
        visitors = visitors.filter(v => v.date === today);
    }

    res.json({ success: true, visitors });
});

// ==================== INCIDENTS ROUTES ====================

// Submit Incident
app.post('/api/incidents', (req, res) => {
    const { type, location, description, reportedBy, userId } = req.body;

    if (!type || !location || !description || !reportedBy || !userId) {
        return res.status(400).json({ success: false, message: 'All required fields must be filled' });
    }

    const incidents = readData(INCIDENTS_FILE);
    const incident = {
        id: 'I' + Date.now(),
        type,
        location,
        description,
        reportedBy,
        userId,
        timestamp: new Date().toISOString(),
        status: 'open'
    };

    incidents.push(incident);
    writeData(INCIDENTS_FILE, incidents);
    addNotification(`Incident reported: ${type}`, 'warning');

    res.json({ success: true, message: 'Incident reported successfully', incident });
});

// Get Incidents
app.get('/api/incidents', (req, res) => {
    const incidents = readData(INCIDENTS_FILE);
    res.json({ success: true, incidents });
});

// ==================== NOTIFICATIONS ROUTES ====================

// Get Notifications
app.get('/api/notifications', (req, res) => {
    const notifications = readData(NOTIFICATIONS_FILE);
    res.json({ success: true, notifications });
});

// Helper function to add notification
const addNotification = (message, type) => {
    const notifications = readData(NOTIFICATIONS_FILE);
    notifications.push({
        message,
        type,
        timestamp: new Date().toISOString()
    });
    writeData(NOTIFICATIONS_FILE, notifications);
};

// ==================== REPORTS ROUTES ====================

// Get Reports
app.get('/api/reports', (req, res) => {
    const users = readData(USERS_FILE);
    const logs = readData(LOGS_FILE);
    const visitors = readData(VISITORS_FILE);
    const incidents = readData(INCIDENTS_FILE);

    const today = new Date().toDateString();
    const todayLogs = logs.filter(log => log.date === today);
    const todayEntries = todayLogs.filter(log => log.type === 'entry').length;
    const todayExits = todayLogs.filter(log => log.type === 'exit').length;
    const currentlyInside = todayEntries - todayExits;
    const todayVisitors = visitors.filter(v => v.date === today).length;

    res.json({
        success: true,
        reports: {
            totalUsers: Object.keys(users).length,
            totalLogs: logs.length,
            totalVisitors: visitors.length,
            totalIncidents: incidents.length,
            todayEntries,
            currentlyInside,
            todayVisitors
        }
    });
});

// Serve frontend
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`SafeSphere Backend Server running on port ${PORT}`);
    console.log(`Frontend: http://localhost:${PORT}`);
    console.log(`API: http://localhost:${PORT}/api`);
});