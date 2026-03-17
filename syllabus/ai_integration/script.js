document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.getElementById('sidebarToggle');
    const navLinks = document.querySelectorAll('.nav-item a');

    // Sidebar Toggle
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sidebar.classList.toggle('active');
            } else {
                sidebar.classList.toggle('collapsed');
            }
        });
    }

    // Active Link Highlight
    const currentPath = window.location.pathname.split('/').pop() || 'unit-distribution.html'; // Default to landing page if root
    
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath) {
            link.classList.add('active');
        }
    });

    // Close sidebar on mobile when clicking outside (optional polish)
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && 
            sidebar.classList.contains('active') && 
            !sidebar.contains(e.target) && 
            e.target !== toggleBtn &&
            !toggleBtn.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });
});
