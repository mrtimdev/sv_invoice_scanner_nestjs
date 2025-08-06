// queue-monitor.js
class QueueMonitor {
    constructor() {
        this.totalJobs = 0;
        this.completedJobs = 0;
        this.failedJobs = 0;
        this.updateInterval = 3000; // 3 seconds
        this.init();
    }

    init() {
        this.createUI();
        this.startMonitoring();
    }

    createUI() {
        $('body').append(`
        <div id="queueMonitor" class="fixed bottom-4 right-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg z-50 border border-gray-200 dark:border-gray-700">
            <h3 class="font-bold mb-2">Scan Queue Status</h3>
            <div class="grid grid-cols-2 gap-4">
            <div>
                <div class="text-sm text-gray-500 dark:text-gray-400">Total Queued</div>
                <div id="totalQueued" class="text-xl font-bold">0</div>
            </div>
            <div>
                <div class="text-sm text-gray-500 dark:text-gray-400">Completed</div>
                <div id="completedJobs" class="text-xl font-bold text-green-500">0</div>
            </div>
            <div>
                <div class="text-sm text-gray-500 dark:text-gray-400">Failed</div>
                <div id="failedJobs" class="text-xl font-bold text-red-500">0</div>
            </div>
            <div>
                <div class="text-sm text-gray-500 dark:text-gray-400">Success Rate</div>
                <div id="successRate" class="text-xl font-bold">0%</div>
            </div>
            </div>
            <div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <div class="flex justify-between text-xs">
                <span>Queue Status:</span>
                <span id="queueStatus" class="font-medium"></span>
            </div>
            </div>
        </div>
        `);
    }

    async startMonitoring() {
        this.interval = setInterval(() => this.updateStats(), this.updateInterval);
        await this.updateStats();
    }

    async updateStats() {
        try {
        const response = await fetch('/admin/scans/queue-status');
        const data = await response.json();
        
        $('#totalQueued').text(data.counts.waiting + data.counts.active);
        $('#completedJobs').text(data.counts.completed);
        $('#failedJobs').text(data.counts.failed);
        
        const totalProcessed = data.counts.completed + data.counts.failed;
        const successRate = totalProcessed > 0 
            ? Math.round((data.counts.completed / totalProcessed) * 100) 
            : 0;
        
        $('#successRate').text(`${successRate}%`);
        $('#queueStatus').text(data.status.toUpperCase())
            .removeClass('text-red-500 text-green-500')
            .addClass(data.status === 'active' ? 'text-green-500' : 'text-red-500');
        
        // Update global variables
        this.totalJobs = data.counts.waiting + data.counts.active;
        this.completedJobs = data.counts.completed;
        this.failedJobs = data.counts.failed;
        
        } catch (error) {
        console.error('Monitoring error:', error);
        }
    }

    stopMonitoring() {
        clearInterval(this.interval);
        $('#queueMonitor').remove();
    }
}

// Initialize when page loads
$(document).ready(() => {
    window.queueMonitor = new QueueMonitor();
});