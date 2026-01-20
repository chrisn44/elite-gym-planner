// timer-backup.js
// Add this JavaScript file to add backup/restore functionality to the timer

(function() {
    'use strict';
    
    // Backup system for workout state
    const TIMER_BACKUP_KEY = 'eliteTimerBackup';
    const BACKUP_EXPIRY_HOURS = 24;
    
    // Create backup button in the progress tracker
    function createBackupButton() {
        const trackerStats = document.querySelector('.tracker-stats');
        if (!trackerStats) return;
        
        const backupItem = document.createElement('div');
        backupItem.className = 'stat-item';
        backupItem.innerHTML = `
            <div class="workout-controls">
                <button class="control-btn" id="backupBtn" onclick="backupWorkoutState()">💾 Backup</button>
                <button class="control-btn" id="restoreBtn" onclick="restoreWorkoutState()" style="display:none">↩️ Restore</button>
            </div>
            <div class="stat-label">Timer Backup</div>
        `;
        
        trackerStats.appendChild(backupItem);
        
        // Check for existing backup on load
        checkForBackup();
    }
    
    // Check if backup exists and show restore button
    function checkForBackup() {
        const backup = localStorage.getItem(TIMER_BACKUP_KEY);
        if (backup) {
            const backupData = JSON.parse(backup);
            const backupTime = new Date(backupData.timestamp);
            const currentTime = new Date();
            const hoursDiff = Math.abs(currentTime - backupTime) / 36e5;
            
            if (hoursDiff <= BACKUP_EXPIRY_HOURS) {
                const restoreBtn = document.getElementById('restoreBtn');
                if (restoreBtn) {
                    restoreBtn.style.display = 'block';
                    restoreBtn.title = `Backup from ${backupTime.toLocaleTimeString()}`;
                }
            } else {
                // Clear expired backup
                localStorage.removeItem(TIMER_BACKUP_KEY);
            }
        }
    }
    
    // Backup current workout state
    window.backupWorkoutState = function() {
        try {
            // Get current workout state from localStorage
            const savedState = localStorage.getItem('eliteWorkoutState');
            const savedDate = localStorage.getItem('eliteWorkoutDate');
            
            if (!savedState) {
                alert('No workout data to backup!');
                return;
            }
            
            const backupData = {
                state: savedState,
                date: savedDate,
                timestamp: new Date().toISOString(),
                exercises: document.getElementById('completed-exercises').textContent,
                time: document.getElementById('workout-time').textContent,
                calories: document.getElementById('calories-burned').textContent
            };
            
            localStorage.setItem(TIMER_BACKUP_KEY, JSON.stringify(backupData));
            
            // Show restore button
            const restoreBtn = document.getElementById('restoreBtn');
            if (restoreBtn) {
                restoreBtn.style.display = 'block';
                restoreBtn.title = `Backup created at ${new Date().toLocaleTimeString()}`;
            }
            
            // Show notification
            showBackupNotification('Workout state backed up successfully!');
            
        } catch (error) {
            console.error('Backup failed:', error);
            alert('Backup failed. Please try again.');
        }
    };
    
    // Restore workout state from backup
    window.restoreWorkoutState = function() {
        const backup = localStorage.getItem(TIMER_BACKUP_KEY);
        if (!backup) {
            alert('No backup found!');
            return;
        }
        
        if (!confirm('Restore workout from backup? This will overwrite current progress.')) {
            return;
        }
        
        try {
            const backupData = JSON.parse(backup);
            
            // Restore to localStorage
            localStorage.setItem('eliteWorkoutState', backupData.state);
            localStorage.setItem('eliteWorkoutDate', backupData.date);
            
            // Force page reload to apply restored state
            location.reload();
            
        } catch (error) {
            console.error('Restore failed:', error);
            alert('Restore failed. Backup may be corrupted.');
        }
    };
    
    // Show notification for backup/restore actions
    function showBackupNotification(message) {
        // Create notification element
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(45deg, #00b4d8, #0096c7);
            color: #0c0c0c;
            padding: 15px 20px;
            border-radius: 10px;
            font-weight: 700;
            box-shadow: 0 5px 15px rgba(0, 180, 216, 0.5);
            z-index: 2000;
            animation: slideIn 0.3s ease;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span>💾</span>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
        
        // Add CSS animations if not already present
        if (!document.querySelector('#backup-styles')) {
            const style = document.createElement('style');
            style.id = 'backup-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Auto-backup every 5 minutes if workout is active
    function setupAutoBackup() {
        setInterval(() => {
            const savedState = localStorage.getItem('eliteWorkoutState');
            if (savedState) {
                const state = JSON.parse(savedState);
                if (state.isActive && !state.isPaused) {
                    window.backupWorkoutState();
                }
            }
        }, 5 * 60 * 1000); // 5 minutes
    }
    
    // Add confirmation to reset button
    function enhanceResetButton() {
        const originalReset = window.resetWorkout;
        
        window.resetWorkout = function() {
            // Create backup before reset
            const savedState = localStorage.getItem('eliteWorkoutState');
            if (savedState) {
                const state = JSON.parse(savedState);
                if (state.completedExercises > 0) {
                    if (confirm('Create backup before resetting? You can restore it later if this was a mistake.')) {
                        window.backupWorkoutState();
                    }
                }
            }
            
            if (confirm('Are you sure you want to reset your workout? This cannot be undone.')) {
                originalReset();
                showBackupNotification('Workout reset. Backup created if requested.');
            }
        };
    }
    
    // Add backup history view
    function addBackupHistory() {
        const historyTab = document.getElementById('history-tab');
        if (!historyTab) return;
        
        const historyContainer = historyTab.querySelector('.history-container');
        if (!historyContainer) return;
        
        const backupSection = document.createElement('div');
        backupSection.className = 'cardio-section';
        backupSection.style.marginTop = '30px';
        backupSection.innerHTML = `
            <div class="cardio-title">⏱️ Timer Backups</div>
            <div class="cardio-details">
                <span class="cardio-type">Recent Backups</span>
                <span class="cardio-time">AUTO-SAVE</span>
            </div>
            <div class="cardio-instructions" id="backupList">
                Loading backups...
            </div>
            <div class="timer-controls" style="margin-top: 15px;">
                <button class="timer-btn secondary" onclick="viewBackupHistory()">📋 View All</button>
                <button class="timer-btn secondary" onclick="clearOldBackups()">🗑️ Clear Old</button>
            </div>
        `;
        
        historyContainer.appendChild(backupSection);
        updateBackupList();
    }
    
    // Update backup list display
    window.updateBackupList = function() {
        const backupList = document.getElementById('backupList');
        if (!backupList) return;
        
        const backup = localStorage.getItem(TIMER_BACKUP_KEY);
        if (!backup) {
            backupList.innerHTML = 'No backups available';
            return;
        }
        
        const backupData = JSON.parse(backup);
        const backupTime = new Date(backupData.timestamp);
        const timeStr = backupTime.toLocaleString();
        
        backupList.innerHTML = `
            <strong>Latest Backup:</strong> ${timeStr}<br>
            <strong>Progress:</strong> ${backupData.exercises} exercises, ${backupData.time}, ${backupData.calories} calories
        `;
    };
    
    // View detailed backup history
    window.viewBackupHistory = function() {
        const backup = localStorage.getItem(TIMER_BACKUP_KEY);
        if (!backup) {
            alert('No backup history found');
            return;
        }
        
        const backupData = JSON.parse(backup);
        const details = `
Backup Details:
---------------
Time: ${new Date(backupData.timestamp).toLocaleString()}
Exercises Completed: ${backupData.exercises}
Workout Time: ${backupData.time}
Calories Burned: ${backupData.calories}
Date: ${backupData.date}
        `;
        
        alert(details);
    };
    
    // Clear old backups
    window.clearOldBackups = function() {
        if (confirm('Clear all backup data? This cannot be undone.')) {
            localStorage.removeItem(TIMER_BACKUP_KEY);
            const restoreBtn = document.getElementById('restoreBtn');
            if (restoreBtn) {
                restoreBtn.style.display = 'none';
            }
            
            const backupList = document.getElementById('backupList');
            if (backupList) {
                backupList.innerHTML = 'No backups available';
            }
            
            showBackupNotification('Backup data cleared');
        }
    };
    
    // Initialize when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(() => {
            createBackupButton();
            enhanceResetButton();
            addBackupHistory();
            setupAutoBackup();
        }, 1000); // Delay to ensure original page is loaded
    });
    
    // Export functions for global access
    window.TimerBackup = {
        backup: window.backupWorkoutState,
        restore: window.restoreWorkoutState,
        viewHistory: window.viewBackupHistory,
        clearBackups: window.clearOldBackups
    };
    
})();