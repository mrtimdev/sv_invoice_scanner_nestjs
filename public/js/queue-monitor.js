class QueueMonitor {
    constructor() {
        this.totalJobs = 0;
        this.completedJobs = 0;
        this.failedJobs = 0;
        this.updateInterval = 3000; // 3 seconds
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.init();
    }

    init() {
        this.createUI();
        this.setupDrag();
        this.startMonitoring();
    }

    createUI() {
        $('body').append(`
            <div id="queueMonitor" class="fixed bottom-0 right-4 text-gray-800 dark:text-white bg-white/30 dark:bg-gray-800/80 p-4 rounded-lg shadow-lg z-50 border border-gray-200/50 dark:border-gray-700/50 cursor-move custom-backdrop-blur-md w-64">
                <div class="flex justify-between items-center mb-2">
                    <h3 class="font-bold select-none">Scan Queue Status</h3>
                    <button id="refreshQueueBtn" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" title="Refresh">
                        <i class="fi fi-sr-refresh"></i>
                    </button>
                </div>
                
                <div class="grid grid-cols-2 gap-3 select-none">
                    <div class="p-2 rounded hover:bg-gray-100/30 dark:hover:bg-gray-700/30" title="Waiting + Active + Delayed jobs">
                        <div class="text-xs text-gray-500 dark:text-gray-400">Total Queued</div>
                        <div id="totalJobs" class="text-lg font-bold">0</div>
                    </div>
                    
                    <div class="p-2 rounded hover:bg-gray-100/30 dark:hover:bg-gray-700/30" title="Successfully processed jobs">
                        <div class="text-xs text-gray-500 dark:text-gray-400">Completed</div>
                        <div id="completedJobs" class="text-lg font-bold text-green-500">0</div>
                    </div>
                    
                    <div class="p-2 rounded hover:bg-gray-100/30 dark:hover:bg-gray-700/30" title="Jobs that failed processing">
                        <div class="text-xs text-gray-500 dark:text-gray-400">Failed</div>
                        <div id="failedJobs" class="text-lg font-bold text-red-500">0</div>
                    </div>
                    
                    <div class="p-2 rounded hover:bg-gray-100/30 dark:hover:bg-gray-700/30" title="Completed vs Total Processed">
                        <div class="text-xs text-gray-500 dark:text-gray-400">Status</div>
                        <span id="queueStatus" class="text-sm font-bold text-purple-500"></span>
                    </div>
                </div>
                
                <button id="cleanQueueBtn" class="w-full text-left px-3 py-2 flex items-center gap-2 rounded-md text-rose-600 dark:text-rose-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 mt-3 text-sm">
                    <i class="fi fi-sr-delete-document"></i>
                    <span>Clean Queue</span>
                </button>
            </div>
            `);

        $('#cleanQueueBtn').on('click', () => this.cleanQueue());
        $('#refreshQueueBtn').on('click', () => this.updateStats());
    }



    async cleanQueue() {
        if (!confirm('This will cancel all scans AND delete uploaded files in queued tasks. Continue?')) {
            return;
        }

        try {
            $('#cleanQueueBtn').prop('disabled', true)
                .html('<i class="fa fa-spinner fa-spin"></i> Cleaning...');

            const response = await $.ajax({
                url: '/admin/scans/queue/clean-all',
                method: 'POST',
                timeout: 60000
            });

            if (response.success) {
                // Update the UI
                $('.file-preview').remove();
                $('.progress-fill').css('width', '0%');
                $('#globalProgressBar').css('width', '0%');
                $('#globalProgressText').html(
                    `<span class="text-green-500">
                    ${response.message}<br>
                    <small>Deleted ${response.deletedFiles.length} files</small>
                    </span>`
                );
                
                // Refresh the queue stats
                await this.updateStats();
                
                // Show alert
                this.showAlert(`Cleaned ${response.deletedJobs} jobs and ${response.deletedFiles.length} files`, 'success');
            }
        } catch (error) {
            const errorMsg = error.responseJSON?.message || 'Cleanup failed';
            this.showAlert(errorMsg, 'error');
        } finally {
            $('#cleanQueueBtn').prop('disabled', false)
                .html('<i class="fi fi-sr-delete-document"></i><span>Clean Queue Upload</span>');
        }
    }

    showAlert(message, type = 'success') {
        const alertDiv = $(`<div class="alert alert-${type} fixed top-4 right-4 z-50">${message}</div>`);
        $('body').append(alertDiv);
        setTimeout(() => alertDiv.fadeOut(), 5000);
    }

    setupDrag() {
        const monitor = $('#queueMonitor')[0];
        const header = $(monitor).find('h3')[0];
        
        const handleMouseDown = (e) => {  // Proper event parameter
            if (e.button !== 0) return; // Only left mouse button
            
            this.isDragging = true;
            this.dragOffset = {
                x: e.clientX - monitor.getBoundingClientRect().left,
                y: e.clientY - monitor.getBoundingClientRect().top
            };
            
            monitor.style.transition = 'none';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        };

        const handleMouseMove = (e) => {  // Proper event parameter
            if (!this.isDragging) return;
            
            monitor.style.left = `${e.clientX - this.dragOffset.x}px`;
            monitor.style.top = `${e.clientY - this.dragOffset.y}px`;
            monitor.style.right = 'auto';
            monitor.style.bottom = 'auto';
        };

        const handleMouseUp = () => {
            if (this.isDragging) {
                this.isDragging = false;
                monitor.style.transition = '';
                document.body.style.userSelect = '';
                
                localStorage.setItem('queueMonitorPosition', JSON.stringify({
                    left: monitor.style.left,
                    top: monitor.style.top
                }));
            }
        };

        // Add event listeners
        header.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        // Cleanup function for when monitor is removed
        this.cleanupDrag = () => {
            header.removeEventListener('mousedown', handleMouseDown);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        // Load saved position
        const savedPosition = localStorage.getItem('queueMonitorPosition');
        if (savedPosition) {
            try {
                const { left, top } = JSON.parse(savedPosition);
                if (left && top) {
                    monitor.style.left = left;
                    monitor.style.top = top;
                    monitor.style.right = 'auto';
                    monitor.style.bottom = 'auto';
                }
            } catch (e) {
                console.warn('Failed to parse saved position', e);
            }
        }
    }

    async startMonitoring() {
        this.interval = setInterval(() => this.updateStats(), this.updateInterval);
        await this.updateStats();
    }

    async updateStats() {
        try {
            const startTime = performance.now();
            const response = await fetch('/admin/scans/queue/status');
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            const latency = performance.now() - startTime;
            
            // Update basic counts
            $('#completedJobs').text(data.counts.completed || 0);
            $('#failedJobs').text(data.counts.failed || 0);
            
            // Calculate derived metrics
            const totalQueued = (data.counts.waiting || 0) + 
                            (data.counts.active || 0) + 
                            (data.counts.delayed || 0);
                            
            const totalProcessed = (data.counts.completed || 0) + 
                                (data.counts.failed || 0);
            
            
            // Update UI
            $('#totalJobs').text(totalQueued);
            $('#averageProgress').text(`${data.averageProgress}%`);
            
            $('#queueStatus')
                .text(data.status.toUpperCase());
                
            // Add latency indicator
            console.debug(`Queue status updated in ${latency.toFixed(1)}ms`);
            
        } catch (error) {
            console.error('Queue monitoring error:', error);
            $('#queueStatus')
                .text('ERROR');
                
            // Implement exponential backoff for retries
            const retryDelay = Math.min(30000, 1000 * Math.pow(2, this.retryCount));
            this.retryCount++;
            setTimeout(() => this.updateStats(), retryDelay);
        }
    }

    stopMonitoring() {
        clearInterval(this.interval);
        if (this.cleanupDrag) {
            this.cleanupDrag();
        }
        $('#queueMonitor').remove();
    }
}


// Initialize when page loads
$(document).ready(() => {
    window.queueMonitor = new QueueMonitor();

   
});