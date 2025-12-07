// Funciones globales de utilidad

function mostrarAlerta(mensaje, tipo = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${tipo}`;
    
    const icon = tipo === 'success' ? '✓' : tipo === 'error' ? '✗' : '⚠';
    alertDiv.innerHTML = `
        <span class="alert-icon">${icon}</span>
        <span>${mensaje}</span>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

function formatearPorcentaje(valor) {
    return (valor * 100).toFixed(2) + '%';
}

// Smooth scroll para enlaces internos
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        const href = this.getAttribute('href');
        
        // Solo procesar si realmente es un enlace interno con #
        if (!href || !href.startsWith('#')) {
            return;
        }
        
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});